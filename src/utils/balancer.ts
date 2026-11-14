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

const emptyCounts = (): DeckCounts =>
  Object.fromEntries(ROLE_ORDER.map((id) => [id, 0])) as DeckCounts;

/** Tổng số lá thuộc bầy Sói (Sói thường + Sói đặc biệt). */
export const wolfTotal = (c: DeckCounts) => ROLE_ORDER.reduce((s, id) => s + (isWolfRole(id) ? c[id] : 0), 0);

// ───────────────────────── Cân bằng ─────────────────────────

/**
 * Điểm sức mạnh mỗi lá (kiểu Ultimate Werewolf): dương có lợi cho Làng, âm có lợi cho Sói.
 * Tổng bộ bài gần 0 là cân bằng.
 */
export const ROLE_WEIGHT: Record<RoleId, number> = {
  VILLAGER: 1,
  SEER: 7,
  GUARD: 3,
  WITCH: 4,
  HUNTER: 3,
  ELDER: 3,
  IDIOT: 2,
  FOX: 3,
  KAMIKAZE: 2,
  CUPID: -2,
  WILD_CHILD: -1,
  LYCAN: -1,
  WOLF: -6,
  WOLF_CUB: -8,
  WOLF_SEER: -8,
  CURSED_WOLF: -9,
  WHITE_WOLF: -4,
};

export const balanceScore = (c: DeckCounts) => ROLE_ORDER.reduce((s, id) => s + c[id] * ROLE_WEIGHT[id], 0);

/** Ước tính tỉ lệ thắng của phe Làng (0–1) từ điểm cân bằng. Chỉ là ước lượng để tham khảo. */
export const villageWinRate = (c: DeckCounts) => 1 / (1 + Math.exp(-balanceScore(c) / 6));

/** Một phe được ước tính thắng từ ngưỡng này trở lên thì coi là lệch nặng. */
export const LOPSIDED = 0.7;

export function balanceVerdict(c: DeckCounts) {
  const village = villageWinRate(c);
  const favored: "VILLAGE" | "WOLVES" = village >= 0.5 ? "VILLAGE" : "WOLVES";
  const top = Math.max(village, 1 - village);
  const level = top >= LOPSIDED ? "lopsided" : top >= 0.6 ? "leaning" : "even";
  return { village, wolves: 1 - village, favored, level } as const;
}

/** PRNG có seed: cùng seed + số người thì ra cùng bộ bài (xem trước khớp với lúc chia). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Từ bao nhiêu người thì bộ tự cân bằng mới dùng vai này (vai rắc rối để bàn đông). */
const AUTO_MIN: Partial<Record<SpecialRoleId, number>> = {
  GUARD: 5,
  WITCH: 6,
  HUNTER: 7,
  ELDER: 8,
  IDIOT: 8,
  CUPID: 8,
  LYCAN: 5,
  FOX: 9,
  KAMIKAZE: 9,
  WILD_CHILD: 9,
  WOLF_CUB: 8,
  CURSED_WOLF: 9,
  WOLF_SEER: 10,
  WHITE_WOLF: 12,
};
const VILLAGE_POOL: SpecialRoleId[] = ["GUARD", "WITCH", "HUNTER", "ELDER", "IDIOT", "FOX", "CUPID", "LYCAN", "KAMIKAZE", "WILD_CHILD"];
const WOLF_POOL: SpecialRoleId[] = ["WOLF_CUB", "CURSED_WOLF", "WOLF_SEER", "WHITE_WOLF"];

function randomDeck(n: number, rnd: () => number): DeckConfig {
  const cap = maxWolves(n);
  const base = Math.min(cap, Math.max(1, Math.round(n * 0.28)));
  const jitter = rnd() < 0.2 ? (rnd() < 0.5 ? -1 : 1) : 0;
  // Không quá 1/3 bàn: bàn nhỏ mà 2 Sói thì một đêm là hết ván.
  const wolves = Math.min(cap, Math.max(1, Math.floor(n / 3)), Math.max(1, base + jitter));
  const deck: DeckConfig = { WOLF: wolves };
  const take = <T>(arr: T[]) => arr.splice(Math.floor(rnd() * arr.length), 1)[0];

  // Đổi vài Sói thường thành Sói đặc biệt (luôn giữ ít nhất 1 Sói thường).
  const wolfPool = WOLF_POOL.filter((id) => n >= (AUTO_MIN[id] ?? 0) && (id !== "WHITE_WOLF" || wolves >= 3));
  const wolfSpecials = wolves >= 2 && wolfPool.length ? (rnd() < 0.8 ? 1 : 0) + (n >= 12 && wolves >= 3 && rnd() < 0.5 ? 1 : 0) : 0;
  for (let i = 0; i < wolfSpecials && wolfPool.length; i++) {
    deck[take(wolfPool)] = 1;
    deck.WOLF -= 1;
  }

  // Phe Làng: luôn có Tiên tri, giữ khoảng 30% Dân thường cho dễ giấu mình.
  const villageSlots = n - wolves;
  const keepVillagers = Math.max(1, Math.round(villageSlots * 0.3));
  const maxSpecials = villageSlots - keepVillagers;
  // Số vai phép dao động để bộ tìm kiếm có chỗ cân lại.
  const specials = Math.ceil(maxSpecials / 2) + Math.floor(rnd() * (maxSpecials - Math.ceil(maxSpecials / 2) + 1));
  const pool = VILLAGE_POOL.filter((id) => n >= (AUTO_MIN[id] ?? 0));
  deck.SEER = 1;
  for (let i = 1; i < specials && pool.length; i++) deck[take(pool)] = 1;
  return deck;
}

