"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGameStore, type TieRule } from "@/store/gameStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

type BoolRule = "witchSeesVictim" | "bodyguardSelfProtect" | "revealDeadRoles" | "elderVillageKill";

/** `def`: giá trị khi bản lưu cũ chưa có luật này. */
const RULES: { key: BoolRule; title: string; hint: string; def: boolean }[] = [
  {
    key: "witchSeesVictim",
    title: "Phù thủy thấy nạn nhân",
    hint: "Quản trò chỉ cho Phù thủy biết ai vừa bị Sói cắn. Tắt đi thì Phù thủy phải đoán mà cứu.",
    def: true,
  },
  {
    key: "bodyguardSelfProtect",
    title: "Bảo vệ tự che mình",
    hint: "Bảo vệ được phép chọn chính mình trong đêm.",
    def: true,
  },
  {
    key: "revealDeadRoles",
    title: "Lật bài người chết",
    hint: "Ai chết (đêm, bị treo, bị bắn) thì Quản trò công khai vai của họ cho cả bàn.",
    def: false,
  },
  {
    key: "elderVillageKill",
    title: "Già làng nghiêm khắc",
    hint: "Già làng chết vì phe Làng (bị treo, bị độc, bị Thợ săn bắn, bị cảm tử) thì cả làng mất phép. Tắt: chỉ khi bị treo.",
    def: false,
  },
];

const TIE_OPTIONS: { value: TieRule; label: string; hint: string }[] = [
  { value: "ROULETTE", label: "Quay", hint: "Vòng quay tử thần chọn ngẫu nhiên 1 người lên giàn." },
  { value: "REVOTE", label: "Bầu lại", hint: "Bầu lại chỉ giữa những người bằng phiếu. Vẫn hòa thì không treo." },
  { value: "NONE", label: "Không treo", hint: "Hòa phiếu thì hôm đó không treo ai, đi ngủ luôn." },
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
            className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[90dvh] max-w-xl flex-col rounded-t-[28px] border-t border-line bg-ink-2 px-safe pb-safe"
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

            <div className="mt-4 min-h-0 overflow-y-auto pb-6">
              <HouseRulesList />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Danh sách luật nhà (dùng trong bảng trượt và ở bước 3 của màn chuẩn bị). */
export function HouseRulesList() {
  const houseRules = useGameStore((s) => s.houseRules);
  const setHouseRule = useGameStore((s) => s.setHouseRule);
  const isSoundEnabled = useGameStore((s) => s.isSoundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  return (
    <div className="border-t border-line">
              {RULES.map((r) => {
                const on = houseRules[r.key] ?? r.def;
                return <Row key={r.key} title={r.title} hint={r.hint} on={on} onToggle={() => setHouseRule(r.key, !on)} />;
              })}
              <div className="border-b border-line py-4">
                <span className="block text-lg font-medium text-bone">Khi hòa phiếu</span>
                <div role="radiogroup" aria-label="Khi hòa phiếu" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-line p-1">
                  {TIE_OPTIONS.map((o) => {
                    const on = (houseRules.tieRule ?? "ROULETTE") === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setHouseRule("tieRule", o.value)}
                        className={`h-14 rounded-xl font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                          on ? "bg-bone text-ink" : "text-ash active:text-bone"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <span className="mt-2 block text-sm leading-snug text-ash">
                  {TIE_OPTIONS.find((o) => o.value === (houseRules.tieRule ?? "ROULETTE"))?.hint}
                </span>
              </div>
              <Row
                title="Âm thanh"
                hint="Tiếng chuông, tiếng tru khi chuyển ngày đêm."
                on={isSoundEnabled}
                onToggle={toggleSound}
              />
    </div>
  );
}
