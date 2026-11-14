"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { useGameStore, type Player } from "@/store/gameStore";
import { PlayerList } from "./PlayerList";
import { RoleReveal } from "./RoleReveal";

/**
 * Ai quên bài thì xem lại: quản trò chọn tên, đưa máy cho đúng người, người đó tự lật.
 * Người bị hóa Sói giữa ván cũng xem được vai hiện tại của mình.
 */
export function RoleReviewButton() {
  const players = useGameStore((s) => s.players);
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<Player | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border border-line font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
      >
        <Eye className="size-4" strokeWidth={1.75} />
        Ai quên bài? Xem lại
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Xem lại bài"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[85dvh] max-w-xl flex-col rounded-t-[28px] border-t border-line bg-ink-2 px-safe pb-safe"
            >
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line" />
              <div className="flex shrink-0 items-center justify-between pt-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Xem lại bài</p>
                  <h2 className="font-display text-4xl uppercase leading-none text-bone">Ai quên bài?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                  className="-mr-4 grid size-16 place-items-center text-ash active:text-bone"
                >
                  <X className="size-6" strokeWidth={1.5} />
                </button>
              </div>
              <p className="mt-2 shrink-0 text-sm leading-snug text-ash">
                Chạm tên, rồi đưa máy cho đúng người đó. Những người khác quay mặt đi.
              </p>
              <div className="mt-3 min-h-0 overflow-y-auto pb-6">
                <PlayerList
                  players={players.filter((p) => p.isAlive)}
                  onSelect={(p) => {
                    setOpen(false);
                    setViewer(p);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewer && <RoleReveal key={viewer.id} player={viewer} onCancel={() => setViewer(null)} onDone={() => setViewer(null)} />}
      </AnimatePresence>
    </>
  );
}
