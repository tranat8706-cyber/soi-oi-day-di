import { getRole, isWolfRole, looksLikeWolf } from "@/constants/roles";
import type { DeathCause } from "./rules";

/** good / bad: pha hay hoặc dở của người làm ra nó (dùng để trao giải). info: chuyện bên lề. status: cục diện sau mỗi chặng. */
export type LogTone = "good" | "bad" | "info" | "status";

export interface LogEntry {
  round: number;
  phase: "NIGHT" | "DAY";
  text: string;
  tone: LogTone;
  /** Pha này ảnh hưởng thế nào tới các đêm sau và cục diện ván. */
  impact?: string;
  /** Người tạo ra pha này (để trao giải). */
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

/** Mất vai này thì các đêm sau thay đổi ra sao. */
const LOSS_IMPACT: Record<string, string> = {
  SEER: "Từ đêm sau làng không còn ai soi Sói, chỉ còn cách đoán bằng lý lẽ. Bầy Sói dễ thở hẳn.",
  WITCH: "Bình nào chưa dùng thì mất luôn. Từ giờ không ai cứu được nạn nhân của Sói.",
  GUARD: "Không còn ai che: Sói cắn ai là người đó chết, mỗi đêm làng mất chắc một người.",
  HUNTER: "Thợ săn chỉ còn một phát súng cuối, bắn trúng hay trượt có thể lật cả ván.",
  FOX: "Mất cái mũi đánh hơi, làng mất một nguồn tin về nhóm có Sói.",
  ELDER: "Làng mất người có kinh nghiệm và mất luôn lá chắn chịu cắn.",
  HARLOT: "Con điếm ra đi, Sói bớt một mục tiêu khó bắt.",
};

export interface NightFacts {
  round: number;
  /** Người chơi trước khi đêm diễn ra (vai gốc trong đêm). */
  before: P[];
  /** Người chơi sau đêm (để tính cục diện). */
  after: P[];
  actions: Partial<Record<string, string>>;
  lost: boolean;
  bites: string[];
  biteOutcome: Record<string, "HARLOT_AWAY" | "GUARDED" | "HEALED" | "ELDER" | "CURSED" | "KILLED">;
  harlotHostId?: string;
  harlotDied: boolean;
  rammedId: string | null;
  foxFound: boolean | null;
  died: { id: string; cause: DeathCause }[];
  wildTurnedId: string | null;
  newLovers: string[];
}

/** Ghi lại một đêm: chuyện gì xảy ra, hệ quả cho các đêm sau, rồi cục diện. */
export function logNight(f: NightFacts): LogEntry[] {
  const out: LogEntry[] = [];
  const by = (id?: string) => f.before.find((p) => p.id === id);
  const holder = (roleId: string) => f.before.find((p) => p.isAlive && p.roleId === roleId);
  const add = (text: string, tone: LogTone, impact?: string, actorId?: string) =>
    out.push({ round: f.round, phase: "NIGHT", text, tone, impact, actorId });
  const a = f.actions;
  const seed = f.round * 31 + f.before.length;

  if (f.newLovers.length === 2) {
    const [x, y] = f.newLovers.map(by);
    const cross = !!x && !!y && isWolfRole(x.roleId) !== isWolfRole(y.roleId);
    add(
      cross ? `Thần tình yêu ghép ${x?.name} ♥ ${y?.name}: Sói yêu Dân. Drama bắt đầu.` : `Thần tình yêu ghép ${x?.name} ♥ ${y?.name}.`,
      cross ? "good" : "info",
      cross
        ? "Cặp đôi khác phe thành phe thứ ba: họ chỉ thắng khi cả làng lẫn bầy Sói chết hết. Một người chết, người kia chết theo."
        : "Từ giờ hai người sống chết có nhau: Sói chỉ cần cắn một là ăn hai mạng.",
      holder("CUPID")?.id,
    );
  }

  if (!f.bites.length && !f.lost)
    add(
      pick(["Bầy Sói ăn kiêng, đêm nay không cắn ai.", "Sói nhịn đói một đêm. Có ai tin không?"], seed),
      "info",
      "Làng không mất ai, thêm một ngày để tìm Sói. Có khi bầy đang giấu bài để đánh lạc hướng.",
    );

  const guard = holder("GUARD");
  const witch = holder("WITCH");
  for (const id of f.bites) {
    const v = by(id);
    if (!v) continue;
    switch (f.biteOutcome[id]) {
      case "HARLOT_AWAY":
        add(`Sói mò vào nhà ${v.name} nhưng Con điếm đi chơi đêm. Về tay trắng.`, "good", "Sói phí một đêm, làng giữ nguyên quân số.", v.id);
        break;
      case "GUARDED":
        add(
          `Bảo vệ ${guard?.name ?? ""} che đúng ${v.name} ngay cú cắn.`,
          "good",
          `Cứu được ${v.name}, Sói phí một đêm. Đêm sau Bảo vệ không được che ${v.name} nữa, Sói có thể quay lại.`,
          guard?.id,
        );
        break;
      case "HEALED":
        add(
          `Phù thủy ${witch?.name ?? ""} ném bình cứu kịp cho ${v.name}.`,
          "good",
          "Bình cứu đã dùng: từ đêm sau ai bị cắn là chết thật, trừ khi Bảo vệ che trúng.",
          witch?.id,
        );
        break;
      case "ELDER":
        add(`Sói cắn trúng Già làng ${v.name}. Da dày quá, mẻ răng.`, "info", "Già làng hết mạng dự phòng: lần cắn sau là chết.", v.id);
        break;
      case "CURSED":
        add(
          `${v.name} (${roleName(v)}) bị nguyền, sáng ra đã mọc lông Sói.`,
          "good",
          `Bầy Sói thêm một người mà làng không hay biết, và ${v.name} mất luôn phép cũ. Tiên tri soi ${v.name} sẽ ra Sói.`,
          holder("CURSED_WOLF")?.id,
        );
        break;
      case "KILLED":
        if (KEY_ROLES.has(v.roleId ?? ""))
          add(`Bầy Sói cắn trúng ${roleName(v)} ${v.name}. Đúng tủ, làng toang một mảng.`, "good", LOSS_IMPACT[v.roleId ?? ""]);
        else if (isWolfRole(v.roleId)) add(`Sói cắn nhầm đồng bọn ${v.name}?`, "bad", "Bầy tự mất một răng.");
        else
          add(
            `Sói cắn ${v.name} (${roleName(v)}).`,
            "info",
            v.roleId === "HARLOT" ? LOSS_IMPACT.HARLOT : "Làng mất một lá phiếu. Cắn trúng dân thường thì phe Làng chưa mất phép nào.",
          );
        break;
    }
  }

  if (guard && a.GUARD && !f.lost && !f.bites.includes(a.GUARD)) {
    const t = by(a.GUARD);
    if (t && isWolfRole(t.roleId))
      add(`Bảo vệ ${guard.name} thức trắng canh cửa cho… Sói ${t.name}.`, "bad", "Phí một đêm che, lại che đúng kẻ thù.", guard.id);
    else if (t) add(`Bảo vệ ${guard.name} canh nhà ${t.name} cả đêm, Sói chẳng thèm ghé.`, "info", `Đêm sau không được che ${t.name} nữa.`, guard.id);
  }

  if (witch && a.WITCH_KILL && !f.lost) {
    const t = by(a.WITCH_KILL);
    if (t && isWolfRole(t.roleId))
      add(`Phù thủy ${witch.name} hạ độc trúng Sói ${t.name}.`, "good", "Bầy Sói mất một răng. Bình độc đã dùng, từ giờ Phù thủy chỉ còn bình cứu (nếu chưa dùng).", witch.id);
    else if (t)
      add(
        `Phù thủy ${witch.name} đầu độc nhầm ${t.name} (${roleName(t)}).`,
        "bad",
        `Làng mất người vì chính phe mình, bình độc cũng hết. ${LOSS_IMPACT[t.roleId ?? ""] ?? ""}`.trim(),
        witch.id,
      );
  }

  const seer = holder("SEER");
  if (seer && a.SEER && !f.lost) {
    const t = by(a.SEER);
    if (t?.roleId === "LYCAN")
      add(`Tiên tri ${seer.name} soi ${t.name} ra Sói… nhưng là Bán sói.`, "info", `Nếu Tiên tri tố ${t.name}, làng sẽ treo oan một người phe mình.`, seer.id);
    else if (t && looksLikeWolf(t.roleId))
      add(`Tiên tri ${seer.name} soi trúng Sói ${t.name}. Mắt thần!`, "good", `Ban ngày Tiên tri cần dẫn dắt khéo để làng treo ${t.name} mà không lộ mặt mình.`, seer.id);
    else if (t) add(`Tiên tri ${seer.name} soi ${t.name}: dân lành.`, "info", `Gạch được ${t.name} khỏi danh sách nghi ngờ.`, seer.id);
  }

  const wolfSeer = holder("WOLF_SEER");
  if (wolfSeer && a.WOLF_SEER) {
    const t = by(a.WOLF_SEER);
    if (t && KEY_ROLES.has(t.roleId ?? ""))
      add(`Sói tiên tri ${wolfSeer.name} soi ra ${t.name} là ${roleName(t)}.`, "good", `Bầy đã biết mặt ${roleName(t)}: các đêm sau ${t.name} rất dễ bị cắn.`, wolfSeer.id);
    else if (t) add(`Sói tiên tri ${wolfSeer.name} soi ${t.name}: ${roleName(t)}.`, "info", "Bầy biết thêm một người không đáng lo.", wolfSeer.id);
  }

  const fox = holder("FOX");
  if (fox && f.foxFound !== null)
    add(
      f.foxFound ? `Cáo ${fox.name} đánh hơi thấy mùi Sói. Mũi thính!` : `Cáo ${fox.name} đánh hơi trượt, mất phép luôn.`,
      f.foxFound ? "good" : "bad",
      f.foxFound
        ? "Nghi ngờ thu hẹp còn 3 người. Cáo vẫn giữ phép cho đêm sau."
        : "Từ đêm sau Cáo không đánh hơi được nữa, nhưng làng biết chắc 3 người đó sạch.",
      fox.id,
    );

  const harlot = holder("HARLOT");
  if (harlot && f.harlotDied) {
    const host = by(f.harlotHostId);
    if (host && isWolfRole(host.roleId)) add(`Con điếm ${harlot.name} ngủ nhầm nhà Sói ${host.name}.`, "bad", LOSS_IMPACT.HARLOT, harlot.id);
    else add(`Con điếm ${harlot.name} ghé nhà ${host?.name ?? "?"} đúng đêm Sói tới. Xui tận mạng.`, "bad", "Một cú cắn ăn hai mạng.", harlot.id);
  }

  const kamikaze = holder("KAMIKAZE");
  if (kamikaze && f.rammedId) {
    const t = by(f.rammedId);
    if (t && isWolfRole(t.roleId))
      add(`Kẻ cảm tử ${kamikaze.name} ôm bom lao vào Sói ${t.name}. Hy sinh anh dũng!`, "good", "Đổi một dân lấy một Sói: phe Làng lời.", kamikaze.id);
    else add(`Kẻ cảm tử ${kamikaze.name} lao vào ${t?.name} (${roleName(t)}). Nổ nhầm phe.`, "bad", "Làng mất hai người một lúc, Sói ngồi không cũng lời.", kamikaze.id);
  }

  const white = holder("WHITE_WOLF");
  for (const d of f.died.filter((x) => x.cause === "WHITE_WOLF"))
    add(`Sói trắng ${white?.name ?? ""} lặng lẽ xử luôn đồng bọn ${by(d.id)?.name}.`, "good", "Bầy Sói tự yếu đi, Sói trắng tiến gần giấc mơ đứng một mình.", white?.id);
  for (const d of f.died.filter((x) => x.cause === "HEARTBREAK"))
    add(`${by(d.id)?.name} chết theo người yêu.`, "info", "Một cái chết kéo theo hai mạng.");
  if (f.wildTurnedId)
    add(`Thần tượng ra đi, Đứa trẻ hoang ${by(f.wildTurnedId)?.name} hóa Sói.`, "info", "Bầy Sói thêm một thành viên, từ đêm sau dậy cùng bầy.");
  if (!f.died.length) add("Sáng ra cả làng đông đủ. Đêm bình yên hiếm hoi.", "info");

  out.push(statusEntry(f.round, "NIGHT", f.after));
  return out;
}

/** Cục diện sau một chặng: còn bao nhiêu Sói, bao nhiêu Làng, và ai đang nắm thế. */
export function statusEntry(round: number, phase: "NIGHT" | "DAY", players: P[]): LogEntry {
  const alive = players.filter((p) => p.isAlive);
  const wolves = alive.filter((p) => isWolfRole(p.roleId)).length;
  const village = alive.length - wolves;
  let note: string;
  if (wolves === 0) note = "Bầy Sói đã sạch bóng.";
  else if (village - wolves <= 1) note = "Báo động đỏ: chỉ cần mất thêm một người dân là Sói thắng. Hôm nay treo trượt là thua.";
  else if (village - wolves <= 2) note = "Sói đang áp sát. Làng hết chỗ cho sai lầm.";
  else if (wolves === 1) note = "Chỉ còn một con Sói lẩn trốn, làng đang có lợi.";
  else note = "Làng còn đông, vẫn còn đất để diễn và đoán.";
  return { round, phase, tone: "status", text: `Còn ${wolves} Sói · ${village} Làng.`, impact: note };
}

/** Một dòng nhật ký ban ngày. */
export function dayEntry(round: number, text: string, tone: LogTone, impact?: string, actorId?: string): LogEntry {
  return { round, phase: "DAY", text, tone, impact, actorId };
}

/** Ghi pha treo cổ. */
export function logLynch(
  round: number,
  target: P,
  viaRoulette: boolean,
  idiotSaved: boolean,
  died: { id: string; cause: DeathCause }[],
  all: P[],
): LogEntry[] {
  const lead = viaRoulette ? `Vòng quay tử thần gọi tên ${target.name}` : `Cả làng giơ tay treo ${target.name}`;
  const out: LogEntry[] = [];
  if (idiotSaved)
    out.push(dayEntry(round, `${lead}… là Thằng ngố. Cười trừ một cái, thoát chết.`, "info", "Thằng ngố còn sống nhưng mất quyền bỏ phiếu tới hết ván.", target.id));
  else if (isWolfRole(target.roleId))
    out.push(dayEntry(round, `${lead}: đúng Sói!`, "good", "Bầy Sói mất một răng, đêm nay cắn ít người hơn hoặc phải liều hơn."));
  else if (target.roleId === "ELDER")
    out.push(dayEntry(round, `${lead}: là Già làng.`, "bad", "Trời phạt: các vai phép phe Làng có thể mất phép tới hết ván (theo luật nhà)."));
  else
    out.push(
      dayEntry(
        round,
        `${lead}: là ${roleName(target)}. Treo nhầm người.`,
        "bad",
        `Làng tự chặt tay mình, Sói lại gần chiến thắng thêm một bước. ${LOSS_IMPACT[target.roleId ?? ""] ?? ""}`.trim(),
      ),
    );
  for (const d of died.filter((x) => x.cause === "HEARTBREAK"))
    out.push(dayEntry(round, `${all.find((p) => p.id === d.id)?.name} chết theo người yêu.`, "info"));
  return out;
}

export function logSpare(round: number, target: P): LogEntry {
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Làng mủi lòng tha cho ${target.name}… là Sói.`, "bad", "Sói thoát nạn, đêm nay tiếp tục cắn. Ai bênh nhiệt tình nhất cũng đáng nghi.")
    : dayEntry(round, `Làng tha ${target.name}. Đúng là dân lành thật.`, "good", "Giữ được một người vô tội, nhưng mất một ngày chưa treo được Sói.");
}

export function logShot(round: number, hunter: P, target: P | undefined): LogEntry {
  if (!target) return dayEntry(round, `Thợ săn ${hunter.name} buông súng, không bắn ai.`, "info", "Phí phát súng cuối cùng.", hunter.id);
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Thợ săn ${hunter.name} bắn chết Sói ${target.name}.`, "good", "Chết vẫn kéo được một con Sói theo: phe Làng không lỗ.", hunter.id)
    : dayEntry(round, `Thợ săn ${hunter.name} bắn nhầm ${target.name} (${roleName(target)}).`, "bad", "Làng mất thêm một người, Sói được lợi kép.", hunter.id);
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
