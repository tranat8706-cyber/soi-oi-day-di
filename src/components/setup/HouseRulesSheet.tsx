"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGameStore, type HouseRules } from "@/store/gameStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RULES: { key: keyof HouseRules; title: string; hint: string }[] = [
  {
    key: "witchSeesVictim",
    title: "Phù thủy thấy nạn nhân",
    hint: "Quản trò cho Phù thủy biết ai vừa bị Sói cắn trước khi dùng bình.",
  },
  {
    key: "bodyguardSelfProtect",
    title: "Bảo vệ tự che mình",
    hint: "Bảo vệ được phép chọn chính mình trong đêm.",
  },
];

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
        on ? "border-blood bg-blood" : "border-line bg-ink-2"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 36 }}
        className={`absolute top-1 size-[22px] rounded-full bg-bone ${on ? "right-1" : "left-1"}`}
      />
    </span>
  );
}

function Row({ title, hint, on, onToggle }: { title: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-20 w-full items-center gap-5 border-b border-line py-4 text-left"
    >
      <span className="flex-1">
        <span className="block text-lg font-medium text-bone">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-ash">{hint}</span>
      </span>
      <Switch on={on} />
    </button>
  );
}

export function HouseRulesSheet({ open, onClose }: Props) {
  const houseRules = useGameStore((s) => s.houseRules);
  const setHouseRule = useGameStore((s) => s.setHouseRule);
  const isSoundEnabled = useGameStore((s) => s.isSoundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="house-rules-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl rounded-t-[28px] border-t border-line bg-ink-2 px-safe pb-safe"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Luật nhà</p>
                <h2 id="house-rules-title" className="font-display text-4xl uppercase leading-none text-bone">
                  Bàn này chơi sao?
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="-mr-4 grid size-16 place-items-center text-ash active:text-bone"
              >
                <X className="size-6" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 pb-6">
              {RULES.map((r) => (
                <Row
                  key={r.key}
                  title={r.title}
                  hint={r.hint}
                  on={houseRules[r.key]}
                  onToggle={() => setHouseRule(r.key, !houseRules[r.key])}
                />
              ))}
              <Row
                title="Âm thanh"
                hint="Tiếng chuông, tiếng tru khi chuyển ngày đêm."
                on={isSoundEnabled}
                onToggle={toggleSound}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
