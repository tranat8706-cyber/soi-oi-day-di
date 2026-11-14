"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Dices, Gavel, Moon, Skull, Timer } from "lucide-react";
import Image from "next/image";
import { getRole } from "@/constants/roles";
import { elderPunishOf, useGameStore, type Player } from "@/store/gameStore";
import { countRoles } from "@/utils/balancer";
import { DeckSummary } from "../DeckSummary";
import { PlayerList } from "./PlayerList";
import { DeathRoulette } from "./DeathRoulette";
import { RoleReviewButton } from "./RoleReviewSheet";
import { StepBack } from "./StepBack";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const DEFENSE_SECONDS = 60;

/**
 * Ban ngày, theo đúng nhịp chơi ngoài đời:
 *  1. Bỏ phiếu: chạm người nhiều phiếu nhất (hoặc nhiều người nếu bằng phiếu).
 *  2. Lên giàn: người bị tố bào chữa, rồi cả làng biểu quyết TREO hay THA.
 *  3. Phán quyết: treo thì nói lời cuối; tha thì có thể tố người khác.
 */
export function DayScreen() {
  const players = useGameStore((s) => s.players);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const morningScript = useGameStore((s) => s.morningScript);
  const lastVictimIds = useGameStore((s) => s.lastVictimIds);
  const pendingHunterId = useGameStore((s) => s.pendingHunterId);
  const hunterShotId = useGameStore((s) => s.hunterShotId);
  const hunterShoot = useGameStore((s) => s.hunterShoot);
  const dayDeaths = useGameStore((s) => s.dayDeaths);
  const idiotRevealedId = useGameStore((s) => s.idiotRevealedId);
  const villagePowersLost = useGameStore((s) => s.villagePowersLost);
  const lynchedTodayId = useGameStore((s) => s.lynchedTodayId);
  const accusedId = useGameStore((s) => s.accusedId);
  const accusedVia = useGameStore((s) => s.accusedVia);
  const sparedTodayIds = useGameStore((s) => s.sparedTodayIds);
  const accuse = useGameStore((s) => s.accuse);
  const cancelTrial = useGameStore((s) => s.cancelTrial);
  const spare = useGameStore((s) => s.spare);
  const lynch = useGameStore((s) => s.lynch);
  const startNextNight = useGameStore((s) => s.startNextNight);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const houseRules = useGameStore((s) => s.houseRules);
  const tieRule = houseRules.tieRule ?? "ROULETTE";
  const revealRoles = houseRules.revealDeadRoles === true;

  const [confirmAbort, setConfirmAbort] = useState(false);
  const [confirmHang, setConfirmHang] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  /** Vòng bầu lại giữa những người bằng phiếu (luật nhà "Bầu lại"). */
  const [revote, setRevote] = useState<string[] | null>(null);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const hangTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);
  const bloody = lastVictimIds.length > 0;
  const lynched = players.find((p) => p.id === lynchedTodayId);
  const accused = players.find((p) => p.id === accusedId);
  const hunter = players.find((p) => p.id === pendingHunterId);
  const shot = players.find((p) => p.id === hunterShotId);
  const spared = players.filter((p) => sparedTodayIds.includes(p.id));
  const pickedPlayers = alivePlayers.filter((p) => picked.includes(p.id));
  const phase = hunter ? "hunter" : lynched ? "verdict" : accused ? "trial" : "vote";
  const DEATH_NOTE: Partial<Record<string, string>> = {
    LYNCH: "Bị treo cổ hôm nay",
    SHOT: "Bị Thợ săn bắn",
    HEARTBREAK: "Chết theo người yêu",
  };
  const roleName = (p: Player) => getRole(p.formerRoleId ?? p.roleId)?.name ?? "?";
  const deadNote = (p: Player) => {
    const cause = dayDeaths.find((d) => d.id === p.id)?.cause;
    const note = cause ? (DEATH_NOTE[cause] ?? null) : lastVictimIds.includes(p.id) ? "Chết đêm qua" : null;
    // Luật nhà lật bài: hiện vai thật (lá bài gốc) của người đã chết.
    return revealRoles ? [roleName(p), note].filter(Boolean).join(" · ") : note;
  };
  const nightVictims = players.filter((p) => lastVictimIds.includes(p.id));
  // Voters: người còn sống, trừ Thằng ngố đã lật bài.
  const voters = alivePlayers.filter((p) => p.id !== idiotRevealedId).length;
  const elderPunished =
    villagePowersLost &&
    elderPunishOf(houseRules) === "ANY" &&
    players.some((p) => p.roleId === "ELDER" && (lastVictimIds.includes(p.id) || p.id === hunterShotId));
  const heartbroken = players.filter((p) => dayDeaths.some((d) => d.id === p.id && d.cause === "HEARTBREAK"));
  const idiotSaved = lynched?.isAlive && lynched.id === idiotRevealedId;
  const idiotBadge = (p: Player) =>
    p.isAlive && p.id === idiotRevealedId ? (
      <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ash">
        Ngố · không bầu
      </span>
    ) : null;

  useEffect(() => () => {
    if (hangTimer.current) clearTimeout(hangTimer.current);
  }, []);

  const onAbortTap = () => {
    if (!confirmAbort) {
      setConfirmAbort(true);
      setTimeout(() => setConfirmAbort(false), 2500);
      return;
    }
    backToSetup();
  };

  const togglePick = (p: Player) =>
    setPicked((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]));

  const putOnTrial = (p: Player, via: "VOTE" | "ROULETTE") => {
    setRouletteOpen(false);
    setPicked([]);
    setRevote(null);
    accuse(p.id, via);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Chạm 2 lần mới treo, tránh lỡ tay.
  const onHang = () => {
    if (hangTimer.current) clearTimeout(hangTimer.current);
    if (!confirmHang) {
      setConfirmHang(true);
      hangTimer.current = setTimeout(() => setConfirmHang(false), 2500);
      return;
    }
    setConfirmHang(false);
    try {
      navigator.vibrate?.([120, 60, 260]);
    } catch {}
    lynch();
  };

  const onSpare = () => {
    setConfirmHang(false);
    spare();
  };

  const deck = countRoles(players);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe"
    >
      <header className="flex items-center justify-between px-safe pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">05 — Ngày {pad(nightNumber)}</p>
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

      <main className="flex-1 px-safe pb-48">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "hunter" && hunter ? (
            <HunterPanel
              key={`hunter-${hunter.id}`}
              hunter={hunter}
              players={players}
              lynched={hunter.id === lynchedTodayId}
              onShoot={hunterShoot}
            />
          ) : phase === "trial" && accused ? (
            <TrialPanel
              key={`trial-${accused.id}`}
              accused={accused}
              viaRoulette={accusedVia === "ROULETTE"}
              voters={voters}
              idiotMuted={!!idiotRevealedId && alivePlayers.some((p) => p.id === idiotRevealedId)}
              onCancel={cancelTrial}
            />
          ) : (
            <motion.div key="day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="relative -mx-5 mt-2 overflow-hidden px-5 pb-2 pt-24">
                <motion.div
                  aria-hidden
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  transition={{ duration: 2.4, ease }}
                >
                  <Image src="/art/day.jpg" alt="" fill priority sizes="(max-width: 640px) 100vw, 640px" className="object-cover object-[50%_30%]" />
                  <div className="absolute inset-0 bg-linear-to-b from-ink/0 via-ink/40 to-ink" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1, ease }}
                  className="relative pt-[0.1em] font-display text-[clamp(3rem,14vw,5.5rem)] uppercase leading-[1.18] text-bone"
                >
                  Làng thức dậy<span className="text-blood">.</span>
                </motion.h1>
              </div>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease }}
                className="mt-6"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Quản trò đọc to</p>
                <blockquote
                  className={`mt-3 border-l-4 pl-5 text-[clamp(1.75rem,7.5vw,2.5rem)] font-medium leading-[1.25] text-bone ${
                    bloody ? "border-blood" : "border-bone/40"
                  }`}
                >
                  “{morningScript}”
                </blockquote>
                {revealRoles && nightVictims.length > 0 && (
                  <p className="mt-4 text-lg leading-snug text-bone/85">
                    Lật bài: {nightVictims.map((p) => `${p.name} là ${roleName(p)}`).join(", ")}.
                  </p>
                )}
                {elderPunished && (
                  <p className="mt-4 rounded-xl bg-blood/20 px-3 py-2 text-sm leading-snug text-bone">
                    Già làng đã chết dưới tay phe Làng. Trời phạt: mọi vai có phép bên phe Làng mất phép từ đêm nay.
                  </p>
                )}
              </motion.section>

              {shot && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 rounded-2xl border border-blood/50 bg-blood/10 px-5 py-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">Phát súng của Thợ săn</p>
                  <p className="mt-2 text-xl font-medium leading-snug text-bone">
                    {shot.name} đã bị bắn chết{revealRoles && ` · là ${roleName(shot)}`}.
                  </p>
                </motion.div>
              )}

              {phase === "verdict" && idiotSaved && lynched && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="mt-10 rounded-2xl border border-bone/40 bg-ink-2 px-5 py-6"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Phán quyết hôm nay · bất ngờ</p>
                  <p className="mt-3 pt-[0.1em] font-display text-[clamp(2.5rem,11vw,3.5rem)] uppercase leading-[1.18] text-bone">
                    {lynched.name} là Thằng ngố!
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-bone/75">
                    Mời {lynched.name} lật bài. Làng tha vì biết là ngố, nhưng từ giờ {lynched.name} không được bỏ phiếu. Bị treo lần nữa
                    thì chết thật.
                  </p>
                </motion.div>
              )}

              {phase === "verdict" && lynched && !idiotSaved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="mt-10 overflow-hidden rounded-2xl border border-blood/60 bg-blood/10 px-5 py-6"
                >
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-blood">
                    <Skull className="size-4" strokeWidth={1.75} /> Phán quyết hôm nay
                  </p>
                  <p className="mt-3 pt-[0.1em] font-display text-[clamp(2.5rem,11vw,3.5rem)] uppercase leading-[1.18] text-bone">
                    {lynched.name} đã bị treo cổ
                  </p>
                  {revealRoles && (
                    <p className="mt-3 font-display text-2xl uppercase leading-tight text-blood">Lật bài: {roleName(lynched)}</p>
                  )}
                  <p className="mt-3 text-base leading-relaxed text-bone/75">
                    Mời {lynched.name} nói lời cuối rồi rời bàn. Từ giờ {lynched.name} im lặng, không được gợi ý cho ai.
                  </p>
                  {lynched.roleId === "ELDER" && villagePowersLost && (
                    <p className="mt-3 rounded-xl bg-blood/20 px-3 py-2 text-sm leading-snug text-bone">
                      {lynched.name} là Già làng! Trời phạt: mọi vai có phép bên phe Làng mất phép từ đêm nay.
                    </p>
                  )}
                </motion.div>
              )}

              {heartbroken.length > 0 && (
                <p className="mt-4 rounded-2xl border border-line px-4 py-3 text-base leading-snug text-bone/85">
                  ♥ {heartbroken.map((p) => p.name).join(", ")} chết theo người mình yêu.
                </p>
              )}

              {phase === "vote" && (
                <section className="mt-12">
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Bỏ phiếu treo cổ</span>
                    <span className="font-display text-4xl leading-none tabular-nums text-bone">
                      {pad(alivePlayers.length)}
                      <span className="text-ash/60">/{pad(players.length)}</span>
                    </span>
                  </div>

                  <ol className="mt-4 space-y-2 rounded-2xl border border-line bg-ink-2 px-4 py-4 text-[15px] leading-snug text-bone/85">
                    <li>
                      <span className="font-mono text-ash">1.</span> Cả làng bàn bạc, ai nghi ai thì nói.
                    </li>
                    <li>
                      <span className="font-mono text-ash">2.</span> Đếm “1, 2, 3”, mọi người cùng chỉ tay vào người mình nghi.
                    </li>
                    <li>
                      <span className="font-mono text-ash">3.</span> Chạm vào <span className="text-bone">người nhiều phiếu nhất</span>. Bằng phiếu
                      thì chạm hết những người bằng nhau.
                    </li>
                  </ol>

                  {revote && (
                    <div className="mt-4 rounded-2xl border border-blood/50 bg-blood/10 px-4 py-3 text-[15px] leading-snug text-bone">
                      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">Bầu lại</p>
                      <p className="mt-1">
                        Chỉ bầu giữa{" "}
                        <span className="font-semibold">
                          {players
                            .filter((p) => revote.includes(p.id))
                            .map((p) => p.name)
                            .join(", ")}
                        </span>
                        . Vẫn hòa thì hôm nay không treo ai.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRevote(null);
                          setPicked([]);
                        }}
                        className="mt-1 min-h-12 font-mono text-[10px] uppercase tracking-[0.2em] text-ash active:text-bone"
                      >
                        Bỏ vòng bầu lại
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {spared.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 text-sm leading-snug text-ash"
                      >
                        <span className="text-bone">{spared.map((p) => p.name).join(", ")}</span> đã được tha. Làng có thể tố người khác,
                        hoặc đi ngủ.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 border-t border-line">
                    <PlayerList
                      players={players}
                      freshDeadIds={lastVictimIds}
                      deadNote={deadNote}
                      trailing={idiotBadge}
                      selectedIds={picked}
                      onSelect={togglePick}
                      disabledReason={(p) =>
                        sparedTodayIds.includes(p.id)
                          ? "Đã được tha hôm nay"
                          : revote && !revote.includes(p.id)
                            ? "Không trong vòng bầu lại"
                            : null
                      }
                    />
                  </div>
                </section>
              )}

              {phase === "verdict" && (
                <div className="mt-10">
                  <PlayerList
                    players={players}
                    freshDeadIds={lastVictimIds}
                    deadNote={deadNote}
                    trailing={idiotBadge}
                  />
                </div>
              )}

              <div className="mt-10 border-t border-line pt-6">
                <DeckSummary counts={deck} label="Bộ bài ván này" size="sm" />
              </div>
              <div className="mt-6">
                <RoleReviewButton />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Thanh hành động đáy: đổi theo từng bước */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "hunter" ? null : phase === "trial" ? (
                <motion.div
                  key="trial"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="grid grid-cols-[1fr_1.4fr] gap-3"
                >
                  <motion.button
                    type="button"
                    onClick={onSpare}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-20 flex-col items-center justify-center rounded-2xl border border-bone/40 text-bone"
                  >
                    <span className="font-display text-3xl uppercase leading-none">Tha</span>
                    <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ash">Đa số tha</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={onHang}
                    whileTap={{ scale: 0.97 }}
                    animate={confirmHang ? { x: [0, -5, 5, -3, 0] } : { x: 0 }}
                    className={`flex h-20 flex-col items-center justify-center rounded-2xl transition-colors ${
                      confirmHang ? "bg-blood text-bone" : "bg-bone text-ink"
                    }`}
                  >
                    <span className="font-display text-3xl uppercase leading-none">{confirmHang ? "Chắc chưa?" : "Treo cổ"}</span>
                    <span className={`mt-1 font-mono text-[9px] uppercase tracking-[0.18em] ${confirmHang ? "text-bone/80" : "text-ink/60"}`}>
                      {confirmHang ? "Chạm lần nữa" : "Đa số treo"}
                    </span>
                  </motion.button>
                </motion.div>
              ) : phase === "vote" && pickedPlayers.length === 1 ? (
                <motion.button
                  key="accuse"
                  type="button"
                  onClick={() => putOnTrial(pickedPlayers[0], "VOTE")}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
                >
                  <span className="min-w-0 text-left">
                    <span className="block truncate pt-[0.12em] font-display text-3xl uppercase leading-[1.1]">
                      Đưa {pickedPlayers[0].name} lên giàn
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">Để bào chữa trước khi xử</span>
                  </span>
                  <Gavel className="size-7 shrink-0" strokeWidth={2} />
                </motion.button>
              ) : phase === "vote" && pickedPlayers.length > 1 && (tieRule === "NONE" || revote) ? (
                <motion.button
                  key="tie-none"
                  type="button"
                  onClick={startNextNight}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-20 w-full items-center justify-between rounded-2xl border border-bone/40 bg-ink px-6 text-bone"
                >
                  <span className="text-left">
                    <span className="block font-display text-3xl uppercase leading-none">{revote ? "Vẫn hòa" : "Hòa phiếu"}</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                      Không treo ai · màn đêm buông xuống
                    </span>
                  </span>
                  <Moon className="size-7 shrink-0" strokeWidth={2} />
                </motion.button>
              ) : phase === "vote" && pickedPlayers.length > 1 && tieRule === "REVOTE" ? (
                <motion.button
                  key="tie-revote"
                  type="button"
                  onClick={() => {
                    setRevote(picked);
                    setPicked([]);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-20 w-full items-center justify-between rounded-2xl bg-blood px-6 text-bone"
                >
                  <span className="text-left">
                    <span className="block font-display text-3xl uppercase leading-none">Hòa phiếu · Bầu lại</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bone/80">
                      Chỉ giữa {pickedPlayers.length} người bằng phiếu
                    </span>
                  </span>
                  <Gavel className="size-7 shrink-0" strokeWidth={2} />
                </motion.button>
              ) : phase === "vote" && pickedPlayers.length > 1 ? (
                <motion.button
                  key="tie"
                  type="button"
                  onClick={() => setRouletteOpen(true)}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex h-20 w-full items-center justify-between overflow-hidden rounded-2xl bg-blood px-6 text-bone"
                >
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 bg-black/25"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="relative text-left">
                    <span className="block font-display text-3xl uppercase leading-none">Hòa phiếu · Quay!</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bone/80">
                      {pickedPlayers.length} người bằng phiếu
                    </span>
                  </span>
                  <Dices className="relative size-8 shrink-0" strokeWidth={1.75} />
                </motion.button>
              ) : (
                <motion.button
                  key="night"
                  type="button"
                  onClick={startNextNight}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex h-20 w-full items-center justify-between rounded-2xl px-6 transition-colors ${
                    lynched ? "bg-blood text-bone" : "border border-line bg-ink text-bone"
                  }`}
                >
                  <span className="text-left">
                    <span className="block whitespace-nowrap font-display text-[clamp(1.4rem,7vw,1.875rem)] uppercase leading-none">
                      Màn đêm buông xuống
                    </span>
                    {!lynched && (
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                        Hôm nay không treo ai
                      </span>
                    )}
                  </span>
                  <Moon className="size-7 shrink-0" strokeWidth={2} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rouletteOpen && pickedPlayers.length > 1 && (
          <DeathRoulette players={pickedPlayers} onClose={() => setRouletteOpen(false)} onPicked={(p) => putOnTrial(p, "ROULETTE")} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Thợ săn vừa chết: chọn một người để bắn theo (hoặc không bắn). */
function HunterPanel({
  hunter,
  players,
  lynched,
  onShoot,
}: {
  hunter: Player;
  players: Player[];
  lynched: boolean;
  onShoot: (targetId: string | null) => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const target = players.find((p) => p.id === targetId);

  const fire = () => {
    if (!target) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      navigator.vibrate?.([60, 40, 400]);
    } catch {}
    onShoot(target.id);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease }}
      className="mt-6"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-blood">
        {lynched ? "Vừa bị treo cổ" : "Đã chết đêm qua"} · Thợ săn
      </p>
      <h1 className="mt-4 pt-[0.1em] font-display text-[clamp(3rem,15vw,5.5rem)] uppercase leading-[1.18] text-bone">
        Phát súng
        <br />
        cuối<span className="text-blood">.</span>
      </h1>

      <div className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Quản trò đọc to</p>
        <blockquote className="mt-3 border-l-4 border-blood pl-5 text-[clamp(1.5rem,6.5vw,2.1rem)] font-medium leading-[1.3] text-bone">
          “{hunter.name} là Thợ săn. Trước khi gục xuống, {hunter.name} được bắn chết một người. Hãy chỉ tay.”
        </blockquote>
      </div>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Thợ săn chỉ vào ai?</p>
      <div className="mt-2 border-t border-line">
        <PlayerList
          players={players.filter((p) => p.isAlive)}
          selectedId={targetId}
          onSelect={(p) => {
            setTargetId(p.id);
            setArmed(false);
          }}
        />
      </div>

      <div className="mt-6 space-y-2">
        <motion.button
          type="button"
          onClick={fire}
          disabled={!target}
          whileTap={{ scale: 0.97 }}
          animate={armed ? { x: [0, -5, 5, -3, 0] } : { x: 0 }}
          className={`flex h-20 w-full items-center justify-between rounded-2xl px-6 transition-colors disabled:opacity-30 ${
            armed ? "bg-blood text-bone" : "bg-bone text-ink"
          }`}
        >
          <span className="truncate pt-[0.12em] font-display text-3xl uppercase leading-[1.1]">
            {!target ? "Chọn người để bắn" : armed ? "Chắc chưa? Chạm lần nữa" : `Bắn ${target.name}`}
          </span>
          <Crosshair className="size-7 shrink-0" strokeWidth={2} />
        </motion.button>
        <button
          type="button"
          onClick={() => onShoot(null)}
          className="min-h-16 w-full font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
        >
          Thợ săn không bắn ai
        </button>
      </div>
    </motion.section>
  );
}

/** Màn "lên giàn": người bị tố bào chữa, có đồng hồ tùy chọn. */
function TrialPanel({
  accused,
  viaRoulette,
  voters,
  idiotMuted,
  onCancel,
}: {
  accused: Player;
  viaRoulette: boolean;
  /** Số người được bỏ phiếu (đã trừ Thằng ngố lật bài). */
  voters: number;
  idiotMuted: boolean;
  onCancel: () => void;
}) {
  const need = Math.floor(voters / 2) + 1;
  const [deadline, setDeadline] = useState<number | null>(null);
  const [left, setLeft] = useState(DEFENSE_SECONDS);

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(id);
        try {
          navigator.vibrate?.([300, 120, 300]);
        } catch {}
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const startTimer = () => {
    setLeft(DEFENSE_SECONDS);
    setDeadline(Date.now() + DEFENSE_SECONDS * 1000);
  };

  const running = deadline !== null && left > 0;
  const over = deadline !== null && left === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease }}
      className="mt-2"
    >
      <div className="relative -mx-5 h-44 overflow-hidden">
        <Image src="/art/gallows.jpg" alt="" fill priority sizes="(max-width: 640px) 100vw, 640px" className="object-cover object-[50%_40%] opacity-80" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/0 via-ink/30 to-ink" />
      </div>
      <p className="relative -mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-blood">
        {viaRoulette ? "Vòng quay tử thần đã gọi tên" : "Bị đưa lên giàn"}
      </p>

      <div className="mt-6 flex items-center gap-5">
        <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-blood bg-line font-display text-4xl uppercase text-bone">
          {accused.avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={accused.avatarBase64} alt="" className="size-full object-cover grayscale" />
          ) : (
            accused.name.slice(0, 1)
          )}
        </span>
        <h1 className="min-w-0 break-words pt-[0.1em] font-display text-[clamp(3rem,15vw,5.5rem)] uppercase leading-[1.18] text-bone">
          {accused.name}
        </h1>
      </div>

      <div className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Quản trò đọc to</p>
        <blockquote className="mt-3 border-l-4 border-blood pl-5 text-[clamp(1.5rem,6.5vw,2.1rem)] font-medium leading-[1.3] text-bone">
          “{accused.name}, bạn có {DEFENSE_SECONDS} giây để bào chữa. Sau đó cả làng giơ tay: treo hay tha.”
        </blockquote>
      </div>

      {/* Đồng hồ bào chữa */}
      <button
        type="button"
        onClick={startTimer}
        className={`mt-8 flex h-24 w-full items-center justify-between rounded-2xl border px-6 transition-colors ${
          over ? "border-blood bg-blood/15" : running ? "border-bone/40 bg-ink-2" : "border-line"
        }`}
      >
        <span className="text-left">
          <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
            {over ? "Hết giờ · chạm để bấm lại" : running ? "Đang bào chữa" : "Bấm giờ bào chữa"}
          </span>
          <span className={`block font-display text-5xl tabular-nums leading-none ${over ? "text-blood" : "text-bone"}`}>
            0:{pad(running || over ? left : DEFENSE_SECONDS)}
          </span>
        </span>
        <Timer className={`size-8 ${running ? "animate-pulse text-bone" : "text-ash"}`} strokeWidth={1.5} />
      </button>

      <div className="mt-8 rounded-2xl border border-line bg-ink-2 px-4 py-4 text-[15px] leading-snug text-bone/85">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Biểu quyết lần cuối</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl leading-none tabular-nums text-bone">{need}</span>
          <span className="text-ash">/ {voters} phiếu là treo</span>
        </p>
        <p className="mt-2">
          Hỏi cả làng: <span className="text-bone">“Ai đồng ý treo?”</span> Từ {need} người giơ tay trở lên thì chạm{" "}
          <span className="font-semibold text-bone">Treo cổ</span>, không thì chạm <span className="font-semibold text-bone">Tha</span>.
          {idiotMuted && " Thằng ngố đã lật bài không được giơ tay."}
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 min-h-16 w-full font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
      >
        Nhầm người? Quay lại bỏ phiếu
      </button>
    </motion.section>
  );
}
