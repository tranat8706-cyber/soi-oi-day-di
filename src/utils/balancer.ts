import { isWolfRole, ROLE_ORDER, SPECIAL_ROLES, type RoleId, type SpecialRoleId } from "@/constants/roles";

/** Số nguyên ngẫu nhiên trong [0, max), dùng crypto nếu có để khó đoán hơn Math.random. */
function randomInt(max: number) {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    // Loại bỏ modulo bias.
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Fisher–Yates, trả về mảng mới. */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Số Sói và có/không từng vai đặc biệt; Dân làng = phần còn lại. */
export type DeckConfig = { WOLF: number } & Partial<Record<SpecialRoleId, number>>;

export type DeckCounts = Record<RoleId, number>;

/** Sói phải ít hơn nửa bàn, nếu không ván kết thúc ngay khi chia bài. */
export const maxWolves = (n: number) => Math.max(1, Math.floor((n - 1) / 2));

/** Bộ tự cân bằng chỉ dùng vai FREE: từ bao nhiêu người thì thêm vai này. */
const AUTO_MIN_PLAYERS: Partial<Record<SpecialRoleId, number>> = { SEER: 0, GUARD: 0, WITCH: 7, HUNTER: 9 };

const emptyCounts = (): DeckCounts =>
  Object.fromEntries(ROLE_ORDER.map((id) => [id, 0])) as DeckCounts;

/**
 * Bộ bài cân bằng: Sói = n/3, luôn có Tiên tri + Bảo vệ, từ 7 người thêm Phù thủy,
 * từ 9 người thêm Thợ săn, còn lại là Dân làng.
 */
export function autoDeck(n: number): DeckConfig {
  const WOLF = Math.max(1, Math.floor(n / 3));
  const deck: DeckConfig = { WOLF };
  for (const [id, min] of Object.entries(AUTO_MIN_PLAYERS)) deck[id as SpecialRoleId] = n >= min ? 1 : 0;
  return deck;
}

/** Tổng số lá thuộc bầy Sói (Sói thường + Sói đặc biệt). */
export const wolfTotal = (c: DeckCounts) => ROLE_ORDER.reduce((s, id) => s + (isWolfRole(id) ? c[id] : 0), 0);

/**
 * Bộ bài thực tế cho n người: dùng cấu hình tuỳ chỉnh nếu có, nhưng luôn kẹp lại
 * cho hợp lệ (số người thay đổi sau khi chỉnh thì không bị vỡ).
 * Tổng bầy Sói (kể cả Sói đặc biệt) luôn ít hơn nửa bàn.
 */
export function resolveDeck(n: number, custom: DeckConfig | null): DeckCounts {
  const base = custom ?? autoDeck(n);
  const out = emptyCounts();
  const wolfCap = maxWolves(n);
  out.WOLF = Math.min(Math.max(1, base.WOLF), wolfCap);
  let used = out.WOLF;
  let wolves = out.WOLF;
  // Không đủ chỗ thì bỏ vai đứng sau trong danh sách trước.
  for (const id of SPECIAL_ROLES) {
    const want = Math.min(1, Math.max(0, base[id] ?? 0));
    const wolfish = isWolfRole(id);
    if (!want || used >= n || (wolfish && wolves >= wolfCap)) continue;
    out[id] = 1;
    used += 1;
    if (wolfish) wolves += 1;
  }
  out.VILLAGER = Math.max(0, n - used);
  return out;
}

export function buildDeck(n: number, custom: DeckConfig | null = null): RoleId[] {
  if (n <= 0) return [];
  const counts = resolveDeck(n, custom);
  return (Object.keys(counts) as RoleId[]).flatMap((id) => Array.from({ length: counts[id] }, () => id));
}

/**
 * Đếm vai đã chia trong ván (thông tin công khai: cả bàn biết bộ bài gồm gì).
 * Người bị hóa Sói giữa ván vẫn tính theo lá bài gốc.
 */
export function countRoles(players: readonly { roleId: string | null; formerRoleId?: string }[]): DeckCounts {
  const out = emptyCounts();
  for (const p of players) {
    const id = p.formerRoleId ?? p.roleId;
    if (id && id in out) out[id as RoleId] += 1;
  }
  return out;
}

/** Gán vai ngẫu nhiên, giữ nguyên thứ tự ngồi của người chơi. */
export function assignRoles<P extends { roleId: string | null }>(
  players: readonly P[],
  custom: DeckConfig | null = null,
): P[] {
  const deck = shuffle(buildDeck(players.length, custom));
  return players.map((p, i) => ({ ...p, roleId: deck[i] }));
}
