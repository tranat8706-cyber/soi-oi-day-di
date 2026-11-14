import { isWolfRole } from "@/constants/roles";

export interface RulePlayer {
  id: string;
  name: string;
  roleId: string | null;
  isAlive: boolean;
  /** Lá bài gốc nếu đã bị hóa Sói giữa ván. */
  formerRoleId?: string;
}

export type Winner = "WOLF" | "VILLAGER" | "LOVERS" | "WHITE_WOLF";

export type DeathCause = "BITE" | "POISON" | "WHITE_WOLF" | "LYNCH" | "SHOT" | "HEARTBREAK" | "KAMIKAZE";

export interface DeathContext {
  loverIds: string[];
  wildModelId: string | null;
}

export interface DeathResult<P extends RulePlayer> {
  players: P[];
  died: { id: string; cause: DeathCause }[];
  /** Thợ săn vừa chết và được bắn (không chết vì bình độc). */
  hunterId: string | null;
  /** Sói con vừa chết: đêm sau bầy được cắn 2 người. */
  cubDied: boolean;
  /** Đứa trẻ hoang vừa hóa Sói. */
  wildChildTurnedId: string | null;
}

/**
 * Áp các cái chết và mọi hệ quả dây chuyền:
 * - Cặp đôi: một người chết, người kia chết theo.
 * - Đứa trẻ hoang: thần tượng chết thì hóa Sói.
 * - Thợ săn / Sói con: đánh dấu để xử lý tiếp.
 */
export function applyDeaths<P extends RulePlayer>(
  players: readonly P[],
  kills: readonly [string, DeathCause][],
  ctx: DeathContext,
): DeathResult<P> {
  const byId = new Map(players.map((p) => [p.id, { ...p }]));
  const died: { id: string; cause: DeathCause }[] = [];
  const queue = [...kills];

  while (queue.length) {
    const [id, cause] = queue.shift()!;
    const p = byId.get(id);
    if (!p || !p.isAlive) continue;
    p.isAlive = false;
    died.push({ id, cause });
    if (ctx.loverIds.includes(id)) {
      const other = ctx.loverIds.find((x) => x !== id);
      if (other) queue.push([other, "HEARTBREAK"]);
    }
  }

  let wildChildTurnedId: string | null = null;
  if (ctx.wildModelId && died.some((d) => d.id === ctx.wildModelId)) {
    const child = [...byId.values()].find((p) => p.roleId === "WILD_CHILD" && p.isAlive);
    if (child) {
      child.formerRoleId = "WILD_CHILD";
      child.roleId = "WOLF";
      wildChildTurnedId = child.id;
    }
  }

  const roleOf = (id: string) => byId.get(id)?.roleId;
  return {
    players: players.map((p) => byId.get(p.id)!),
    died,
    hunterId: died.find((d) => roleOf(d.id) === "HUNTER" && d.cause !== "POISON")?.id ?? null,
    cubDied: died.some((d) => roleOf(d.id) === "WOLF_CUB"),
    wildChildTurnedId,
  };
}

/** Cặp đôi khác phe (1 bên bầy Sói, 1 bên Làng) thì thành phe thứ ba. */
export function loversCrossTeam(players: readonly RulePlayer[], loverIds: readonly string[]) {
  if (loverIds.length !== 2) return false;
  const [a, b] = loverIds.map((id) => players.find((p) => p.id === id));
  return !!a && !!b && isWolfRole(a.roleId) !== isWolfRole(b.roleId);
}

/**
 * Ai thắng (null nếu ván còn tiếp):
 * - Cặp đôi khác phe là 2 người cuối cùng → Cặp đôi.
 * - Sói trắng là người sống cuối cùng → Sói trắng.
 * - Hết bầy Sói → Làng.
 * - Sói (khi Sói trắng đã chết) đông bằng phần còn lại → Sói.
 */
export function computeWinner(players: readonly RulePlayer[], loverIds: readonly string[] = []): Winner | null {
  const alive = players.filter((p) => p.isAlive);
  if (alive.length === 0) return "VILLAGER";
  if (loversCrossTeam(players, loverIds) && alive.length === 2 && alive.every((p) => loverIds.includes(p.id)))
    return "LOVERS";

  const white = alive.some((p) => p.roleId === "WHITE_WOLF");
  const pack = alive.filter((p) => isWolfRole(p.roleId) && p.roleId !== "WHITE_WOLF").length;
  // Sói trắng chỉ thắng khi là người sống cuối cùng.
  if (white && alive.length === 1) return "WHITE_WOLF";
  if (!white && pack === 0) return "VILLAGER";
  if (!white && pack >= alive.length - pack) return "WOLF";
  return null;
}

/** Phe của một người khi chấm thắng/thua cho danh hiệu. */
export function sideOf(p: RulePlayer, loverIds: readonly string[], winner: Winner) {
  if (winner === "LOVERS") return loverIds.includes(p.id) ? "LOVERS" : "OTHER";
  if (p.roleId === "WHITE_WOLF") return "WHITE_WOLF";
  return isWolfRole(p.roleId) ? "WOLF" : "VILLAGER";
}

/** Người đó và 2 người sống ngồi sát hai bên (theo vòng bàn). */
export function foxGroup<P extends RulePlayer>(players: readonly P[], targetId: string): P[] {
  const alive = players.filter((p) => p.isAlive);
  const i = alive.findIndex((p) => p.id === targetId);
  if (i < 0) return [];
  if (alive.length <= 3) return alive.slice();
  const at = (k: number) => alive[(k + alive.length) % alive.length];
  return [at(i - 1), at(i), at(i + 1)];
}
