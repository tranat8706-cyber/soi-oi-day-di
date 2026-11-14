"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Moon } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { countRoles } from "@/utils/balancer";
import { DeckSummary } from "../DeckSummary";
import { RoleReveal } from "./RoleReveal";

const ease = [0.22, 1, 0.36, 1] as const;

export function PassAndPlayScreen() {
  const players = useGameStore((s) => s.players);
  const revealedIds = useGameStore((s) => s.revealedIds);
  const markRevealed = useGameStore((s) => s.markRevealed);
  const setGameState = useGameStore((s) => s.setGameState);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const setSetupStep = useGameStore((s) => s.setSetupStep);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);

  const seen = new Set(revealedIds);
  const seenCount = players.filter((p) => seen.has(p.id)).length;
  const remaining = players.length - seenCount;
  const allSeen = players.length > 0 && remaining === 0;
  const active = players.find((p) => p.id === activeId) ?? null;

  // Chưa ai xem bài thì quay lại luôn; có người xem rồi thì hỏi lại (bài sẽ chia lại từ đầu).
  const onAbortTap = () => {
    if (!confirmAbort && seenCount > 0) {
      setConfirmAbort(true);
      setTimeout(() => setConfirmAbort(false), 2500);
      return;
    }
    backToSetup();
    setSetupStep(2); // quay về đúng bước chọn bộ bài
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe">
      <header className="flex items-center justify-between px-safe pt-2">
        <button
          type="button"
          onClick={onAbortTap}
          className={`-ml-3 flex min-h-16 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
            confirmAbort ? "text-blood" : "text-bone active:text-ash"
          }`}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          {confirmAbort ? "Chạm lần nữa · chia lại từ đầu" : "Chọn lại vai"}
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">03 — Chuyền tay</p>
      </header>

      <main className="flex-1 px-safe pb-44">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mt-6 flex items-end justify-between gap-4"
        >
          <h1 className="font-display text-[clamp(4rem,20vw,8rem)] uppercase leading-[1.02] text-bone">
            Xem bài<span className="text-blood">.</span>
          </h1>
          <p className="pb-3 font-display text-4xl leading-none tabular-nums text-bone">
            {String(seenCount).padStart(2, "0")}
            <span className="text-ash/60">/{String(players.length).padStart(2, "0")}</span>
          </p>
        </motion.div>

        <div className="mt-4 h-px w-full bg-line">
          <motion.div
            className="h-px bg-blood"
            initial={false}
            animate={{ width: `${players.length ? (seenCount / players.length) * 100 : 0}%` }}
            transition={{ duration: 0.6, ease }}
          />
        </div>

        <p className="mt-4 max-w-[32ch] text-base leading-relaxed text-ash">
          Đưa máy cho từng người. Chạm vào tên mình, lật bài, nhớ kỹ rồi giấu đi.
        </p>

        <div className="mt-6">
          <DeckSummary counts={countRoles(players)} label="Đọc to cho cả bàn · ván này có" size="sm" />
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3">
          {players.map((p, i) => {
            const done = seen.has(p.id);
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease }}
              >
                <button
                  type="button"
                  disabled={done}
                  onClick={() => setActiveId(p.id)}
                  aria-label={done ? `${p.name}, đã xem bài` : `${p.name}, chạm để xem bài`}
                  className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border px-3 text-left transition-[opacity,border-color,transform] duration-500 ${
                    done
                      ? "border-transparent bg-transparent opacity-50"
                      : "border-line bg-ink-2 active:scale-[0.97] active:border-bone"
                  }`}
                >
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-line font-display text-lg uppercase text-bone">
                    {p.avatarBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarBase64} alt="" className="size-full object-cover grayscale" />
                    ) : (
                      p.name.slice(0, 1)
                    )}
                    {done && (
                      <span className="absolute inset-0 grid place-items-center bg-ink/70">
                        <Check className="size-6 text-bone" strokeWidth={2} />
                      </span>
                    )}
                  </span>
                  <span
                    className={`min-w-0 flex-1 break-words text-lg font-medium leading-tight text-bone ${
                      done ? "line-through decoration-ash/70 decoration-1" : ""
                    }`}
                  >
                    {p.name}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </main>

      {/* CTA cố định đáy */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <AnimatePresence mode="wait" initial={false}>
              {allSeen ? (
                <motion.button
                  key="night"
                  type="button"
                  onClick={() => setGameState("NIGHT")}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="flex h-20 w-full items-center justify-between rounded-2xl bg-blood px-6 text-bone"
                >
                  <span className="font-display text-3xl uppercase leading-none">Màn đêm buông xuống</span>
                  <Moon className="size-7" strokeWidth={2} />
                </motion.button>
              ) : (
                <motion.div
                  key="wait"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-line"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-ash">
                    Còn <span className="text-bone">{remaining}</span> người chưa xem
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <RoleReveal
            key={active.id}
            player={active}
            onCancel={() => setActiveId(null)}
            onDone={() => {
              markRevealed(active.id);
              setActiveId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
