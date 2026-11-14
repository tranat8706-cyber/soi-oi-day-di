"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EyeOff, MoonStar } from "lucide-react";
import type { Player } from "@/store/gameStore";
import { useGameStore } from "@/store/gameStore";
import { getRole } from "@/constants/roles";
import { playThud } from "@/utils/audio";

const ease = [0.22, 1, 0.36, 1] as const;
const BLOOD_FLASH = "#991B1B";
/** Khoá nút giấu bài một nhịp sau khi lật, tránh chạm đúp lật xong giấu luôn. */
const HIDE_LOCK_MS = 700;

interface Props {
  player: Player;
  onCancel: () => void;
  onDone: () => void;
}

export function RoleReveal({ player, onCancel, onDone }: Props) {
  const role = getRole(player.roleId);
  const isWolf = role?.id === "WOLF";
  const isSoundEnabled = useGameStore((s) => s.isSoundEnabled);
  const reduceMotion = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [canHide, setCanHide] = useState(false);

  useEffect(() => {
    if (!flipped) return;
    const t = setTimeout(() => setCanHide(true), HIDE_LOCK_MS);
    return () => clearTimeout(t);
  }, [flipped]);

  // Khoá cuộn trang nền khi bài đang mở.
  useEffect(() => {
    // Không lưu giá trị cũ: hai overlay chồng nhau lúc exit sẽ khôi phục nhầm "hidden".
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !flipped && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, onCancel]);

  const flip = () => {
    if (flipped) return;
    // Rung + âm thanh phải chạy đồng bộ trong cử chỉ chạm.
    if (isWolf) {
      navigator.vibrate?.([200, 100, 200]);
      if (isSoundEnabled) playThud();
    }
    setFlipped(true);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Bài của ${player.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="fixed inset-0 z-50 overflow-hidden bg-ink"
    >
      {/* Chớp đỏ giật cục: bật gắt, tắt, bật lại, rồi tắt hẳn. */}
      {flipped && isWolf && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ backgroundColor: BLOOD_FLASH }}
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0.1, 0.85, 0.85, 0] }}
          transition={{ duration: 0.55, times: [0, 0.12, 0.2, 0.28, 0.45, 1], ease: "linear" }}
        />
      )}
      {/* Dư âm đỏ mờ còn đọng lại sau cú chớp. */}
      {flipped && isWolf && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(90%_60%_at_50%_35%,rgba(153,27,27,0.35),transparent_70%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.2 }}
        />
      )}

      <motion.div
        className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col overflow-y-auto px-safe pt-safe pb-safe"
        animate={
          flipped && isWolf && !reduceMotion
            ? { x: [0, -16, 14, -10, 8, -4, 0], y: [0, 6, -4, 3, 0, 0, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.42, ease: "linear" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!flipped ? (
            <motion.section
              key="cover"
              exit={isWolf ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              className="flex flex-1 flex-col"
            >
              <div className="pt-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Bài của</p>
                <h2 className="mt-4 break-words font-display text-[clamp(3.5rem,18vw,7rem)] uppercase leading-[1.02] text-bone">
                  {player.name}
                </h2>
                <p className="mt-3 max-w-[30ch] text-ash">
                  Chỉ <span className="text-bone">{player.name}</span> được nhìn. Những người khác, quay mặt đi.
                </p>
              </div>

              <button
                type="button"
                onClick={flip}
                aria-label="Lật bài"
                className="group relative my-8 grid min-h-64 flex-1 place-items-center overflow-hidden rounded-3xl border border-line bg-ink-2 transition-transform active:scale-[0.98]"
              >
                <div aria-hidden className="absolute inset-3 rounded-2xl border border-dashed border-line" />
                <div className="flex flex-col items-center gap-4 text-ash">
                  <MoonStar className="size-12 text-bone/70" strokeWidth={1} />
                  <span className="font-mono text-xs uppercase tracking-[0.3em]">Chạm để lật bài</span>
                </div>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="mb-4 h-16 font-mono text-xs uppercase tracking-[0.2em] text-ash active:text-bone"
              >
                Không phải tôi
              </button>
            </motion.section>
          ) : (
            <motion.section
              key="face"
              initial={isWolf ? { opacity: 1, scale: 1.08 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              transition={isWolf ? { duration: 0.25, ease: "easeOut" } : { duration: 0.9, ease }}
              className="flex flex-1 flex-col"
            >
              <div className="flex-1 pt-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                  {player.name} · {role?.team === "WOLVES" ? "Phe Sói" : "Phe Dân"}
                </p>
                <h2
                  className={`mt-5 font-display uppercase leading-[1.02] text-[clamp(5rem,28vw,11rem)] ${
                    isWolf ? "text-blood" : "text-bone"
                  }`}
                >
                  {role?.name ?? "???"}
                </h2>
                <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-bone/85">
                  {role?.description ?? "Không tìm thấy vai. Báo quản trò chia lại."}
                </p>
              </div>

              <motion.button
                type="button"
                onClick={onDone}
                disabled={!canHide}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: canHide ? 1 : 0.3, y: 0 }}
                transition={{ duration: 0.4 }}
                whileTap={{ scale: 0.97 }}
                className="mb-4 flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
              >
                <span className="font-display text-3xl uppercase leading-none">Đã hiểu, giấu bài</span>
                <EyeOff className="size-7" strokeWidth={2} />
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
