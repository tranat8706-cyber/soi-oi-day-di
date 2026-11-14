"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Skull, X } from "lucide-react";
import type { Player } from "@/store/gameStore";

const TICKS = 30;
const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

interface Props {
  players: Player[]; // những người còn sống
  onClose: () => void;
  onExecute: (player: Player) => void;
}

type Phase = "pick" | "spinning" | "locked";

/**
 * Vòng quay tử thần: chạy tên nhanh rồi chậm dần (ease-out bậc 3), chốt vào
 * kết quả đã random từ trước. Quản trò có thể bỏ bớt người không bị hòa phiếu.
 */
export function DeathRoulette({ players, onClose, onExecute }: Props) {
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [phase, setPhase] = useState<Phase>("pick");
  const [cursor, setCursor] = useState(0);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = players.filter((p) => !excluded.has(p.id));
  const current = phase === "pick" ? null : pool[cursor];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toggle = (id: string) => {
    if (phase !== "pick") return;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const spin = () => {
    if (pool.length < 2) return;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const winnerIdx = buf[0] % pool.length;
    // Điểm xuất phát sao cho sau TICKS bước dừng đúng winnerIdx.
    const start = (((winnerIdx - TICKS) % pool.length) + pool.length) % pool.length;
    setPhase("spinning");
    setCursor(start);

    const step = (k: number) => {
      if (k > TICKS) {
        setPhase("locked");
        vibrate([90, 50, 220]);
        return;
      }
      const t = k / TICKS;
      const delay = 45 + 560 * t * t * t;
      timer.current = setTimeout(() => {
        setCursor((c) => (c + 1) % pool.length);
        setTick(k);
        vibrate(k > TICKS - 6 ? 18 : 6);
        step(k + 1);
      }, delay);
    };
    step(1);
  };

  const slowing = phase === "spinning" && tick > TICKS - 8;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Vòng quay tử thần"
    >
      {/* Chớp đỏ khi chốt */}
      <AnimatePresence>
        {phase === "locked" && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 bg-blood"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]"
      />

      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col overflow-hidden pt-safe">
        <header className="flex items-center justify-between px-safe pt-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-blood">Hòa phiếu</p>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "spinning"}
            aria-label="Đóng"
            className="-mr-3 grid size-16 place-items-center text-ash active:text-bone disabled:opacity-20"
          >
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </header>

        {/* Khe tên */}
        <div className="px-safe">
          <h2 className="font-display text-5xl uppercase leading-none text-bone">
            Vòng quay
            <br />
            tử thần<span className="text-blood">.</span>
          </h2>

          <motion.div
            animate={phase === "locked" ? { x: [0, -14, 12, -8, 6, -3, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative mt-6 flex h-36 items-center justify-center overflow-hidden rounded-2xl border transition-colors duration-300 ${
              phase === "locked" ? "border-blood bg-blood/15" : "border-line bg-ink-2"
            }`}
          >
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-blood/30" />
            <AnimatePresence mode="popLayout" initial={false}>
              {current ? (
                <motion.p
                  key={`${current.id}-${tick}`}
                  initial={{ y: slowing ? 40 : 60, opacity: 0, filter: slowing ? "blur(0px)" : "blur(6px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: slowing ? -40 : -60, opacity: 0 }}
                  transition={{ duration: phase === "locked" ? 0.3 : slowing ? 0.18 : 0.06 }}
                  className={`max-w-full truncate px-4 pt-[0.15em] font-display uppercase leading-[1.15] ${
                    phase === "locked" ? "text-6xl text-blood" : "text-5xl text-bone"
                  }`}
                  aria-live={phase === "locked" ? "assertive" : "off"}
                >
                  {current.name}
                </motion.p>
              ) : (
                <motion.p key="idle" className="font-mono text-xs uppercase tracking-[0.25em] text-ash">
                  {pool.length} người trên bàn cân
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <p className="mt-3 h-5 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
            {phase === "pick" && "Chạm để loại người không bị hòa phiếu"}
            {phase === "spinning" && (slowing ? "Chậm dần…" : "Tử thần đang chọn…")}
            {phase === "locked" && <span className="text-blood">Tử thần đã chọn</span>}
          </p>
        </div>

        {/* Danh sách ứng viên */}
        <ul className="mt-4 flex-1 overflow-y-auto px-safe pb-40">
          {players.map((p) => {
            const out = excluded.has(p.id);
            const hot = current?.id === p.id;
            return (
              <li key={p.id} className="border-t border-line/60 first:border-t-0">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={phase !== "pick"}
                  aria-pressed={!out}
                  className={`flex min-h-16 w-full items-center gap-3 text-left transition-[opacity,color] duration-100 ${
                    out ? "opacity-25" : ""
                  }`}
                >
                  <span
                    className={`grid size-10 place-items-center rounded-full font-display text-lg uppercase transition-colors duration-75 ${
                      hot ? (phase === "locked" ? "bg-blood text-bone" : "bg-bone text-ink") : "bg-line text-bone"
                    }`}
                  >
                    {hot && phase === "locked" ? <Skull className="size-5" strokeWidth={1.75} /> : p.name.slice(0, 1)}
                  </span>
                  <span
                    className={`flex-1 text-lg font-medium ${out ? "text-neutral-500 line-through" : hot ? "text-bone" : "text-bone/70"}`}
                  >
                    {p.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
          <div className="pointer-events-auto px-safe pb-safe">
            <div className="pb-4">
              {phase === "locked" && current ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onExecute(current)}
                  className="flex h-20 w-full items-center justify-between rounded-2xl bg-blood px-6 text-bone"
                >
                  <span className="truncate pt-[0.12em] font-display text-3xl uppercase leading-[1.15]">Thi hành · {current.name}</span>
                  <Skull className="size-7 shrink-0" strokeWidth={2} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={spin}
                  disabled={phase !== "pick" || pool.length < 2}
                  className="flex h-20 w-full items-center justify-center rounded-2xl bg-bone font-display text-4xl uppercase leading-none text-ink disabled:opacity-30"
                >
                  {phase === "spinning" ? "…" : pool.length < 2 ? "Cần ít nhất 2 người" : "Quay!"}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
