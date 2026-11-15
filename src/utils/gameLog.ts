import { getRole, isWolfRole, looksLikeWolf } from "@/constants/roles";
import type { DeathCause } from "./rules";

/** good = "chơi hay quá ta", bad = "chơi dở ẹc", info = chuyện bên lề. */
export type LogTone = "good" | "bad" | "info";

export interface LogEntry {
  round: number;
  phase: "NIGHT" | "DAY";
  text: string;
  tone: LogTone;
  /** Người tạo ra pha này (để trao giải hay nhất / dở nhất). */
  actorId?: string;
}

interface P {
  id: string;
  name: string;
  roleId: string | null;
  isAlive: boolean;
  formerRoleId?: string;
}

const roleName = (p: P | undefined) => getRole(p?.roleId)?.name ?? "?";
const pick = <T>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

/** Vai có phép phe Làng: Sói cắn trúng là ăn đậm. */
const KEY_ROLES = new Set(["SEER", "WITCH", "GUARD", "HUNTER", "FOX", "ELDER"]);

export interface NightFacts {
  round: number;
  /** Người chơi trước khi đêm diễn ra (vai gốc trong đêm). */
  before: P[];
  actions: Partial<Record<string, string>>;
  lost: boolean;
  bites: string[];
  /** Kết quả từng cú cắn. */
  biteOutcome: Record<string, "HARLOT_AWAY" | "GUARDED" | "HEALED" | "ELDER" | "CURSED" | "KILLED">;
  harlotHostId?: string;
  harlotDied: boolean;
  rammedId: string | null;
  foxFound: boolean | null;
  died: { id: string; cause: DeathCause }[];
  wildTurnedId: string | null;
  newLovers: string[];
}

/** Ghi lại một đêm thành các dòng nhật ký có giọng troll. */
export function logNight(f: NightFacts): LogEntry[] {
  const out: LogEntry[] = [];
  const by = (id?: string) => f.before.find((p) => p.id === id);
  const holder = (roleId: string) => f.before.find((p) => p.isAlive && p.roleId === roleId);
  const add = (text: string, tone: LogTone, actorId?: string) => out.push({ round: f.round, phase: "NIGHT", text, tone, actorId });
  const a = f.actions;
  const seed = f.round * 31 + f.before.length;

  if (f.newLovers.length === 2) {
    const [x, y] = f.newLovers.map(by);
    const cross = !!x && !!y && isWolfRole(x.roleId) !== isWolfRole(y.roleId);
    add(
      cross
        ? `Thần tình yêu ghép ${x?.name} ♥ ${y?.name}: Sói yêu Dân. Drama bắt đầu.`
        : `Thần tình yêu ghép ${x?.name} ♥ ${y?.name}. Sống chết có nhau.`,
      cross ? "good" : "info",
      holder("CUPID")?.id,
    );
  }

  if (!f.bites.length && !f.lost) add(pick(["Bầy Sói ăn kiêng, đêm nay không cắn ai.", "Sói nhịn đói một đêm. Có ai tin không?"], seed), "info");

  const guard = holder("GUARD");
  const witch = holder("WITCH");
  for (const id of f.bites) {
    const v = by(id);
    if (!v) continue;
    switch (f.biteOutcome[id]) {
      case "HARLOT_AWAY":
        add(`Sói mò vào nhà ${v.name} nhưng Con điếm đi chơi đêm. Về tay trắng.`, "good", v.id);
        break;
      case "GUARDED":
        add(`Bảo vệ ${guard?.name ?? ""} che đúng ${v.name} ngay cú cắn.`, "good", guard?.id);
        break;
      case "HEALED":
        add(`Phù thủy ${witch?.name ?? ""} ném bình cứu kịp cho ${v.name}.`, "good", witch?.id);
        break;
      case "ELDER":
        add(`Sói cắn trúng Già làng ${v.name}. Da dày quá, mẻ răng.`, "info", v.id);
        break;
      case "CURSED":
        add(`${v.name} (${roleName(v)}) bị nguyền, sáng ra đã mọc lông Sói.`, "good", holder("CURSED_WOLF")?.id);
        break;
      case "KILLED":
        if (KEY_ROLES.has(v.roleId ?? ""))
          add(`Bầy Sói cắn trúng ${roleName(v)} ${v.name}. Đúng tủ, làng toang một mảng.`, "good");
        else if (isWolfRole(v.roleId)) add(`Sói cắn nhầm đồng bọn ${v.name}?`, "bad");
        else add(`Sói cắn ${v.name} (${roleName(v)}). Một đêm như mọi đêm.`, "info");
        break;
    }
  }

  if (guard && a.GUARD && !f.lost && !f.bites.includes(a.GUARD)) {
    const t = by(a.GUARD);
    if (t && isWolfRole(t.roleId)) add(`Bảo vệ ${guard.name} thức trắng canh cửa cho… Sói ${t.name}.`, "bad", guard.id);
    else if (t) add(`Bảo vệ ${guard.name} canh nhà ${t.name} cả đêm, Sói chẳng thèm ghé.`, "info", guard.id);
  }

  if (witch && a.WITCH_KILL && !f.lost) {
    const t = by(a.WITCH_KILL);
    if (t && isWolfRole(t.roleId)) add(`Phù thủy ${witch.name} hạ độc trúng Sói ${t.name}.`, "good", witch.id);
    else if (t) add(`Phù thủy ${witch.name} đầu độc nhầm ${t.name} (${roleName(t)}).`, "bad", witch.id);
  }

  const seer = holder("SEER");
  if (seer && a.SEER && !f.lost) {
    const t = by(a.SEER);
    if (t?.roleId === "LYCAN") add(`Tiên tri ${seer.name} soi ${t.name} ra Sói… nhưng là Bán sói. Oan ghê.`, "info", seer.id);
    else if (t && looksLikeWolf(t.roleId)) add(`Tiên tri ${seer.name} soi trúng Sói ${t.name}. Mắt thần!`, "good", seer.id);
    else if (t) add(`Tiên tri ${seer.name} soi ${t.name}: dân lành. Phí một đêm.`, "info", seer.id);
  }

  const wolfSeer = holder("WOLF_SEER");
  if (wolfSeer && a.WOLF_SEER) {
    const t = by(a.WOLF_SEER);
    if (t && KEY_ROLES.has(t.roleId ?? ""))
      add(`Sói tiên tri ${wolfSeer.name} soi ra ${t.name} là ${roleName(t)}. Làng coi chừng!`, "good", wolfSeer.id);
    else if (t) add(`Sói tiên tri ${wolfSeer.name} soi ${t.name}: ${roleName(t)}. Chẳng có gì hay.`, "info", wolfSeer.id);
  }

  const fox = holder("FOX");
  if (fox && f.foxFound !== null)
    add(
      f.foxFound ? `Cáo ${fox.name} đánh hơi thấy mùi Sói. Mũi thính!` : `Cáo ${fox.name} đánh hơi trượt, mất phép luôn.`,
      f.foxFound ? "good" : "bad",
      fox.id,
    );

  const harlot = holder("HARLOT");
  if (harlot && f.harlotDied) {
    const host = by(f.harlotHostId);
    if (host && isWolfRole(host.roleId)) add(`Con điếm ${harlot.name} ngủ nhầm nhà Sói ${host.name}.`, "bad", harlot.id);
    else add(`Con điếm ${harlot.name} ghé nhà ${host?.name ?? "?"} đúng đêm Sói tới. Xui tận mạng.`, "bad", harlot.id);
  }

  const kamikaze = holder("KAMIKAZE");
  if (kamikaze && f.rammedId) {
    const t = by(f.rammedId);
    if (t && isWolfRole(t.roleId)) add(`Kẻ cảm tử ${kamikaze.name} ôm bom lao vào Sói ${t.name}. Hy sinh anh dũng!`, "good", kamikaze.id);
    else add(`Kẻ cảm tử ${kamikaze.name} lao vào ${t?.name} (${roleName(t)}). Nổ nhầm phe.`, "bad", kamikaze.id);
  }

  const white = holder("WHITE_WOLF");
  for (const d of f.died.filter((x) => x.cause === "WHITE_WOLF"))
    add(`Sói trắng ${white?.name ?? ""} lặng lẽ xử luôn đồng bọn ${by(d.id)?.name}.`, "good", white?.id);
  for (const d of f.died.filter((x) => x.cause === "HEARTBREAK"))
    add(`${by(d.id)?.name} chết theo người yêu. Tình yêu đẹp nhưng nguy hiểm.`, "info");
  if (f.wildTurnedId) add(`Thần tượng ra đi, Đứa trẻ hoang ${by(f.wildTurnedId)?.name} hóa Sói.`, "info");
  if (!f.died.length) add("Sáng ra cả làng đông đủ. Đêm bình yên hiếm hoi.", "info");
  return out;
}

