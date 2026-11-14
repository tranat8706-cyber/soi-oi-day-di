"use client";

import { motion } from "framer-motion";
import { balanceVerdict, type DeckCounts } from "@/utils/balancer";

const ease = [0.22, 1, 0.36, 1] as const;

/** Thanh so sức Làng – Sói theo bộ bài, kèm lời nhận xét ngắn. */
export function BalanceMeter({ counts }: { counts: DeckCounts }) {
  const v = balanceVerdict(counts);
  const village = Math.round(v.village * 100);
  const label =
    v.level === "even"
      ? "Cân bằng"
      : v.level === "leaning"
        ? v.favored === "VILLAGE"
          ? "Làng nhỉnh hơn"
          : "Sói nhỉnh hơn"
        : v.favored === "VILLAGE"
          ? "Làng quá mạnh"
          : "Sói quá mạnh";

  return (
    <div className="rounded-2xl border border-line px-4 py-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
        <span className="text-moss">Làng {village}%</span>
        <span className={v.level === "lopsided" ? "text-blood" : "text-bone"}>{label}</span>
        <span className="text-blood">Sói {100 - village}%</span>
      </div>
      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-blood/70">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-moss"
          initial={false}
          animate={{ width: `${village}%` }}
          transition={{ duration: 0.5, ease }}
        />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-ink/70" />
      </div>
      <p className="mt-2 text-xs leading-snug text-ash">Khả năng thắng ước tính theo sức mạnh từng vai, chỉ để tham khảo.</p>
    </div>
  );
}
