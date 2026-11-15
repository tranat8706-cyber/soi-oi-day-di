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
  /** Loại pha, dùng để viết nhận xét tổng ván. */
  tag?: LogTag;
}

export type LogTag =
  | "KEY_KILL"
  | "SAVE"
  | "CURSE"
  | "POISON_WOLF"
  | "POISON_WRONG"
  | "SEER_HIT"
  | "WOLF_SEER_KEY"
  | "FOX_MISS"
  | "RAM_WOLF"
  | "RAM_WRONG"
  | "LYNCH_WOLF"
  | "LYNCH_WRONG"
  | "SPARE_WOLF"
  | "SHOT_WOLF"
  | "SHOT_WRONG";

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
  const add = (text: string, tone: LogTone, impact?: string, actorId?: string, tag?: LogTag) =>
    out.push({ round: f.round, phase: "NIGHT", text, tone, impact, actorId, tag });
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
        add(`Sói mò vào nhà ${v.name} nhưng Con điếm đi chơi đêm. Về tay trắng.`, "good", "Sói phí một đêm, làng giữ nguyên quân số.", v.id, "SAVE");
        break;
      case "GUARDED":
        add(
          `Bảo vệ ${guard?.name ?? ""} che đúng ${v.name} ngay cú cắn.`,
          "good",
          `Cứu được ${v.name}, Sói phí một đêm. Đêm sau Bảo vệ không được che ${v.name} nữa, Sói có thể quay lại.`,
          guard?.id,
          "SAVE",
        );
        break;
      case "HEALED":
        add(
          `Phù thủy ${witch?.name ?? ""} ném bình cứu kịp cho ${v.name}.`,
          "good",
          "Bình cứu đã dùng: từ đêm sau ai bị cắn là chết thật, trừ khi Bảo vệ che trúng.",
          witch?.id,
          "SAVE",
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
          "CURSE",
        );
        break;
      case "KILLED":
        if (KEY_ROLES.has(v.roleId ?? ""))
          add(`Bầy Sói cắn trúng ${roleName(v)} ${v.name}. Đúng tủ, làng toang một mảng.`, "good", LOSS_IMPACT[v.roleId ?? ""], undefined, "KEY_KILL");
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
      add(`Phù thủy ${witch.name} hạ độc trúng Sói ${t.name}.`, "good", "Bầy Sói mất một răng. Bình độc đã dùng, từ giờ Phù thủy chỉ còn bình cứu (nếu chưa dùng).", witch.id, "POISON_WOLF");
    else if (t)
      add(
        `Phù thủy ${witch.name} đầu độc nhầm ${t.name} (${roleName(t)}).`,
        "bad",
        `Làng mất người vì chính phe mình, bình độc cũng hết. ${LOSS_IMPACT[t.roleId ?? ""] ?? ""}`.trim(),
        witch.id,
        "POISON_WRONG",
      );
  }

  const seer = holder("SEER");
  if (seer && a.SEER && !f.lost) {
    const t = by(a.SEER);
    if (t?.roleId === "LYCAN")
      add(`Tiên tri ${seer.name} soi ${t.name} ra Sói… nhưng là Bán sói.`, "info", `Nếu Tiên tri tố ${t.name}, làng sẽ treo oan một người phe mình.`, seer.id);
    else if (t && looksLikeWolf(t.roleId))
      add(`Tiên tri ${seer.name} soi trúng Sói ${t.name}. Mắt thần!`, "good", `Ban ngày Tiên tri cần dẫn dắt khéo để làng treo ${t.name} mà không lộ mặt mình.`, seer.id, "SEER_HIT");
    else if (t) add(`Tiên tri ${seer.name} soi ${t.name}: dân lành.`, "info", `Gạch được ${t.name} khỏi danh sách nghi ngờ.`, seer.id);
  }

  const wolfSeer = holder("WOLF_SEER");
  if (wolfSeer && a.WOLF_SEER) {
    const t = by(a.WOLF_SEER);
    if (t && KEY_ROLES.has(t.roleId ?? ""))
      add(`Sói tiên tri ${wolfSeer.name} soi ra ${t.name} là ${roleName(t)}.`, "good", `Bầy đã biết mặt ${roleName(t)}: các đêm sau ${t.name} rất dễ bị cắn.`, wolfSeer.id, "WOLF_SEER_KEY");
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
      f.foxFound ? undefined : "FOX_MISS",
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
      add(`Kẻ cảm tử ${kamikaze.name} ôm bom lao vào Sói ${t.name}. Hy sinh anh dũng!`, "good", "Đổi một dân lấy một Sói: phe Làng lời.", kamikaze.id, "RAM_WOLF");
    else add(`Kẻ cảm tử ${kamikaze.name} lao vào ${t?.name} (${roleName(t)}). Nổ nhầm phe.`, "bad", "Làng mất hai người một lúc, Sói ngồi không cũng lời.", kamikaze.id, "RAM_WRONG");
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
export function dayEntry(round: number, text: string, tone: LogTone, impact?: string, actorId?: string, tag?: LogTag): LogEntry {
  return { round, phase: "DAY", text, tone, impact, actorId, tag };
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
    out.push(dayEntry(round, `${lead}: đúng Sói!`, "good", "Bầy Sói mất một răng, đêm nay cắn ít người hơn hoặc phải liều hơn.", undefined, "LYNCH_WOLF"));
  else if (target.roleId === "ELDER")
    out.push(dayEntry(round, `${lead}: là Già làng.`, "bad", "Trời phạt: các vai phép phe Làng có thể mất phép tới hết ván (theo luật nhà).", undefined, "LYNCH_WRONG"));
  else
    out.push(
      dayEntry(
        round,
        `${lead}: là ${roleName(target)}. Treo nhầm người.`,
        "bad",
        `Làng tự chặt tay mình, Sói lại gần chiến thắng thêm một bước. ${LOSS_IMPACT[target.roleId ?? ""] ?? ""}`.trim(),
        undefined,
        "LYNCH_WRONG",
      ),
    );
  for (const d of died.filter((x) => x.cause === "HEARTBREAK"))
    out.push(dayEntry(round, `${all.find((p) => p.id === d.id)?.name} chết theo người yêu.`, "info"));
  return out;
}

export function logSpare(round: number, target: P): LogEntry {
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Làng mủi lòng tha cho ${target.name}… là Sói.`, "bad", "Sói thoát nạn, đêm nay tiếp tục cắn. Ai bênh nhiệt tình nhất cũng đáng nghi.", undefined, "SPARE_WOLF")
    : dayEntry(round, `Làng tha ${target.name}. Đúng là dân lành thật.`, "good", "Giữ được một người vô tội, nhưng mất một ngày chưa treo được Sói.");
}

export function logShot(round: number, hunter: P, target: P | undefined): LogEntry {
  if (!target) return dayEntry(round, `Thợ săn ${hunter.name} buông súng, không bắn ai.`, "info", "Phí phát súng cuối cùng.", hunter.id);
  return isWolfRole(target.roleId)
    ? dayEntry(round, `Thợ săn ${hunter.name} bắn chết Sói ${target.name}.`, "good", "Chết vẫn kéo được một con Sói theo: phe Làng không lỗ.", hunter.id, "SHOT_WOLF")
    : dayEntry(round, `Thợ săn ${hunter.name} bắn nhầm ${target.name} (${roleName(target)}).`, "bad", "Làng mất thêm một người, Sói được lợi kép.", hunter.id, "SHOT_WRONG");
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

/** Pha đủ nặng để gọi là bước ngoặt, xếp theo độ nặng. */
const TURNING: LogTag[] = [
  "KEY_KILL",
  "LYNCH_WRONG",
  "LYNCH_WOLF",
  "POISON_WOLF",
  "POISON_WRONG",
  "SHOT_WOLF",
  "SHOT_WRONG",
  "RAM_WOLF",
  "RAM_WRONG",
  "CURSE",
  "SPARE_WOLF",
  "SAVE",
  "SEER_HIT",
  "WOLF_SEER_KEY",
  "FOX_MISS",
];

const parseStatus = (e: LogEntry) => {
  const m = e.text.match(/Còn (\d+) Sói · (\d+) Làng/);
  return { w: Number(m?.[1] ?? 0), v: Number(m?.[2] ?? 0) };
};
const when = (e: LogEntry) => `${e.phase === "NIGHT" ? "Đêm" : "Ngày"} ${e.round}`;

export interface Verdict {
  paragraphs: string[];
  /** Các bước ngoặt theo thứ tự thời gian, kèm hệ quả cho các đêm sau. */
  turning: { when: string; text: string; impact?: string }[];
}

/** Nhận xét tổng ván: diễn biến cục diện, mỗi phe làm được gì, vì sao bên thắng thắng. */
export function verdict(log: LogEntry[], winner: string | null, nights: number): Verdict {
  const count = (...tags: LogTag[]) => log.filter((e) => e.tag && tags.includes(e.tag)).length;
  const statuses = log.filter((e) => e.tone === "status");
  const paragraphs: string[] = [];

  const first = statuses[0] && parseStatus(statuses[0]);
  const last = statuses.at(-1) && parseStatus(statuses.at(-1)!);
  if (first && last) {
    // Lúc làng nguy nhất: khoảng cách Làng - Sói nhỏ nhất khi Sói còn sống.
    let worst: LogEntry | undefined;
    let gap = Infinity;
    for (const e of statuses) {
      const { w, v } = parseStatus(e);
      if (w > 0 && v - w < gap) {
        gap = v - w;
        worst = e;
      }
    }
    let p = `Ván kéo dài ${nights} đêm, mở đầu sau đêm 1 ở thế ${first.w} Sói : ${first.v} Làng và khép lại ở ${last.w} : ${last.v}.`;
    if (worst && gap <= 2 && winner !== "WOLF") p += ` Thời điểm làng nguy nhất là sau ${when(worst).toLowerCase()}, chỉ hơn bầy Sói ${gap} người.`;
    paragraphs.push(p);
  }

  const lynchWolf = count("LYNCH_WOLF");
  const lynchWrong = count("LYNCH_WRONG");
  const saves = count("SAVE");
  const seerHits = count("SEER_HIT");
  const villageKills = count("POISON_WOLF", "SHOT_WOLF", "RAM_WOLF");
  const friendlyFire = count("POISON_WRONG", "SHOT_WRONG", "RAM_WRONG");
  const village: string[] = [];
  if (lynchWolf + lynchWrong) village.push(`treo đúng ${lynchWolf} Sói, treo nhầm ${lynchWrong} người phe mình`);
  if (seerHits) village.push(`Tiên tri soi trúng Sói ${seerHits} lần`);
  if (saves) village.push(`cứu thoát ${saves} cú cắn`);
  if (villageKills) village.push(`hạ thêm ${villageKills} Sói bằng phép ban đêm hoặc súng`);
  if (friendlyFire) village.push(`tự bắn nhầm phe ${friendlyFire} lần`);
  if (village.length) paragraphs.push(`Phe Làng: ${village.join(", ")}.`);

  const keyKills = log.filter((e) => e.tag === "KEY_KILL");
  const wolves: string[] = [];
  if (keyKills.length) wolves.push(`cắn trúng ${keyKills.length} vai chủ chốt (${keyKills.map(when).join(", ").toLowerCase()})`);
  if (count("CURSE")) wolves.push("nguyền thêm được đồng bọn");
  if (count("WOLF_SEER_KEY")) wolves.push(`Sói tiên tri lộ mặt ${count("WOLF_SEER_KEY")} vai phép`);
  if (count("SPARE_WOLF")) wolves.push(`được làng tha ${count("SPARE_WOLF")} lần`);
  if (wolves.length) paragraphs.push(`Phe Sói: ${wolves.join(", ")}.`);

  let close: string;
  if (winner === "WOLF")
    close =
      lynchWrong > lynchWolf
        ? "Làng thua vì treo nhầm nhiều hơn treo đúng: mỗi lần treo oan là tự giúp Sói thêm một mạng."
        : keyKills.length
          ? "Làng thua vì mất các vai phép quá sớm: không còn ai soi và che, ban ngày chỉ còn đoán mò."
          : "Bầy Sói giữ bài kín tới cuối, làng không kịp lật được đủ Sói.";
  else if (winner === "VILLAGER")
    close =
      lynchWolf > 0 && lynchWrong === 0
        ? "Làng thắng gọn: lần nào treo cũng trúng Sói, không phí một lá phiếu."
        : saves + seerHits > 0
          ? "Làng thắng nhờ các vai phép làm tròn việc: soi ra Sói và giữ được người qua những đêm khó."
          : "Làng thắng sát nút, có lúc chênh vênh nhưng vẫn lật được bầy Sói.";
  else if (winner === "LOVERS") close = "Cặp đôi khác phe đi tới cuối cùng: cả làng lẫn bầy Sói đều bị qua mặt.";
  else if (winner === "WHITE_WOLF") close = "Sói trắng diễn tròn vai, đứng một mình trên đống đổ nát của cả hai phe.";
  else close = "";
  if (close) paragraphs.push(close);

  const turning = log
    .filter((e) => e.tag && TURNING.includes(e.tag))
    .map((e, i) => ({ e, i, rank: TURNING.indexOf(e.tag!) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, 4)
    .sort((a, b) => a.i - b.i)
    .map(({ e }) => ({ when: when(e), text: e.text, impact: e.impact }));

  return { paragraphs, turning };
}