/** Một dòng nhật ký ban ngày. */
export function dayEntry(round: number, text: string, tone: LogTone, actorId?: string): LogEntry {
  return { round, phase: "DAY", text, tone, actorId };
}

/** Ghi pha treo cổ. */
export function logLynch(round: number, target: P, viaRoulette: boolean, idiotSaved: boolean, died: { id: string; cause: DeathCause }[], all: P[]): LogEntry[] {
  const lead = viaRoulette ? `Vòng quay tử thần gọi tên ${target.name}` : `Cả làng giơ tay treo ${target.name}`;
  const out: LogEntry[] = [];
  if (idiotSaved) out.push(dayEntry(round, `${lead}… là Thằng ngố. Cười trừ một cái, thoát chết.`, "info", target.id));
  else if (isWolfRole(target.roleId)) out.push(dayEntry(round, `${lead}: đúng Sói!`, "good"));
  else if (target.roleId === "ELDER") out.push(dayEntry(round, `${lead}: là Già làng. Cả làng mất phép.`, "bad"));
  else out.push(dayEntry(round, `${lead}: là ${roleName(target)}. Treo nhầm người.`, "bad"));
  for (const d of died.filter((x) => x.cause === "HEARTBREAK"))
    out.push(dayEntry(round, `${all.find((p) => p.id === d.id)?.name} chết theo người yêu.`, "info"));
  return out;
}

export function logSpare(round: number, target: P): LogEntry {
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Làng mủi lòng tha cho ${target.name}… là Sói.`, "bad")
    : dayEntry(round, `Làng tha ${target.name}. Đúng là dân lành thật.`, "good");
}

export function logShot(round: number, hunter: P, target: P | undefined): LogEntry {
  if (!target) return dayEntry(round, `Thợ săn ${hunter.name} buông súng, không bắn ai. Hiền quá.`, "info", hunter.id);
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Thợ săn ${hunter.name} bắn chết Sói ${target.name}.`, "good", hunter.id)
    : dayEntry(round, `Thợ săn ${hunter.name} bắn nhầm ${target.name} (${roleName(target)}).`, "bad", hunter.id);
}

/** Giải hay nhất / dở nhất theo số pha good/bad của từng người. */
export function awards(log: LogEntry[]) {
  const score = (tone: LogTone) => {
    const m = new Map<string, number>();
    for (const e of log) if (e.actorId && e.tone === tone) m.set(e.actorId, (m.get(e.actorId) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1])[0];
  };
  return { best: score("good"), worst: score("bad") };
}
