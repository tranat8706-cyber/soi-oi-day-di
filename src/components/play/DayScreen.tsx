"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dices, Moon } from "lucide-react";
import { useGameStore, type Player } from "@/store/gameStore";
import { PlayerList } from "./PlayerList";
import { DeathRoulette } from "./DeathRoulette";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function DayScreen() {
  const players = useGameStore((s) => s.players);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const morningScript = useGameStore((s) => s.morningScript);
  const lastVictimId = useGameStore((s) => s.lastVictimId);
  const lynchedTodayId = useGameStore((s) => s.lynchedTodayId);
  const lynch = useGameStore((s) => s.lynch);
  const startNextNight = useGameStore((s) => s.startNextNight);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);
  const bloody = lastVictimId !== null;
  const lynched = players.find((p) => p.id === lynchedTodayId);

  const onAbortTap = () => {
    if (!confirmAbort) {
      setConfirmAbort(true);
      setTimeout(() => setConfirmAbort(false), 2500);
      return;
    }
    backToSetup();
  };

  // Chạm 2 lần mới treo, tránh lỡ tay.
  const onHang = (p: Player) => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    if (pendingId !== p.id) {
      setPendingId(p.id);
      pendingTimer.current = setTimeout(() => setPendingId(null), 2500);
      return;
    }
    setPendingId(null);
    lynch(p.id, "VOTE");
  };

  const onRouletteExecute = (p: Player) => {
    setRouletteOpen(false);
    lynch(p.id, "ROULETTE");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe"
    >
      <header className="flex items-center justify-between px-safe pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">05 — Ngày {pad(nightNumber)}</p>
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

      <main className="flex-1 px-safe pb-44">
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease }}
          className="mt-6 font-display text-[clamp(3rem,14vw,5.5rem)] uppercase leading-[1.02] text-ash"
        >
          Làng thức dậy<span className="text-blood">.</span>
        </motion.h1>

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
        </motion.section>

        <AnimatePresence mode="wait">
          {lynched ? (
            <motion.div
              key="lynched"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="mt-10 rounded-2xl border border-blood/50 bg-blood/10 px-5 py-5"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">Phán quyết hôm nay</p>
              <p className="mt-2 font-display text-4xl uppercase leading-none text-bone">{lynched.name} lên giá treo cổ</p>
              <p className="mt-3 text-sm text-ash">Mời {lynched.name} nói lời cuối. Mỗi ngày chỉ treo một người.</p>
            </motion.div>
          ) : (
            <motion.button
              key="tie"
              type="button"
              exit={{ opacity: 0, scale: 0.96 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRouletteOpen(true)}
              className="group relative mt-10 flex h-24 w-full items-center justify-between overflow-hidden rounded-2xl border-2 border-blood px-6 text-left"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-blood/15"
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative">
                <span className="block font-display text-4xl uppercase leading-none text-blood">Hòa phiếu</span>
                <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
                  Mở vòng quay tử thần
                </span>
              </span>
              <Dices className="relative size-9 text-blood" strokeWidth={1.75} />
            </motion.button>
          )}
        </AnimatePresence>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
              {lynched ? "Dân làng" : "Bỏ phiếu treo cổ"}
            </span>
            <span className="font-display text-4xl leading-none tabular-nums text-bone">
              {pad(alivePlayers.length)}
              <span className="text-ash/60">/{pad(players.length)}</span>
            </span>
          </div>
          <div className="mt-3 border-t border-line">
            <PlayerList
              players={players}
              freshDeadId={lastVictimId}
              deadNote={(p) => (p.id === lynchedTodayId ? "Bị treo cổ hôm nay" : null)}
              trailing={(p) =>
                !p.isAlive || lynched ? null : (
                  <button
                    type="button"
                    onClick={() => onHang(p)}
                    className={`-my-2 h-14 shrink-0 rounded-xl px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                      pendingId === p.id ? "bg-blood text-bone" : "border border-line text-bone active:bg-ink-2"
                    }`}
                  >
                    {pendingId === p.id ? "Chắc chưa?" : "Treo cổ"}
                  </button>
                )
              }
            />
          </div>
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <motion.button
              type="button"
              onClick={startNextNight}
              whileTap={{ scale: 0.97 }}
              className={`flex h-20 w-full items-center justify-between rounded-2xl px-6 transition-colors ${
                lynched ? "bg-blood text-bone" : "border border-line bg-ink text-bone"
              }`}
            >
              <span className="text-left">
                <span className="block font-display text-3xl uppercase leading-none">Màn đêm buông xuống</span>
                {!lynched && (
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                    Bỏ qua treo cổ hôm nay
                  </span>
                )}
              </span>
              <Moon className="size-7 shrink-0" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rouletteOpen && (
          <DeathRoulette
            players={alivePlayers}
            onClose={() => setRouletteOpen(false)}
            onExecute={onRouletteExecute}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
