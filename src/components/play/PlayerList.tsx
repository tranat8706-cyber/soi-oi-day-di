"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bomb, Check, Eye, FlaskConical, Heart, House, PawPrint, Shield, Skull, Sparkles, type LucideIcon } from "lucide-react";
import type { Player } from "@/store/gameStore";
import { getRole } from "@/constants/roles";

/** Hiệu ứng "dấu ấn" khi chọn một người trong đêm. */
export type SelectFx = "claw" | "shield" | "eye" | "heart" | "potion" | "poison" | "bomb" | "home" | "nose" | "star";

const STAMP: Record<Exclude<SelectFx, "claw">, { icon: LucideIcon; color: string }> = {
  shield: { icon: Shield, color: "#93c5fd" },
  eye: { icon: Eye, color: "#ece7dd" },
  heart: { icon: Heart, color: "#d94a8c" },
  potion: { icon: FlaskConical, color: "#4f9d74" },
  poison: { icon: Skull, color: "#a855f7" },
  bomb: { icon: Bomb, color: "#f59e0b" },
  home: { icon: House, color: "#f472b6" },
  nose: { icon: PawPrint, color: "#fb923c" },
  star: { icon: Sparkles, color: "#facc15" },
};

/** Vết cào (Sói) hoặc con dấu biểu tượng vai, chạy lại mỗi lần chọn. */
function SelectMark({ fx }: { fx: SelectFx }) {
  if (fx === "claw")
    return (
      <svg aria-hidden viewBox="0 0 200 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        {[0, 1, 2].map((k) => (
          <motion.path
            key={k}
            d={`M${40 + k * 34} 6 Q ${62 + k * 34} 30 ${84 + k * 34} 54`}
            stroke="#c3161c"
            strokeWidth={5 - k * 0.5}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 1, 0.75] }}
            transition={{ delay: k * 0.07, duration: 0.28, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 4px rgba(195,22,28,0.8))" }}
          />
        ))}
      </svg>
    );
  const { icon: Icon, color } = STAMP[fx];
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2"
      initial={{ scale: 2.4, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 0.9, rotate: -12 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
    >
      <Icon className="size-9" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} strokeWidth={2} />
    </motion.span>
  );
}

interface Props {
  players: Player[];
  /** Có thì mỗi dòng (còn sống) thành nút chọn. */
  onSelect?: (player: Player) => void;
  selectedId?: string | null;
  /** Chọn nhiều người cùng lúc (ví dụ: những người bằng phiếu). */
  selectedIds?: string[];
  /** Lý do không chọn được (hiện dưới tên), hoặc null nếu chọn được. */
  disabledReason?: (player: Player) => string | null;
  /** Hiện tên vai cạnh mỗi người (màn của quản trò). */
  showRoles?: boolean;
  /** Đánh dấu người vừa chết đêm qua. */
  freshDeadIds?: string[];
  /** Ghi chú riêng cho người đã chết (ưu tiên hơn freshDeadIds). */
  deadNote?: (player: Player) => string | null;
  trailing?: (player: Player) => ReactNode;
  /** Hiệu ứng khi chọn (vết cào cho Sói, khiên cho Bảo vệ…). */
  selectFx?: SelectFx;
}

/**
 * Danh sách người chơi dùng chung. Người chết KHÔNG bị xoá: mờ, xám, gạch ngang
 * và chìm xuống cuối danh sách (giữ thứ tự ngồi trong từng nhóm).
 */
export function PlayerList({
  players,
  onSelect,
  selectedId,
  selectedIds,
  disabledReason,
  showRoles,
  freshDeadIds,
  deadNote,
  trailing,
  selectFx,
}: Props) {
  const sorted = [...players.filter((p) => p.isAlive), ...players.filter((p) => !p.isAlive)];
  const firstDeadIndex = sorted.findIndex((p) => !p.isAlive);

  return (
    <ul className="flex flex-col">
      {sorted.map((p, i) => {
        const dead = !p.isAlive;
        const reason = dead ? null : (disabledReason?.(p) ?? null);
        const selected = !dead && (selectedId === p.id || !!selectedIds?.includes(p.id));
        const selectable = !!onSelect && !dead && !reason;
        const role = showRoles ? getRole(p.roleId) : null;
        const note = dead ? (deadNote?.(p) ?? (freshDeadIds?.includes(p.id) ? "Chết đêm qua" : null)) : null;

        const body = (
          <>
            <span
              className={`relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full font-display text-lg uppercase ${
                selected ? "bg-blood text-bone" : "bg-line text-bone"
              }`}
            >
              {p.avatarBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarBase64} alt="" className="size-full object-cover grayscale" />
              ) : (
                p.name.slice(0, 1)
              )}
              {dead && (
                <span className="absolute inset-0 grid place-items-center bg-ink/70">
                  <Skull className="size-5 text-neutral-400" strokeWidth={1.5} />
                </span>
              )}
              {selected && p.avatarBase64 && (
                <span className="absolute inset-0 grid place-items-center bg-blood/70">
                  <Check className="size-6 text-bone" strokeWidth={2.5} />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block break-words text-lg font-medium leading-tight ${
                  dead ? "text-neutral-500 line-through decoration-1" : "text-bone"
                }`}
              >
                {p.name}
              </span>
              {role && (
                <span
                  className={`mt-1 inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[13px] font-semibold leading-tight ${
                    dead
                      ? "bg-line text-neutral-400"
                      : role.team === "WOLVES"
                        ? "bg-blood text-bone"
                        : "bg-bone/90 text-ink"
                  }`}
                >
                  <span className="truncate">
                    {role.name}
                    {p.formerRoleId && ` · từng là ${getRole(p.formerRoleId)?.name ?? "?"}`}
                  </span>
                </span>
              )}
              {(reason || note) && (
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">{note ?? reason}</span>
              )}
            </span>
            {trailing?.(p)}
            {selected && !p.avatarBase64 && <Check className="size-6 shrink-0 text-blood" strokeWidth={2.5} />}
            {selected && selectFx && <SelectMark key={`${p.id}-${selectFx}`} fx={selectFx} />}
          </>
        );

        const rowClass = `relative flex min-h-16 w-full items-center gap-3 py-2 text-left ${
          dead ? "opacity-30" : reason && onSelect ? "opacity-45" : ""
        }`;

        return (
          <motion.li
            key={p.id}
            layout
            transition={{ layout: { type: "spring", stiffness: 380, damping: 36 } }}
            className={i === firstDeadIndex ? "mt-4 border-t border-dashed border-line pt-2" : "border-t border-line/60 first:border-t-0"}
          >
            {i === firstDeadIndex && (
              <p className="pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                Nghĩa trang · {sorted.length - firstDeadIndex}
              </p>
            )}
            {onSelect ? (
              <button
                type="button"
                disabled={!selectable}
                aria-pressed={selected}
                onClick={() => onSelect(p)}
                className={`${rowClass} -mx-3 w-[calc(100%+1.5rem)] rounded-xl px-3 transition-colors ${
                  selected ? "bg-blood/15" : selectable ? "active:bg-ink-2" : ""
                }`}
              >
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
