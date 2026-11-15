"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronDown, Eye, EyeOff, Sun } from "lucide-react";
import { getRole, isWolfRole, ROLES, looksLikeWolf, NIGHT_SEQUENCE, wakesOnNight, type Role } from "@/constants/roles";
import {
  stepOf,
  useGameStore,
  type NightActionKey,
  type NightActions,
  type NightRoleId,
  type Player,
} from "@/store/gameStore";
import { countRoles } from "@/utils/balancer";
import { foxGroup } from "@/utils/rules";
import { DeckSummary } from "../DeckSummary";
import { PlayerList, type SelectFx } from "./PlayerList";
import { StepBack } from "./StepBack";
import { useArt } from "@/hooks/useArt";
import { UndoToast, type ToastData } from "./UndoToast";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

const VERB: Record<NightActionKey, string> = {
  CUPID: "Thần tình yêu ghép",
  WILD_CHILD: "Đứa trẻ hoang chọn thần tượng",
  GUARD: "Bảo vệ che",
  WOLF: "Sói cắn",
  WOLF_2: "Sói cắn thêm",
  WOLF_CURSE: "Sói nguyền",
  WOLF_SEER: "Sói tiên tri soi",
  WHITE_WOLF: "Sói trắng giết",
  WITCH_SAVE: "Phù thủy cứu",
  WITCH_KILL: "Phù thủy đầu độc",
  SEER: "Tiên tri soi",
  FOX: "Cáo đánh hơi",
  KAMIKAZE: "Kẻ cảm tử lao vào",
  HARLOT: "Con điếm ngủ nhà",
};

/** Các vai phe Làng mất phép khi Già làng bị treo. */
const VILLAGE_POWERS: NightRoleId[] = ["GUARD", "WITCH", "SEER", "FOX", "KAMIKAZE", "HARLOT"];

/** Bước này đã có lựa chọn nào chưa. */
const stepChosen = (rid: NightRoleId, a: NightActions) =>
  rid === "WITCH" ? !!(a.WITCH_SAVE || a.WITCH_KILL) : rid === "CUPID" ? (a.CUPID ?? "").split("|").length === 2 : !!a[rid];

/** Luật "Bắt buộc dùng": các vai này phải chọn mỗi đêm. Phù thủy, Kẻ cảm tử, Sói trắng luôn được bỏ qua. */
const REQUIRED: NightRoleId[] = ["CUPID", "WILD_CHILD", "HARLOT", "GUARD", "WOLF", "WOLF_SEER", "SEER", "FOX"];

/** Hiệu ứng khi chạm chọn người ở từng bước. */
const FX_OF: Partial<Record<NightActionKey, SelectFx>> = {
  WOLF: "claw",
  WOLF_2: "claw",
  WHITE_WOLF: "claw",
  GUARD: "shield",
  SEER: "eye",
  WOLF_SEER: "eye",
  FOX: "nose",
  HARLOT: "home",
  KAMIKAZE: "bomb",
  WILD_CHILD: "star",
};

/** Câu Quản trò đọc thêm để nhắc vai này có quyền không dùng phép đêm nay. */
const OPTIONAL_SAY: Partial<Record<NightRoleId, string>> = {
  WOLF: "Sói có thể không cắn ai đêm nay.",
  GUARD: "Bảo vệ có thể không che ai. Không được che một người hai đêm liền.",
  SEER: "Tiên tri có thể không soi đêm nay.",
  WOLF_SEER: "Sói tiên tri có thể không soi đêm nay.",
  FOX: "Cáo có thể nghỉ một đêm, không đánh hơi.",
  HARLOT: "Con điếm có thể ở nhà, không ngủ cùng ai. Không được ngủ một nhà hai đêm liền.",
  WITCH: "Phù thủy có thể không dùng bình nào. Mỗi bình chỉ dùng một lần cả ván.",
  KAMIKAZE: "Kẻ cảm tử có thể để dành, chưa lao vào ai đêm nay.",
  WHITE_WOLF: "Sói trắng có thể tha cho đồng bọn đêm nay.",
  WILD_CHILD: "Đứa trẻ hoang chọn một người làm thần tượng.",
};

/** Luật cần nhắc riêng, đọc mọi đêm bất kể luật nhà. */
const RULE_SAY: Partial<Record<NightRoleId, string>> = {
  FOX: "Cáo chỉ vào 1 người: tôi xét người đó và 2 người ngồi hai bên. Nếu cả 3 không có Sói, Cáo mất phép từ đêm sau.",
};

