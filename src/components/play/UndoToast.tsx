"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Undo2 } from "lucide-react";

export const TOAST_MS = 3000;

export interface ToastData {
  /** Đổi mỗi lần chọn để reset đồng hồ 3 giây. */
  id: number;
  message: string;
}

interface Props {
  toast: ToastData | null;
  onUndo: () => void;
  onExpire: () => void;
}

export function UndoToast({ toast, onUndo, onExpire }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onExpire, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, onExpire]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-40 px-safe">
      <div className="mx-auto max-w-xl">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-2xl shadow-black/60"
            >
              <div className="flex min-h-16 items-center gap-3 pl-5">
                <p className="min-w-0 flex-1 text-base leading-snug text-bone">{toast.message}</p>
                <button
                  type="button"
                  onClick={onUndo}
                  className="flex h-16 shrink-0 items-center gap-2 px-5 font-mono text-xs uppercase tracking-[0.2em] text-blood active:text-bone"
                >
                  <Undo2 className="size-5" strokeWidth={2} />
                  Hoàn tác
                </button>
              </div>
              <motion.div
                aria-hidden
                className="absolute bottom-0 left-0 h-0.5 bg-blood"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: TOAST_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
