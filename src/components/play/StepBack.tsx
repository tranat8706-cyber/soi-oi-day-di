"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

/**
 * Nút "Lùi" trên đầu màn: hoàn tác bước lớn gần nhất (gọi làng dậy, treo, tha, bắn, sang đêm).
 * Hỏi lại một lần, kèm tên bước sẽ bị hủy, để không lỡ tay.
 */
export function StepBack() {
  const last = useGameStore((s) => s.undoStack.at(-1));
  const stepBack = useGameStore((s) => s.stepBack);
  const [open, setOpen] = useState(false);

  if (!last) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
      >
        <Undo2 className="size-4" strokeWidth={1.75} />
        Lùi
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
              aria-label="Lùi lại một bước"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl rounded-t-[28px] border-t border-line bg-ink-2 px-safe pb-safe"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Lỡ tay? Lùi lại một bước</p>
              <p className="mt-3 pt-[0.1em] font-display text-[clamp(2rem,9vw,2.75rem)] uppercase leading-[1.18] text-bone">
                Hủy “{last.label}”
              </p>
              <p className="mt-2 text-sm leading-snug text-ash">
                Ván quay về đúng lúc trước bước này. Có thể lùi tiếp nhiều bước nếu cần.
              </p>
              <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-3 pb-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-16 rounded-2xl border border-line font-mono text-xs uppercase tracking-[0.2em] text-bone active:bg-ink"
                >
                  Thôi
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setOpen(false);
                    stepBack();
                    window.scrollTo({ top: 0 });
                  }}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-bone text-ink"
                >
                  <Undo2 className="size-5" strokeWidth={2} />
                  <span className="font-display text-2xl uppercase leading-none">Lùi lại</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