/** Chữ trên nút bỏ qua theo từng vai. */
const SKIP_LABEL: Partial<Record<NightRoleId, string>> = {
  WOLF: "Sói không cắn ai đêm nay",
  WITCH: "Không dùng bình nào đêm nay",
  GUARD: "Không che ai đêm nay",
  SEER: "Không soi ai đêm nay",
  WOLF_SEER: "Không soi ai đêm nay",
  FOX: "Không đánh hơi đêm nay",
  HARLOT: "Ở nhà đêm nay",
  KAMIKAZE: "Chưa lao vào ai",
  WHITE_WOLF: "Không giết Sói nào",
  CUPID: "Không ghép đôi",
  WILD_CHILD: "Không chọn thần tượng",
};

/** Tên vai trong lời gọi, dài trước ngắn sau để "Sói tiên tri" không bị bắt thành "Sói". */
const ROLE_NAMES = [...new Set([...Object.values(ROLES).map((r) => r.name), "Bầy Sói", "bầy Sói", "Sói", "sói"])].sort(
  (a, b) => b.length - a.length,
);
// Tên vai chỉ gồm chữ và khoảng trắng nên ghép thẳng vào regex.
const ROLE_RE = new RegExp(`(${ROLE_NAMES.join("|")})`, "g");
const WOLF_NAMES = new Set(Object.values(ROLES).filter((r) => r.team === "WOLVES").map((r) => r.name));

