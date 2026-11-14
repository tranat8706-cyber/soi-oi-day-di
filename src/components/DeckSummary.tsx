"use client";

import { ROLE_ORDER as ORDER, ROLES } from "@/constants/roles";
import type { DeckCounts } from "@/utils/balancer";

/**
 * Bộ bài của ván dưới dạng các "chip". Đây là thông tin công khai: quản trò
 * đọc to cho cả bàn biết ván này có những vai gì.
 */
export function DeckSummary({ counts, label = "Ván này có", size = "md" }: { counts: DeckCounts; label?: string; size?: "sm" | "md" }) {
  const items = ORDER.filter((id) => counts[id] > 0);
  return (
    <div>
      {label && <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">{label}</p>}
      <ul className={`flex flex-wrap gap-2 ${label ? "mt-2" : ""}`}>
        {items.map((id) => (
          <li
            key={id}
            className={`flex items-center gap-2 rounded-full border ${
              ROLES[id].team === "WOLVES" ? "border-blood/60 bg-blood/10" : "border-line bg-ink-2"
            } ${size === "sm" ? "h-9 px-3" : "h-11 px-4"}`}
          >
            <span
              className={`font-display tabular-nums leading-none ${ROLES[id].team === "WOLVES" ? "text-blood" : "text-bone"} ${
                size === "sm" ? "text-lg" : "text-2xl"
              }`}
            >
              {counts[id]}
            </span>
            <span className={`${size === "sm" ? "text-sm" : "text-base"} text-bone/85`}>{ROLES[id].name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
