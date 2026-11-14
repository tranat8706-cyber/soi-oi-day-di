import type { RoleId } from "@/constants/roles";

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

/**
 * Bộ bài theo số người: Sói = floor(n/3) (tối thiểu 1), 1 Tiên tri, 1 Bảo vệ,
 * còn lại là Dân làng. Bàn quá nhỏ thì bỏ Bảo vệ rồi Tiên tri trước.
 */
export function buildDeck(n: number): RoleId[] {
  if (n <= 0) return [];
  const wolves = Math.max(1, Math.floor(n / 3));
  const deck: RoleId[] = Array.from({ length: wolves }, () => "WOLF");
  if (deck.length < n) deck.push("SEER");
  if (deck.length < n) deck.push("GUARD");
  while (deck.length < n) deck.push("VILLAGER");
  return deck;
}

/** Gán vai ngẫu nhiên, giữ nguyên thứ tự ngồi của người chơi. */
export function assignRoles<P extends { roleId: string | null }>(players: readonly P[]): P[] {
  const deck = shuffle(buildDeck(players.length));
  return players.map((p, i) => ({ ...p, roleId: deck[i] }));
}