/** Tô đậm tên vai trong lời gọi để Quản trò liếc là đọc được. */
function RoleText({ text }: { text: string }) {
  return (
    <>
      {text.split(ROLE_RE).map((part, i) =>
        i % 2 ? (
          <strong
            key={i}
            className={`font-bold ${WOLF_NAMES.has(part) || /^(bầy )?sói$/i.test(part) ? "text-blood" : "text-bone underline decoration-blood decoration-2 underline-offset-4"}`}
          >
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">{children}</p>
);

export function NightScreen() {
  const { card, art } = useArt();
  const s = useGameStore();
  const {
    players,
    nightNumber,
    nightActions,
    lastGuardTargetId,
    setNightAction,
    undoLastNightAction,
    resolveNight,
    backToSetup,
  } = s;
  const guardSelf = s.houseRules.bodyguardSelfProtect;
  const witchSeesVictim = s.houseRules.witchSeesVictim !== false;
  const force = s.houseRules.forceNightActions === true;
  const skips = s.nightSkips ?? [];
  /** Đã xong bước: có lựa chọn, hoặc Quản trò đã bấm "không dùng". */
  const stepDone = (rid: NightRoleId, a: NightActions) => stepChosen(rid, a) || skips.includes(rid);
  const canSkip = (rid: NightRoleId) => !force || !REQUIRED.includes(rid);

  // Người giữ vai của từng bước. Bước Sói gọi cả bầy (kể cả Sói đặc biệt).
  const holdersOf = (role: Role) =>
    role.id === "WOLF" ? players.filter((p) => isWolfRole(p.roleId)) : players.filter((p) => p.roleId === role.id);
  const steps = NIGHT_SEQUENCE.filter((r) => wakesOnNight(r, nightNumber) && holdersOf(r).length > 0);
  const nameOf = (id: string | undefined) => players.find((p) => p.id === id)?.name;

  const [openId, setOpenId] = useState<string | null>(
    () => steps.find((r) => !stepDone(r.id as NightRoleId, nightActions))?.id ?? null,
  );
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmWake, setConfirmWake] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const stepRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const toastSeq = useRef(0);

  useEffect(() => {
    if (!openId) return;
    const el = stepRefs.current[openId];
    // Đợi accordion mở xong một nhịp rồi mới cuộn.
    const t = setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 220);
    return () => clearTimeout(t);
  }, [openId]);

  const hideToast = useCallback(() => setToast(null), []);

  const notify = (message: string) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message });
  };

  /** Chọn xong thì cuộn tới kết quả + nút Xong của bước đang mở. */
  const scrollToDone = () => {
    if (!openId) return;
    setTimeout(() => {
      stepRefs.current[openId]?.querySelector("[data-step-done]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const choose = (key: NightActionKey, target: Player | null) => {
    if ((nightActions[key] ?? null) === (target?.id ?? null)) return;
    if (target) s.setNightSkip(stepOf(key), false); // chọn người thì hết "không dùng"
    setNightAction(key, target?.id ?? null);
    setConfirmWake(false);
    notify(target ? `${VERB[key]} ${target.name}.` : `Bỏ: ${VERB[key].toLowerCase()}.`);
    // Bước còn lựa chọn phụ (Phù thủy 2 bình, Sói cắn người thứ hai) thì không cuộn đi.
    const pendingSecondBite = key === "WOLF" && s.cubRevenge && !nightActions.WOLF_2;
    if (target && !key.startsWith("WITCH") && key !== "WOLF_CURSE" && !pendingSecondBite) scrollToDone();
  };

  /** Thần tình yêu: chọn đủ 2 người. */
  const toggleLover = (p: Player) => {
    const cur = (nightActions.CUPID ?? "").split("|").filter(Boolean);
    const next = cur.includes(p.id) ? cur.filter((id) => id !== p.id) : cur.length < 2 ? [...cur, p.id] : [cur[0], p.id];
    s.setNightSkip("CUPID", false);
    setNightAction("CUPID", next.length ? next.join("|") : null);
    if (next.length === 2) {
      notify(`${VERB.CUPID} ${next.map((id) => nameOf(id)).join(" ♥ ")}.`);
      scrollToDone();
    }
  };

  const undo = () => {
    const undone = undoLastNightAction();
    setToast(null);
    if (undone) setOpenId(stepOf(undone.roleId));
  };

  const wolvesAlive = players.some((p) => p.isAlive && isWolfRole(p.roleId));
  const missingBite = wolvesAlive && !nightActions.WOLF && !skips.includes("WOLF");
  const onWake = () => {
    // Bắt buộc dùng: chưa chọn đủ thì mở bước còn thiếu thay vì qua đêm.
    if (force && requiredPending.length > 0) {
      setOpenId(requiredPending[0].id);
      return;
    }
    if ((missingBite || pendingSteps.length > 0) && !confirmWake) {
      setConfirmWake(true);
      setTimeout(() => setConfirmWake(false), 3000);
      return;
    }
    setToast(null);
    resolveNight();
  };

  const onAbortTap = () => {
    if (!confirmAbort) {
      setConfirmAbort(true);
      setTimeout(() => setConfirmAbort(false), 2500);
      return;
    }
    backToSetup();
  };

  /** Vì sao bước này không chọn được (vai đã chết thì vẫn gọi để giữ bí mật). */
  const blockedReason = (rid: NightRoleId, holders: Player[]) => {
    if (holders.every((p) => !p.isAlive)) return "dead";
    if (s.villagePowersLost && VILLAGE_POWERS.includes(rid)) return "elder";
    if (rid === "FOX" && s.foxPowerLost) return "fox";
    if (rid === "KAMIKAZE" && s.kamikazeUsed) return "used";
    return null;
  };

  // Bước còn chọn được mà chưa chọn (bỏ qua bước của người chết / mất phép, và bước không bắt buộc).
  const OPTIONAL: NightRoleId[] = ["WITCH", "KAMIKAZE", "WHITE_WOLF"];
  const pendingSteps = steps.filter((r) => {
    const rid = r.id as NightRoleId;
    return !OPTIONAL.includes(rid) && !blockedReason(rid, holdersOf(r)) && !stepDone(rid, nightActions);
  });
  const requiredPending = force ? pendingSteps.filter((r) => REQUIRED.includes(r.id as NightRoleId)) : [];

  /** Bấm "Đêm nay không dùng": đánh dấu bước, xóa lựa chọn của bước đó, mở bước kế. */
  const skipStep = (rid: NightRoleId, nextId: string | null) => {
    s.setNightSkip(rid, true);
    setConfirmWake(false);
    notify(`${SKIP_LABEL[rid] ?? "Không dùng phép"}.`);
    setOpenId(nextId);
  };

  const summaryOf = (rid: NightRoleId) => {
    const a = nightActions;
    if (skips.includes(rid)) return SKIP_LABEL[rid] ?? "Không dùng đêm nay";
    switch (rid) {
      case "WITCH":
        return [a.WITCH_SAVE && `Cứu ${nameOf(a.WITCH_SAVE)}`, a.WITCH_KILL && `Độc ${nameOf(a.WITCH_KILL)}`].filter(Boolean).join(" · ") || "Chưa dùng bình";
      case "CUPID": {
        const ids = (a.CUPID ?? "").split("|").filter(Boolean);
        return ids.length ? ids.map((id) => nameOf(id)).join(" ♥ ") : null;
      }
      case "WOLF": {
        const parts = [a.WOLF && `${a.WOLF_CURSE === a.WOLF ? "Nguyền" : "Cắn"} ${nameOf(a.WOLF)}`, s.cubRevenge && a.WOLF_2 && `cắn thêm ${nameOf(a.WOLF_2)}`];
        return parts.filter(Boolean).join(" · ") || null;
      }
      default:
        return a[rid] ? `${VERB[rid]} · ${nameOf(a[rid])}` : null;
    }
  };

  const listProps = (key: NightActionKey, disabled?: (p: Player) => string | null) => ({
    players,
    showRoles: true,
    selectedId: nightActions[key],
    onSelect: (p: Player) => choose(key, nightActions[key] === p.id && key !== "WOLF" && key !== "GUARD" && key !== "SEER" ? null : p),
    disabledReason: disabled,
    selectFx: FX_OF[key],
  });

  const stepBody = (role: Role) => {
    const rid = role.id as NightRoleId;
    const a = nightActions;
    switch (rid) {
      case "CUPID": {
        const ids = (a.CUPID ?? "").split("|").filter(Boolean);
        return (
          <>
            <Label>Chọn 2 người yêu nhau · {ids.length}/2</Label>
            <div className="mt-2">
              <PlayerList players={players} showRoles selectedIds={ids} onSelect={toggleLover} selectFx="heart" />
            </div>
          </>
        );
      }
      case "WILD_CHILD":
        return (
          <>
            <Label>Chọn thần tượng</Label>
            <div className="mt-2">
              <PlayerList {...listProps("WILD_CHILD", (p) => (p.roleId === "WILD_CHILD" ? "Chính mình" : null))} />
            </div>
          </>
        );
      case "GUARD":
        return (
          <>
            <Label>Chọn người được che</Label>
            <div className="mt-2">
              <PlayerList
                {...listProps("GUARD", (p) =>
                  p.id === lastGuardTargetId ? "Đã che đêm trước" : !guardSelf && p.roleId === "GUARD" ? "Không tự che" : null,
                )}
              />
            </div>
          </>
        );
      case "WOLF": {
        const target = players.find((p) => p.id === a.WOLF);
        const canCurse = !s.curseUsed && players.some((p) => p.isAlive && p.roleId === "CURSED_WOLF");
        const cursing = !!target && a.WOLF_CURSE === target.id;
        const pack = (p: Player) => (isWolfRole(p.roleId) ? "Đồng bọn" : null);
        const turned = players.filter((p) => s.newWolfIds.includes(p.id) && p.isAlive);
        return (
          <>
            {turned.map((p) => (
              <p key={p.id} className="mt-5 rounded-xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm leading-snug text-bone">
                <span className="font-semibold text-blood">{p.name} vừa hóa Sói</span> (từng là {getRole(p.formerRoleId)?.name}, thần
                tượng đã chết). Chạm vai {p.name} để họ mở mắt dậy cùng bầy từ đêm nay.
              </p>
            ))}
            {s.cubRevenge && (
              <p className="mt-5 rounded-xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm leading-snug text-bone">
                <span className="font-semibold text-blood">Sói con đã chết.</span> Bầy nổi giận: đêm nay được cắn 2 người. Đọc thêm: “Sói
                hãy chọn thêm một người nữa.”
              </p>
            )}
            <Label>{s.cubRevenge ? "Người thứ nhất" : "Chọn người bị cắn"}</Label>
            <div className="mt-2">
              <PlayerList {...listProps("WOLF", pack)} />
            </div>
            {canCurse && target && (
              <button
                type="button"
                onClick={() => choose("WOLF_CURSE", cursing ? null : target)}
                aria-pressed={cursing}
                className={`mt-4 flex min-h-16 w-full items-center justify-between rounded-xl px-4 text-left transition-colors ${
                  cursing ? "bg-blood text-bone" : "border border-blood/50 text-bone active:bg-ink"
                }`}
              >
                <span>
                  <span className="block text-lg font-medium">{cursing ? `Đã nguyền ${target.name}` : `Nguyền ${target.name} thành Sói`}</span>
                  <span className="block text-xs text-bone/70">Sói nguyền · 1 lần cả ván · không chết mà hóa Sói</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{cursing ? "Chạm để bỏ" : ""}</span>
              </button>
            )}
            {cursing && (
              <p className="mt-2 text-sm leading-snug text-ash">
                Khi cả làng nhắm mắt, chạm vai {target!.name} báo họ đã thành Sói, từ đêm sau dậy cùng bầy.
              </p>
            )}
            {s.cubRevenge && (
              <>
                <Label>Người thứ hai</Label>
                <div className="mt-2">
                  <PlayerList {...listProps("WOLF_2", (p) => pack(p) ?? (p.id === a.WOLF ? "Đã chọn" : null))} />
                </div>
              </>
            )}
          </>
        );
      }
      case "WOLF_SEER": {
        const t = players.find((p) => p.id === a.WOLF_SEER);
        return (
          <>
            <Label>Chọn người muốn soi</Label>
            <div className="mt-2">
              <PlayerList {...listProps("WOLF_SEER", (p) => (isWolfRole(p.roleId) ? "Đồng bọn" : null))} />
            </div>
            {t && (
              <ResultCard
                danger={t.roleId === "SEER"}
                who={t.name}
                big={getRole(t.roleId)?.name ?? "?"}
                hint="Giơ màn hình cho Sói tiên tri thấy lá bài (người khác đang nhắm mắt)."
                showTo="Sói tiên tri"
                image={card(t.roleId)}
              />
            )}
          </>
        );
      }
      case "WHITE_WOLF":
        return (
          <>
            <Label>Chọn một con Sói để giết (hoặc bỏ qua)</Label>
            <div className="mt-2">
              <PlayerList
                {...listProps("WHITE_WOLF", (p) =>
                  p.roleId === "WHITE_WOLF" ? "Chính mình" : !isWolfRole(p.roleId) ? "Không phải Sói" : null,
                )}
              />
            </div>
          </>
        );
      case "WITCH":
        return (
          <WitchStep
            players={players}
            actions={a}
            secondBite={s.cubRevenge ? a.WOLF_2 : undefined}
            healUsed={s.witchHealUsed}
            poisonUsed={s.witchPoisonUsed}
            seesVictim={witchSeesVictim}
            onChoose={choose}
          />
        );
      case "SEER": {
        const t = players.find((p) => p.id === a.SEER);
        const wolf = !!t && looksLikeWolf(t.roleId);
        return (
          <>
            <Label>Chọn người muốn soi</Label>
            <div className="mt-2">
              <PlayerList {...listProps("SEER", (p) => (p.roleId === "SEER" ? "Không tự soi" : null))} />
            </div>
            {t && (
              <ResultCard
                danger={wolf}
                who={t.name}
                big={wolf ? "Là Sói" : "Không phải Sói"}
                hint={
                  t.roleId === "LYCAN"
                    ? "Gật đầu với Tiên tri. (Thật ra là Bán sói, phe Làng.)"
                    : wolf
                      ? "Gật đầu với Tiên tri."
                      : "Lắc đầu với Tiên tri."
                }
                showTo="Tiên tri"
              />
            )}
          </>
        );
      }
      case "FOX": {
        const group = a.FOX ? foxGroup(players, a.FOX) : [];
        const wolf = group.some((p) => looksLikeWolf(p.roleId));
        return (
          <>
            <Label>Chỉ vào một người</Label>
            <div className="mt-2">
              <PlayerList {...listProps("FOX")} />
            </div>
            {group.length > 0 && (
              <ResultCard
                danger={wolf}
                who={group.map((p) => p.name).join(" · ")}
                big={wolf ? "Có Sói" : "Không có Sói"}
                hint={`${wolf ? "Gật đầu với Cáo." : "Lắc đầu với Cáo. Cáo mất phép từ đêm sau."} Nhóm 3 người tính theo thứ tự chỗ ngồi đã nhập ở bước 1 (vòng tròn: người cuối ngồi cạnh người đầu). Bàn ngồi khác thứ tự thì tự nhìn 3 người ngồi sát mà trả lời.`}
                showTo="Cáo"
              />
            )}
          </>
        );
      }
      case "HARLOT": {
        const host = players.find((p) => p.id === a.HARLOT);
        return (
          <>
            <Label>Đêm nay ngủ nhà ai?</Label>
            <div className="mt-2">
              <PlayerList
                {...listProps("HARLOT", (p) =>
                  p.roleId === "HARLOT" ? "Chính mình" : p.id === s.lastHarlotTargetId ? "Đã ngủ đêm trước" : null,
                )}
              />
            </div>
            {host && (
              <p className="mt-4 rounded-xl border border-line px-4 py-3 text-sm leading-snug text-ash">
                {isWolfRole(host.roleId) ? (
                  <span className="text-blood">{host.name} là Sói: sáng ra Con điếm sẽ chết.</span>
                ) : (
                  <>
                    Sói cắn vào nhà Con điếm thì Con điếm thoát. Nếu {host.name} bị Sói cắn chết đêm nay, Con điếm chết theo.
                  </>
                )}
              </p>
            )}
          </>
        );
      }
      case "KAMIKAZE": {
        const t = players.find((p) => p.id === a.KAMIKAZE);
        const self = holdersOf(role)[0];
        return (
          <>
            <Label>Lao vào ai? Không chọn = đêm nay chưa dùng</Label>
            <div className="mt-2">
              <PlayerList {...listProps("KAMIKAZE", (p) => (p.roleId === "KAMIKAZE" ? "Chính mình" : null))} />
            </div>
            {t && self && (
              <ResultCard
                danger
                who={`${self.name} + ${t.name}`}
                big="Cả hai cùng chết"
                hint="Sáng ra cả hai ra đi, Bảo vệ hay Phù thủy đều không cứu được. Chỉ dùng 1 lần cả ván."
              />
            )}
          </>
        );
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe"
    >
      <header className="flex items-center justify-between px-safe pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">04 — Đêm {pad(nightNumber)}</p>
        <span className="flex items-center">
        <StepBack />
        <button
          type="button"
          onClick={onAbortTap}
          className={`-mr-3 min-h-16 px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
            confirmAbort ? "text-blood" : "text-ash active:text-bone"
          }`}
        >
          {confirmAbort ? "Chạm lần nữa để hủy" : "Hủy ván"}
        </button>
        </span>
      </header>

      <main className="flex-1 px-safe pb-32">
        <div className="relative -mx-5 mt-2 overflow-hidden px-5 pb-2 pt-10">
          <motion.div
            aria-hidden
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.75, scale: 1 }}
            transition={{ duration: 2.4, ease }}
          >
            <Image src={art("night")} alt="" fill priority sizes="(max-width: 640px) 100vw, 640px" className="object-cover object-top" />
            <div className="absolute inset-0 bg-linear-to-b from-ink/10 via-ink/40 to-ink" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease }}
            className="relative pt-[0.1em] font-display text-[clamp(4rem,20vw,8rem)] uppercase leading-[1.18] text-bone"
          >
            Đêm buông
            <br />
            xuống<span className="text-blood">.</span>
          </motion.h1>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-blood/40 bg-blood/10 px-4 py-3">
          <EyeOff className="size-5 shrink-0 text-blood" strokeWidth={1.75} />
          <p className="text-sm leading-snug text-bone/90">
            Chỉ <span className="font-semibold text-bone">Quản trò</span> được nhìn màn hình. Cả làng nhắm mắt.
          </p>
        </div>

        {s.villagePowersLost && (
          <p className="mt-4 rounded-2xl border border-line px-4 py-3 text-sm leading-snug text-ash">
            Già làng đã chết dưới tay phe Làng: các vai phép phe Làng mất phép. Vẫn gọi từng vai như thường để giữ bí mật.
          </p>
        )}

        <div className="mt-6">
          <DeckSummary counts={countRoles(players)} label="Bộ bài ván này" size="sm" />
        </div>

        <ol className="mt-8 flex flex-col gap-3">
          {steps.map((role, idx) => {
            const rid = role.id as NightRoleId;
            const open = openId === role.id;
            const holders = holdersOf(role);
            const blocked = blockedReason(rid, holders);
            const done = stepDone(rid, nightActions);
            const next = steps[idx + 1];
            const summary = summaryOf(rid);

            return (
              <li
                key={role.id}
                ref={(el) => {
                  stepRefs.current[role.id] = el;
                }}
                className={`scroll-mt-4 overflow-hidden rounded-2xl border transition-colors ${
                  open ? "border-bone/30 bg-ink-2" : "border-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : role.id)}
                  aria-expanded={open}
                  className="flex min-h-20 w-full items-center gap-4 px-4 text-left"
                >
                  <span className="relative h-16 w-9 shrink-0 overflow-hidden rounded-md border border-line">
                    {card(role.id) && <Image src={card(role.id)!} alt="" fill sizes="36px" className="object-cover" />}
                    <span
                      className={`absolute -bottom-px -right-px grid size-5 place-items-center rounded-tl-md font-mono text-[10px] tabular-nums ${
                        done || blocked ? "bg-bone text-ink" : "bg-ink text-ash"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block pt-[0.1em] font-display text-3xl uppercase leading-[1.1] ${
                        blocked ? "text-neutral-500 line-through" : isWolfRole(role.id) ? "text-blood" : "text-bone"
                      }`}
                    >
                      {role.id === "WOLF" ? "Bầy Sói" : role.name}
                    </span>
                    <span className="mt-1.5 block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                      {blocked === "dead"
                        ? "Đã chết · vẫn gọi để giữ bí mật"
                        : blocked
                          ? "Mất phép · vẫn gọi để giữ bí mật"
                          : (summary ??
                            `${holders.filter((p) => p.isAlive).map((p) => p.name).join(", ") || "Không ai"} · chưa chọn${
                              role.firstNightOnly ? " · chỉ đêm đầu" : role.evenNightsOnly ? " · đêm chẵn" : ""
                            }`)}
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-6 shrink-0 text-ash transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    strokeWidth={1.5}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                    >
                      <div className="px-4 pb-4">
                        <p className="border-l-2 border-blood pl-4 text-xl leading-relaxed text-bone/85">
                          “<RoleText text={role.gmInstruction} />”
                        </p>
                        {(RULE_SAY[rid] || (OPTIONAL_SAY[rid] && canSkip(rid))) && !blocked && (
                          <div className="mt-3 rounded-xl border border-bone/20 bg-ink px-4 py-3">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Quản trò nói thêm</p>
                            {canSkip(rid) && OPTIONAL_SAY[rid] && (
                              <p className="mt-1 text-lg leading-snug text-bone">“<RoleText text={OPTIONAL_SAY[rid]!} />”</p>
                            )}
                            {RULE_SAY[rid] && (
                              <p className="mt-1 text-lg leading-snug text-bone">“<RoleText text={RULE_SAY[rid]!} />”</p>
                            )}
                          </div>
                        )}
                        {role.id === "WOLF" && holders.some((p) => p.roleId !== "WOLF") && (
                          <p className="mt-3 text-sm leading-snug text-ash">
                            Cả bầy cùng dậy:{" "}
                            {holders
                              .filter((p) => p.isAlive)
                              .map((p) => `${p.name} (${p.formerRoleId ? `${getRole(p.formerRoleId)?.name} → Sói` : getRole(p.roleId)?.name})`)
                              .join(", ")}
                            .
                          </p>
                        )}

                        {blocked ? (
                          <p className="mt-5 text-sm leading-relaxed text-ash">
                            {blocked === "dead"
                              ? "Không còn ai giữ vai này."
                              : blocked === "fox"
                                ? "Cáo đã đánh hơi trượt một lần nên mất phép."
                                : blocked === "used"
                                  ? "Kẻ cảm tử đã lao vào một lần."
                                  : "Già làng đã chết dưới tay phe Làng nên vai này mất phép."}{" "}
                            Vẫn đọc lời gọi, chờ vài giây rồi qua bước tiếp, để không ai đoán được.
                          </p>
                        ) : (
                          stepBody(role)
                        )}

                        {!blocked && canSkip(rid) && (
                          <button
                            type="button"
                            onClick={() => (skips.includes(rid) ? s.setNightSkip(rid, false) : skipStep(rid, next?.id ?? null))}
                            aria-pressed={skips.includes(rid)}
                            className={`mt-5 flex min-h-14 w-full items-center justify-center rounded-xl border border-dashed font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                              skips.includes(rid) ? "border-bone/60 bg-ink text-bone" : "border-line text-ash active:text-bone"
                            }`}
                          >
                            {skips.includes(rid) ? `Đã chọn: ${SKIP_LABEL[rid] ?? "không dùng"} · chạm để bỏ` : (SKIP_LABEL[rid] ?? "Đêm nay không dùng")}
                          </button>
                        )}
                        {!blocked && !canSkip(rid) && (
                          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
                            Luật nhà: bắt buộc dùng mỗi đêm
                          </p>
                        )}
                        <motion.button
                          type="button"
                          data-step-done
                          onClick={() => setOpenId(next?.id ?? null)}
                          whileTap={{ scale: 0.97 }}
                          className={`mt-5 flex h-16 w-full items-center justify-between rounded-xl px-5 transition-colors ${
                            done || blocked ? "bg-bone text-ink" : "border border-bone/40 text-bone active:bg-ink"
                          }`}
                        >
                          <span className="font-display text-2xl uppercase leading-[1.08]">
                            {next ? `Xong · gọi ${next.id === "WOLF" ? "bầy Sói" : next.name}` : "Xong · thu gọn"}
                          </span>
                          <ChevronDown className="size-6 shrink-0" strokeWidth={2} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        {/* Gọi làng dậy nằm cuối danh sách (không ghim đáy) để khỏi bấm nhầm khi đang chọn. */}
        <div className="mt-10">
          <motion.button
            type="button"
            onClick={onWake}
            whileTap={{ scale: 0.97 }}
            className={`flex h-20 w-full items-center justify-between rounded-2xl px-6 transition-colors ${
              requiredPending.length
                ? "border border-dashed border-line text-ash"
                : confirmWake
                  ? "bg-blood text-bone"
                  : pendingSteps.length || missingBite
                    ? "border border-line text-bone"
                    : "bg-bone text-ink"
            }`}
          >
            <span className="min-w-0 text-left">
              <span className="block font-display text-3xl uppercase leading-[1.08]">Gọi làng dậy</span>
              {(requiredPending.length > 0 || confirmWake || pendingSteps.length > 0 || missingBite) && (
                <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
                  {requiredPending.length
                    ? `Bắt buộc · còn thiếu: ${requiredPending.map((r) => (r.id === "WOLF" ? "Bầy Sói" : r.name)).join(", ")}`
                    : confirmWake
                      ? "Chạm lần nữa để gọi làng dậy"
                      : missingBite
                        ? "Sói chưa cắn ai"
                        : `Còn ${pendingSteps.length} bước chưa chọn`}
                </span>
              )}
            </span>
            <Sun className="size-7" strokeWidth={2} />
          </motion.button>
        </div>
      </main>

      <UndoToast toast={toast} onUndo={undo} onExpire={hideToast} />
    </motion.div>
  );
}

/**
 * Thẻ kết quả soi (Tiên tri, Sói tiên tri, Cáo). `showTo` có thì thêm nút giơ màn hình
 * cho người soi xem trực tiếp (toàn màn hình, không lộ phần còn lại của app).
 */
function ResultCard({
  danger,
  who,
  big,
  hint,
  showTo,
  image,
}: {
  danger: boolean;
  who: string;
  big: string;
  hint: string;
  showTo?: string;
  image?: string | null;
}) {
  const { theme } = useArt();
  const [showing, setShowing] = useState(false);
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={who + big}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease }}
          className={`mt-5 rounded-2xl px-5 py-6 text-center ${danger ? "bg-blood text-bone" : "border border-bone/40 text-bone"}`}
          aria-live="assertive"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-80">{who}</p>
          <p className="mt-2 pt-[0.15em] font-display text-5xl uppercase leading-[1.2]">{big}</p>
          <p className="mt-3 text-sm opacity-80">{hint}</p>
          {showTo && (
            <button
              type="button"
              onClick={() => setShowing(true)}
              className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl font-mono text-[11px] uppercase tracking-[0.18em] ${
                danger ? "bg-ink/30 text-bone" : "bg-bone text-ink"
              }`}
            >
              <Eye className="size-4" strokeWidth={2} />
              Giơ màn hình cho {showTo} xem
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showing && (
          <motion.button
            type="button"
            onClick={() => setShowing(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink px-6 text-center"
            aria-label="Đóng"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">{who}</span>
            {image ? (
              <Image src={image} alt={big} width={theme.card.w} height={theme.card.h} className="h-auto max-h-[62dvh] w-auto rounded-2xl" />
            ) : null}
            <span className={`pt-[0.15em] font-display text-[clamp(3rem,16vw,6rem)] uppercase leading-[1.15] ${danger ? "text-blood" : "text-bone"}`}>
              {big}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Chạm để đóng</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** Bước Phù thủy: xem ai bị cắn, dùng bình cứu và/hoặc bình độc. */
function WitchStep({
  players,
  actions,
  secondBite,
  healUsed,
  poisonUsed,
  seesVictim,
  onChoose,
}: {
  players: Player[];
  actions: NightActions;
  /** Người bị cắn thêm khi Sói con báo thù. */
  secondBite?: string;
  healUsed: boolean;
  poisonUsed: boolean;
  seesVictim: boolean;
  onChoose: (key: NightActionKey, target: Player | null) => void;
}) {
  const bitten = [actions.WOLF, secondBite]
    .map((id) => players.find((p) => p.id === id && p.isAlive))
    .filter((p, i, arr): p is Player => !!p && arr.indexOf(p) === i);
  const names = bitten.map((p) => p.name).join(" và ");
  const guarded = bitten.filter((p) => actions.GUARD === p.id);

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-line px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Đêm nay Sói cắn</p>
        <p className={`mt-1 pt-[0.1em] font-display text-4xl uppercase leading-[1.1] ${bitten.length ? "text-blood" : "text-ash"}`}>
          {bitten.length ? names : "Chưa có ai"}
        </p>
        <p className="mt-2 text-sm leading-snug text-ash">
          {!bitten.length
            ? "Sói chưa chọn hoặc không cắn ai. Quay lại bước Sói nếu cần."
            : seesVictim
              ? `Chỉ tay vào ${names} cho Phù thủy thấy.${bitten.length > 1 ? " Bình cứu chỉ cứu được 1 người." : ""}`
              : "Luật nhà: không cho Phù thủy biết ai bị cắn. Chỉ hỏi có muốn cứu hay không."}
          {guarded.length > 0 && ` Bảo vệ đã che ${guarded[0].name} nên dù không cứu vẫn sống.`}
        </p>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Bình cứu · {healUsed ? "đã dùng" : "còn 1"}</p>
        {healUsed || !bitten.length ? (
          <p className="mt-2 flex min-h-16 items-center rounded-xl border border-line px-4 text-lg font-medium text-bone opacity-30">
            {healUsed ? "Đã dùng ở đêm trước" : "Không có ai để cứu"}
          </p>
        ) : (
          bitten.map((p) => {
            const saving = actions.WITCH_SAVE === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChoose("WITCH_SAVE", saving ? null : p)}
                aria-pressed={saving}
                className={`mt-2 flex min-h-16 w-full items-center justify-between rounded-xl px-4 text-left transition-colors ${
                  saving ? "bg-moss/25 text-bone ring-1 ring-moss" : "border border-line text-bone active:bg-ink"
                }`}
              >
                <span className="text-lg font-medium">{saving ? `Đã cứu ${p.name}` : `Cứu ${p.name}`}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ash">{saving ? "Chạm để bỏ" : ""}</span>
              </button>
            );
          })
        )}
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
          Bình độc · {poisonUsed ? "đã dùng" : "còn 1 · chạm người muốn đầu độc"}
        </p>
        {!poisonUsed && (
          <div className="mt-2">
            <PlayerList
              players={players}
              showRoles
              selectedId={actions.WITCH_KILL}
              onSelect={(p) => onChoose("WITCH_KILL", actions.WITCH_KILL === p.id ? null : p)}
              selectFx="poison"
              disabledReason={(p) => (p.roleId === "WITCH" ? "Không tự đầu độc" : null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