/**
 * Bộ bài tự cân bằng: thử nhiều bộ ngẫu nhiên dùng toàn bộ vai (vai rắc rối chỉ khi bàn đủ đông),
 * giữ những bộ có điểm gần cân bằng nhất rồi chọn ngẫu nhiên một bộ trong đó cho đa dạng.
 * `seed` cố định thì bộ bài cố định.
 */
export function autoDeck(n: number, seed = 1): DeckConfig {
  const rnd = mulberry32(seed * 7919 + n);
  const TARGET = 1; // hơi nghiêng về Làng một chút: bàn mới chơi dễ vui hơn
  const scored = Array.from({ length: 240 }, () => {
    const deck = randomDeck(n, rnd);
    return { deck, gap: Math.abs(balanceScore(resolveCounts(n, deck)) - TARGET) };
  });
  const best = Math.min(...scored.map((x) => x.gap));
  const good = scored.filter((x) => x.gap <= best + 1);
  // Tinh chỉnh thêm vài lá nếu bộ tốt nhất vẫn còn lệch (bàn rất đông ít lựa chọn hơn).
  return rebalance(n, good[Math.floor(rnd() * good.length)].deck, false);
}

const configOf = (c: DeckCounts): DeckConfig => {
  const out: DeckConfig = { WOLF: c.WOLF };
  for (const id of SPECIAL_ROLES) out[id] = c[id];
  return out;
};

/**
 * "Cân bằng giúp": chỉnh từng bước nhỏ (thêm/bớt 1 lá) cho tới khi gần cân bằng,
 * ưu tiên giữ những vai khách đã chọn.
 */
export function rebalance(n: number, start: DeckConfig, keepChosen = true): DeckConfig {
  const TARGET = 1;
  const chosen = new Set(keepChosen ? SPECIAL_ROLES.filter((id) => (start[id] ?? 0) > 0) : []);
  let cur = configOf(resolveCounts(n, start));
  for (let step = 0; step < 12; step++) {
    const gapOf = (d: DeckConfig) => Math.abs(balanceScore(resolveCounts(n, d)) - TARGET);
    const now = gapOf(cur);
    if (now <= 2) break;
    let best: DeckConfig | null = null;
    let bestCost = now;
    for (const id of ["WOLF", ...SPECIAL_ROLES] as (keyof DeckConfig)[]) {
      for (const delta of [1, -1]) {
        const value = (cur[id] ?? 0) + delta;
        if (value < (id === "WOLF" ? 1 : 0) || (id !== "WOLF" && value > 1)) continue;
        const next = { ...cur, [id]: value };
        const counts = resolveCounts(n, next);
        if (counts[id] !== value) continue; // bị kẹp lại (hết chỗ, quá số Sói) thì bỏ
        // Ưu tiên giữ vai khách đã chọn và số Sói ban đầu; thêm vai mới thì nhẹ nhàng hơn.
        const dropsChosen = delta < 0 && chosen.has(id as SpecialRoleId);
        const wolfDrift = id === "WOLF" && keepChosen ? 1.5 : 0;
        const cost = gapOf(next) + (dropsChosen ? 6 : 0) + wolfDrift;
        if (cost < bestCost - 0.01) {
          best = next;
          bestCost = cost;
        }
      }
    }
    if (!best) break;
    cur = best;
  }
  return cur;
}

/**
 * Bộ bài thực tế cho n người: dùng cấu hình tuỳ chỉnh nếu có, nhưng luôn kẹp lại
 * cho hợp lệ (số người thay đổi sau khi chỉnh thì không bị vỡ).
 * Tổng bầy Sói (kể cả Sói đặc biệt) luôn ít hơn nửa bàn.
 */
export function resolveDeck(n: number, custom: DeckConfig | null, seed = 1): DeckCounts {
  return resolveCounts(n, custom ?? autoDeck(n, seed));
}

function resolveCounts(n: number, base: DeckConfig): DeckCounts {
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

export function buildDeck(n: number, custom: DeckConfig | null = null, seed = 1): RoleId[] {
  if (n <= 0) return [];
  const counts = resolveDeck(n, custom, seed);
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
  seed = 1,
): P[] {
  const deck = shuffle(buildDeck(players.length, custom, seed));
  return players.map((p, i) => ({ ...p, roleId: deck[i] }));
}
