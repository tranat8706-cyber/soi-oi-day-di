"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, EyeOff, Sun } from "lucide-react";
import { NIGHT_SEQUENCE, type Role } from "@/constants/roles";
import { useGameStore, type NightRoleId, type Player } from "@/store/gameStore";
import { PlayerList } from "./PlayerList";
import { UndoToast, type ToastData } from "./UndoToast";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

const VERB: Record<NightRoleId, string> = { WOLF: "Sói cắn", SEER: "Tiên tri soi", GUARD: "Bảo vệ che" };

export function NightScreen() {
  const players = useGameStore((s) => s.players);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const nightActions = useGameStore((s) => s.nightActions);
  const lastGuardTargetId = useGameStore((s) => s.lastGuardTargetId);
  const guardSelf = useGameStore((s) => s.houseRules.bodyguardSelfProtect);
  const setNightAction = useGameStore((s) => s.setNightAction);
  const undoLastNightAction = useGameStore((s) => s.undoLastNightAction);
  const resolveNight = useGameStore((s) => s.resolveNight);
  const backToSetup = useGameStore((s) => s.backToSetup);

  // Chỉ những vai có trong ván này, theo nightOrder.
  const steps = NIGHT_SEQUENCE.filter((r) => players.some((p) => p.roleId === r.id));
  const nameOf = (id: string | undefined) => players.find((p) => p.id === id)?.name;

  const [openId, setOpenId] = useState<string | null>(
    () => steps.find((r) => !nightActions[r.id as NightRoleId])?.id ?? null,
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

  const choose = (roleId: NightRoleId, target: Player) => {
    if (nightActions[roleId] === target.id) return;
    setNightAction(roleId, target.id);
    setConfirmWake(false);
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message: `${VERB[roleId]} ${target.name}.` });
  };

  const undo = () => {
    const undone = undoLastNightAction();
    setToast(null);
    if (undone) setOpenId(undone.roleId);
  };

  const wolvesAlive = players.some((p) => p.isAlive && p.roleId === "WOLF");
  const missingBite = wolvesAlive && !nightActions.WOLF;

  const onWake = () => {
    if (missingBite && !confirmWake) {
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

  const disabledReason = (role: Role) => (p: Player) => {
    if (role.id === "WOLF" && p.roleId === "WOLF") return "Đồng bọn";
    if (role.id === "SEER" && p.roleId === "SEER") return "Không tự soi";
    if (role.id === "GUARD") {
      if (p.id === lastGuardTargetId) return "Đã che đêm trước";
      if (!guardSelf && p.roleId === "GUARD") return "Không tự che";
    }
    return null;
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
        <button
          type="button"
          onClick={onAbortTap}
          className={`-mr-3 min-h-16 px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
            confirmAbort ? "text-blood" : "text-ash active:text-bone"
          }`}
        >
          {confirmAbort ? "Chạm lần nữa để hủy" : "Hủy ván"}
        </button>
      </header>

      <main className="flex-1 px-safe pb-48">
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease }}
          className="mt-6 font-display text-[clamp(4rem,20vw,8rem)] uppercase leading-[1.02] text-bone"
        >
          Đêm buông
          <br />
          xuống<span className="text-blood">.</span>
        </motion.h1>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-blood/40 bg-blood/10 px-4 py-3">
          <EyeOff className="size-5 shrink-0 text-blood" strokeWidth={1.75} />
          <p className="text-sm leading-snug text-bone/90">
            Chỉ <span className="font-semibold text-bone">Quản trò</span> được nhìn màn hình. Cả làng nhắm mắt.
          </p>
        </div>

        <ol className="mt-8 flex flex-col gap-3">
          {steps.map((role, idx) => {
            const rid = role.id as NightRoleId;
            const open = openId === role.id;
            const targetId = nightActions[rid];
            const holders = players.filter((p) => p.roleId === role.id);
            const allDead = holders.every((p) => !p.isAlive);
            const next = steps[idx + 1];
            const seerTarget = rid === "SEER" ? players.find((p) => p.id === targetId) : undefined;

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
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm tabular-nums ${
                      targetId || allDead ? "bg-bone text-ink" : "border border-line text-ash"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-display text-3xl uppercase leading-none ${allDead ? "text-neutral-500 line-through" : "text-bone"}`}>
                      {role.name}
                    </span>
                    <span className="mt-1.5 block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                      {allDead
                        ? "Đã chết · vẫn gọi để giữ bí mật"
                        : targetId
                          ? `${VERB[rid]} · ${nameOf(targetId)}`
                          : `${holders.filter((p) => p.isAlive).length} người · chưa chọn`}
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
                        <p className="border-l-2 border-blood pl-4 text-xl leading-relaxed text-bone">
                          “{role.gmInstruction}”
                        </p>

                        {allDead ? (
                          <p className="mt-5 text-sm leading-relaxed text-ash">
                            Không còn ai giữ vai này. Vẫn đọc lời gọi, chờ vài giây rồi qua bước tiếp, để không ai đoán được vai đã chết.
                          </p>
                        ) : (
                          <>
                            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
                              Chọn mục tiêu
                            </p>
                            <div className="mt-2">
                              <PlayerList
                                players={players}
                                showRoles
                                selectedId={targetId}
                                onSelect={(p) => choose(rid, p)}
                                disabledReason={disabledReason(role)}
                              />
                            </div>
                          </>
                        )}

                        <AnimatePresence mode="wait">
                          {seerTarget && (
                            <motion.div
                              key={seerTarget.id}
                              initial={{ opacity: 0, scale: 0.94 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25, ease }}
                              className={`mt-5 rounded-2xl px-5 py-6 text-center ${
                                seerTarget.roleId === "WOLF" ? "bg-blood text-bone" : "border border-bone/40 text-bone"
                              }`}
                              aria-live="assertive"
                            >
                              <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-80">
                                {seerTarget.name}
                              </p>
                              <p className="mt-2 font-display text-5xl uppercase leading-none">
                                {seerTarget.roleId === "WOLF" ? "Là Sói" : "Không phải Sói"}
                              </p>
                              <p className="mt-3 text-sm opacity-80">
                                {seerTarget.roleId === "WOLF" ? "Gật đầu với Tiên tri." : "Lắc đầu với Tiên tri."}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={() => setOpenId(next?.id ?? null)}
                          className="mt-5 flex h-16 w-full items-center justify-center rounded-xl border border-line font-mono text-xs uppercase tracking-[0.2em] text-bone active:bg-ink"
                        >
                          {next ? `Xong · gọi ${next.name}` : "Xong · thu gọn"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      </main>

      <UndoToast toast={toast} onUndo={undo} onExpire={hideToast} />

      {/* CTA cố định đáy */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <motion.button
              type="button"
              onClick={onWake}
              whileTap={{ scale: 0.97 }}
              className={`flex h-20 w-full items-center justify-between rounded-2xl px-6 transition-colors ${
                confirmWake ? "bg-blood text-bone" : "bg-bone text-ink"
              }`}
            >
              <span className="text-left">
                <span className="block font-display text-3xl uppercase leading-none">Gọi làng dậy</span>
                {confirmWake && (
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em]">
                    Sói chưa cắn ai · chạm lần nữa
                  </span>
                )}
              </span>
              <Sun className="size-7" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
