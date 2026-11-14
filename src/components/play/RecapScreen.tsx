"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { getRole } from "@/constants/roles";
import { useGameStore, type Player } from "@/store/gameStore";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Lệch nhẹ cho mỗi tấm polaroid, cố định theo vị trí. */
const tilt = (i: number) => (((i * 37) % 7) - 3) * 0.9;

function cols(n: number) {
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

export function RecapScreen() {
  const players = useGameStore((s) => s.players);
  const winner = useGameStore((s) => s.winner);
  const sessionTitle = useGameStore((s) => s.sessionTitle);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const endReason = useGameStore((s) => s.endReason);
  const trollTitles = useGameStore((s) => s.trollTitles);
  const rematch = useGameStore((s) => s.rematch);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const [date] = useState(() =>
    new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
  );

  const wolfWin = winner === "WOLF";
  const accent = wolfWin ? "text-blood" : "text-moss";
  const n = cols(players.length);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center pt-safe">
      <p className="w-full px-safe pt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
        06 — Hạ màn · chụp màn hình để đăng Story
      </p>

      {/* Thẻ 9:16, mọi kích thước tính theo cqw để chụp ở máy nào cũng giống nhau */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease }}
        className="@container relative mt-3 aspect-9/16 w-[min(100%-2rem,calc((100dvh-15rem)*9/16))] overflow-hidden rounded-[3cqw] bg-ink"
        aria-label="Bảng tổng kết ván"
      >
        {/* Quầng màu phe thắng */}
        <motion.div
          aria-hidden
          className={`absolute -top-[25%] left-1/2 h-[70%] w-[140%] -translate-x-1/2 rounded-full blur-3xl ${
            wolfWin ? "bg-blood/40" : "bg-moss/30"
          }`}
          animate={{ opacity: [0.55, 1, 0.7, 0.95, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Nhiễu hạt + viền tối */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 opacity-[0.13] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.8)_100%)]"
        />

        <div className="relative z-10 flex h-full flex-col px-[6cqw] pb-[5cqw] pt-[7cqw]">
          <div className="flex items-center justify-between font-mono text-[2.6cqw] uppercase tracking-[0.25em] text-ash">
            <span>Sói ơi dậy đi!</span>
            <span>{date}</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, filter: "blur(12px)", letterSpacing: "0.2em" }}
            animate={{ opacity: [0, 1, 0.6, 1, 0.85, 1], filter: "blur(0px)", letterSpacing: "0em" }}
            transition={{ duration: 2.2, ease, times: [0, 0.35, 0.45, 0.6, 0.7, 1] }}
            className={`mt-[4cqw] pt-[0.1em] font-display text-[18cqw] uppercase leading-[1.02] ${accent}`}
          >
            {wolfWin ? (
              <>
                Sói
                <br />
                thắng.
              </>
            ) : (
              <>
                Làng
                <br />
                thắng.
              </>
            )}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-[3cqw]"
          >
            <p className="truncate pt-[0.12em] font-display text-[7cqw] uppercase leading-[1.15] text-bone">
              {sessionTitle.trim() || "Ván không tên"}
            </p>
            <p className="mt-[1.5cqw] line-clamp-2 text-[3.2cqw] leading-snug text-bone/60">
              {pad(nightNumber)} đêm · {endReason}
            </p>
          </motion.div>

          {/* Bức tường polaroid */}
          <div
            className="mt-[5cqw] grid min-h-0 flex-1 content-center gap-x-[3cqw] gap-y-[3.5cqw]"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {players.map((p, i) => (
              <Polaroid key={p.id} player={p} index={i} cols={n} title={trollTitles[p.id]} />
            ))}
          </div>
        </div>
      </motion.section>

      <div className="mt-5 w-full px-safe pb-safe">
        <motion.button
          type="button"
          onClick={rematch}
          whileTap={{ scale: 0.97 }}
          className="flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
        >
          <span className="font-display text-[clamp(1.4rem,6vw,1.9rem)] uppercase leading-none">Chơi ván mới với nhóm này</span>
          <RotateCcw className="size-7 shrink-0" strokeWidth={2} />
        </motion.button>
        <button
          type="button"
          onClick={backToSetup}
          className="mb-2 mt-1 min-h-16 w-full font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
        >
          Về màn chuẩn bị
        </button>
      </div>
    </div>
  );
}

function Polaroid({ player, index, cols, title }: { player: Player; index: number; cols: number; title?: string }) {
  const role = getRole(player.roleId);
  const dead = !player.isAlive;
  const isWolf = player.roleId === "WOLF";
  // cqw ở đây vẫn theo thẻ (container gần nhất), chia theo số cột.
  const unit = 1 / cols;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 20, rotate: tilt(index) * 3 }}
      animate={{ opacity: 1, y: 0, rotate: tilt(index) }}
      transition={{ delay: 1.2 + index * 0.12, duration: 0.9, ease }}
      className="relative bg-[#e9e3d6] shadow-[0_1.5cqw_4cqw_rgba(0,0,0,0.7)]"
      style={{ padding: `${4.5 * unit}cqw ${4.5 * unit}cqw 0` }}
    >
      <div className="relative aspect-square overflow-hidden bg-[#1a1a1c]">
        {/* "Tráng ảnh": từ trắng toát chìm dần vào ảnh mờ ảo */}
        <motion.div
          initial={{ filter: "brightness(3) blur(6px)" }}
          animate={{ filter: "brightness(1) blur(0.6px)" }}
          transition={{ delay: 1.4 + index * 0.12, duration: 2.4, ease: "easeOut" }}
          className="size-full"
        >
          {player.avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.avatarBase64}
              alt=""
              className="size-full object-cover contrast-125 grayscale sepia-[0.25]"
            />
          ) : (
            <span
              className="grid size-full place-items-center font-display uppercase text-bone/80"
              style={{ fontSize: `${38 * unit}cqw` }}
            >
              {player.name.slice(0, 1)}
            </span>
          )}
        </motion.div>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_35%,rgba(0,0,0,0.65)_100%)]" />
        {dead && (
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full"
            aria-label="Đã chết"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 0.92, scale: 1 }}
            transition={{ delay: 2.2 + index * 0.12, duration: 0.35, ease: "backOut" }}
          >
            <path d="M14 16 L86 84 M86 14 L16 86" stroke="#c3161c" strokeWidth="11" strokeLinecap="round" />
          </motion.svg>
        )}
      </div>
      <figcaption className="text-center text-ink" style={{ padding: `${2.5 * unit}cqw 0 ${4 * unit}cqw` }}>
        <span className="block truncate pt-[0.12em] font-display uppercase leading-[1.1]" style={{ fontSize: `${11 * unit}cqw` }}>
          {player.name}
        </span>
        <span
          className={`mt-[0.4cqw] block truncate font-mono uppercase tracking-wider ${isWolf ? "text-blood" : "text-ink/60"}`}
          style={{ fontSize: `${6.4 * unit}cqw` }}
        >
          {role?.name ?? "?"}
        </span>
        {title && (
          <span className="block truncate italic leading-tight text-ink/80" style={{ fontSize: `${7.4 * unit}cqw` }}>
            “{title}”
          </span>
        )}
      </figcaption>
    </motion.figure>
  );
}
