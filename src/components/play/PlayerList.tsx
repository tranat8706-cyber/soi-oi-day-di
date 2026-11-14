"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Skull } from "lucide-react";
import type { Player } from "@/store/gameStore";
import { getRole } from "@/constants/roles";

interface Props {
  players: Player[];
  /** Có thì mỗi dòng (còn sống) thành nút chọn. */
  onSelect?: (player: Player) => void;
  selectedId?: string | null;
  /** Lý do không chọn được (hiện dưới tên), hoặc null nếu chọn được. */
  disabledReason?: (player: Player) => string | null;
  /** Hiện tên vai cạnh mỗi người (màn của quản trò). */
  showRoles?: boolean;
  /** Đánh dấu người vừa chết đêm qua. */
  freshDeadId?: string | null;
  /** Ghi chú riêng cho người đã chết (ưu tiên hơn freshDeadId). */
  deadNote?: (player: Player) => string | null;
  trailing?: (player: Player) => ReactNode;
}

/**
 * Danh sách người chơi dùng chung. Người chết KHÔNG bị xoá: mờ, xám, gạch ngang
 * và chìm xuống cuối danh sách (giữ thứ tự ngồi trong từng nhóm).
 */
export function PlayerList({
  players,
  onSelect,
  selectedId,
  disabledReason,
  showRoles,
  freshDeadId,
  deadNote,
  trailing,
}: Props) {
  const sorted = [...players.filter((p) => p.isAlive), ...players.filter((p) => !p.isAlive)];
  const firstDeadIndex = sorted.findIndex((p) => !p.isAlive);

  return (
    <ul className="flex flex-col">
      {sorted.map((p, i) => {
        const dead = !p.isAlive;
        const reason = dead ? null : (disabledReason?.(p) ?? null);
        const selected = !dead && selectedId === p.id;
        const selectable = !!onSelect && !dead && !reason;
        const role = showRoles ? getRole(p.roleId) : null;
        const note = dead ? (deadNote?.(p) ?? (freshDeadId === p.id ? "Chết đêm qua" : null)) : null;

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
              {(role || reason || note) && (
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                  {role && (
                    <span className={role.id === "WOLF" && !dead ? "text-blood" : undefined}>{role.name}</span>
                  )}
                  {role && (reason || note) && " · "}
                  {note ?? reason}
                </span>
              )}
            </span>
            {trailing?.(p)}
            {selected && !p.avatarBase64 && <Check className="size-6 shrink-0 text-blood" strokeWidth={2.5} />}
          </>
        );

        const rowClass = `flex min-h-16 w-full items-center gap-3 py-2 text-left ${
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
