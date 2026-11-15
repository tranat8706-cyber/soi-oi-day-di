"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { RotateCcw, Settings2, ThumbsDown, ThumbsUp } from "lucide-react";
import { getRole } from "@/constants/roles";
import { useGameStore, type Player, type Winner } from "@/store/gameStore";
import { StepBack } from "./StepBack";
import { FolkAvatar, avatarSeedOf } from "@/components/FolkAvatar";
import { ShareStory } from "./ShareStory";
import { useArt } from "@/hooks/useArt";
import type { ArtName } from "@/constants/themes";
import { awards, verdict, type LogEntry } from "@/utils/gameLog";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Chữ, màu và quầng sáng theo phe thắng. */
const WIN_LOOK: Record<Winner, { top: string; text: string; glow: string; size: string; art: ArtName }> = {
  WOLF: { top: "Sói", text: "text-blood", glow: "bg-blood/40", size: "text-[18cqw]", art: "win-wolf" },
  // Làng thắng = bình minh: chữ vàng nắng chuyển cam, hợp với ảnh nền thay vì màu xanh lá phẳng.
  VILLAGER: {
    top: "Làng",
    text: "bg-linear-to-b from-[#fff1c9] via-[#f5c15a] to-[#e0832f] bg-clip-text text-transparent drop-shadow-[0_0_2cqw_rgba(245,193,90,0.45)]",
    glow: "bg-[#f5c15a]/30",
    size: "text-[18cqw]",
    art: "win-village",
  },
  LOVERS: { top: "Cặp đôi", text: "text-rose", glow: "bg-rose/35", size: "text-[15cqw]", art: "win-lovers" },
  WHITE_WOLF: { top: "Sói trắng", text: "text-bone", glow: "bg-bone/20", size: "text-[14cqw]", art: "win-white-wolf" },
};

/** Màu chủ đạo của ảnh Story theo phe thắng. */
const STORY_ACCENT: Record<Winner, string> = { WOLF: "#e2464b", VILLAGER: "#f5c15a", LOVERS: "#e968a5", WHITE_WOLF: "#ece7dd" };

/** Lệch nhẹ cho mỗi tấm polaroid, cố định theo vị trí. */
const tilt = (i: number) => (((i * 37) % 7) - 3) * 0.9;

function cols(n: number) {
  // Đủ nhỏ để bức tường ảnh không đè lên tên ván.
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 12) return 4;
  return 5;
}

export function RecapScreen() {
  const { art } = useArt();
  const players = useGameStore((s) => s.players);
  const winner = useGameStore((s) => s.winner);
  const sessionTitle = useGameStore((s) => s.sessionTitle);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const endReason = useGameStore((s) => s.endReason);
  const trollTitles = useGameStore((s) => s.trollTitles);
  const rematch = useGameStore((s) => s.rematch);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const setOnboarded = useGameStore((s) => s.setOnboarded);
  const [date] = useState(() =>
    new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
  );

  const loverIds = useGameStore((s) => s.loverIds);
  const look = WIN_LOOK[winner ?? "VILLAGER"];
  const accent = look.text;
  const n = cols(players.length);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center pt-safe">
      <div className="flex w-full items-center justify-between px-safe">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">06 — Hạ màn · chụp để đăng Story</p>
        <span className="-mr-3">
          <StepBack />
        </span>
      </div>

      {/* Thẻ 9:16, mọi kích thước tính theo cqw để chụp ở máy nào cũng giống nhau */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease }}
        className="@container relative mt-3 aspect-9/16 w-[min(100%-2rem,calc((100dvh-15rem)*9/16))] overflow-hidden rounded-[3cqw] bg-ink"
        aria-label="Bảng tổng kết ván"
      >
        {/* Ảnh phe thắng ở nửa trên, chìm dần vào nền */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[52%]"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ duration: 2.4, ease }}
        >
          <Image src={art(look.art)} alt="" fill priority sizes="(max-width: 640px) 100vw, 600px" className="object-cover object-top" />
          <div className="absolute inset-0 bg-linear-to-b from-ink/20 via-ink/50 to-ink" />
        </motion.div>
        {/* Quầng màu phe thắng */}
        <motion.div
          aria-hidden
          className={`absolute -top-[25%] left-1/2 h-[70%] w-[140%] -translate-x-1/2 rounded-full blur-3xl mix-blend-screen ${look.glow}`}
          animate={{ opacity: [0.25, 0.5, 0.3, 0.45, 0.25] }}
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
            className={`mt-[4cqw] pt-[0.1em] font-display uppercase leading-[1.18] ${accent} ${look.size}`}
          >
            {look.top}
            <br />
            thắng.
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
              <Polaroid key={p.id} player={p} index={i} cols={n} title={trollTitles[p.id]} lover={loverIds.includes(p.id)} />
            ))}
          </div>
        </div>
      </motion.section>

      <GameDiary players={players} winner={winner} nights={nightNumber} />

      <div className="mt-10 w-full px-safe">
        <ShareStory
          data={() => {
            const log = useGameStore.getState().gameLog;
            const { best, worst } = awards(log);
            const nm = (id?: string) => players.find((p) => p.id === id)?.name ?? "?";
            return {
              winnerLabel: look.top,
              accent: STORY_ACCENT[winner ?? "VILLAGER"],
              artSrc: art(look.art),
              title: sessionTitle.trim(),
              date,
              nights: nightNumber,
              players: players.map((p) => ({ ...p, lover: loverIds.includes(p.id) })),
              log,
              best: best && { name: nm(best[0]), count: best[1] },
              worst: worst && { name: nm(worst[0]), count: worst[1] },
            };
          }}
        />
      </div>


      <div className="mt-8 w-full px-safe pb-safe">
        <motion.button
          type="button"
          onClick={rematch}
          whileTap={{ scale: 0.97 }}
          className="flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
        >
          <span className="font-display text-[clamp(1.4rem,6vw,1.9rem)] uppercase leading-[1.08]">Chơi ván mới với nhóm này</span>
          <RotateCcw className="size-7 shrink-0" strokeWidth={2} />
        </motion.button>
        <motion.button
          type="button"
          onClick={() => {
            setOnboarded(false);
            backToSetup();
          }}
          whileTap={{ scale: 0.97 }}
          className="mb-4 mt-3 flex h-20 w-full items-center justify-between rounded-2xl border-2 border-bone/40 px-6 text-bone active:bg-ink-2"
        >
          <span className="text-left">
            <span className="block pt-[0.1em] font-display text-[clamp(1.4rem,6vw,1.9rem)] uppercase leading-[1.08]">Set up lại từ đầu</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">Đổi số người, tên, trình độ</span>
          </span>
          <Settings2 className="size-7 shrink-0" strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}

function Polaroid({
  player,
  index,
  cols,
  title,
  lover,
}: {
  player: Player;
  index: number;
  cols: number;
  title?: string;
  lover?: boolean;
}) {
  const role = getRole(player.roleId);
  const former = getRole(player.formerRoleId);
  const dead = !player.isAlive;
  const isWolf = role?.team === "WOLVES";
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
            <FolkAvatar seed={avatarSeedOf(player)} className="sepia-[0.15]" />
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
          {lover && "♥ "}
          {former ? `${former.name} → ${role?.name}` : (role?.name ?? "?")}
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

/** Phân tích ván: sự kiện chính từng chặng (hệ thống tự chấm like / unlike), rồi nhận xét tổng ván. */
function GameDiary({ players, winner, nights }: { players: Player[]; winner: Winner | null; nights: number }) {
  const log = useGameStore((s) => s.gameLog);
  if (!log.length) return null;
  const { best, worst } = awards(log);
  const v = verdict(log, winner, nights);
  const nameOf = (id?: string) => players.find((p) => p.id === id)?.name;
  // Gom theo từng chặng: Đêm 1, Ngày 1, Đêm 2…
  const chapters: { key: string; title: string; items: LogEntry[] }[] = [];
  for (const e of log) {
    const key = `${e.phase}-${e.round}`;
    let ch = chapters.at(-1);
    if (!ch || ch.key !== key) {
      ch = { key, title: `${e.phase === "NIGHT" ? "Đêm" : "Ngày"} ${e.round}`, items: [] };
      chapters.push(ch);
    }
    ch.items.push(e);
  }

  return (
    <section className="mt-10 w-full px-safe" aria-label="Phân tích ván">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Phân tích ván · đêm 1 tới hạ màn</p>
      <h2 className="mt-2 pt-[0.1em] font-display text-[clamp(2.5rem,12vw,4rem)] uppercase leading-[1.18] text-bone">
        Ván này ra sao<span className="text-blood">?</span>
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-snug text-ash">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="size-4 text-moss" strokeWidth={2} fill="currentColor" /> pha hay
        </span>
        <span className="inline-flex items-center gap-1">
          <ThumbsDown className="size-4 text-blood" strokeWidth={2} fill="currentColor" /> pha hỏng
        </span>
        <span>· hệ thống tự chấm theo người ra tay</span>
      </p>

      {(best || worst) && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {best && (
            <div className="rounded-2xl border border-moss/40 bg-moss/10 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-moss">Chơi hay nhất</p>
              <p className="mt-1 truncate pt-[0.1em] font-display text-2xl uppercase leading-[1.2] text-bone">{nameOf(best[0])}</p>
              <p className="text-xs text-ash">{best[1]} pha để đời</p>
            </div>
          )}
          {worst && (
            <div className="rounded-2xl border border-blood/40 bg-blood/10 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">Gà nhất bàn</p>
              <p className="mt-1 truncate pt-[0.1em] font-display text-2xl uppercase leading-[1.2] text-bone">{nameOf(worst[0])}</p>
              <p className="text-xs text-ash">{worst[1]} pha muốn quên</p>
            </div>
          )}
        </div>
      )}

      <ol className="mt-6 border-l border-line">
        {chapters.map((ch) => (
          <li key={ch.key} className="relative pb-6 pl-5">
            <span
              aria-hidden
              className={`absolute -left-[5px] top-1.5 size-[9px] rounded-full ${ch.key.startsWith("NIGHT") ? "bg-blood" : "bg-bone"}`}
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone">{ch.title}</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {ch.items.map((e, i) =>
                e.tone === "status" ? (
                  <li key={i}>
                    <StatusBar entry={e} />
                  </li>
                ) : (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center">
                      {e.tone === "good" ? (
                        <ThumbsUp className="size-4 text-moss" strokeWidth={2} fill="currentColor" aria-label="Pha hay" />
                      ) : e.tone === "bad" ? (
                        <ThumbsDown className="size-4 text-blood" strokeWidth={2} fill="currentColor" aria-label="Pha hỏng" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-ash" />
                      )}
                    </span>
                    <p className="text-[15px] leading-snug text-bone">{e.text}</p>
                  </li>
                ),
              )}
            </ul>
          </li>
        ))}
      </ol>

      {(v.paragraphs.length > 0 || v.turning.length > 0) && (
        <div className="mt-4 rounded-2xl border border-bone/25 bg-ink-2 px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Tổng kết ván · nói nhanh cho vui</p>
          <div className="mt-3 flex flex-col gap-3">
            {v.paragraphs.map((t, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-bone/90">
                {t}
              </p>
            ))}
          </div>
          {v.turning.length > 0 && (
            <>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Khoảnh khắc lật kèo</p>
              <ol className="mt-3 flex flex-col gap-3">
                {v.turning.map((t, i) => (
                  <li key={i} className="border-l-2 border-blood pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">{t.when}</p>
                    <p className="mt-0.5 text-[15px] leading-snug text-bone">{t.text}</p>
                    {t.impact && <p className="mt-1 text-[13px] leading-snug text-ash">{t.impact}</p>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Thanh cục diện: tỉ lệ Sói / Làng còn sống sau một chặng. */
function StatusBar({ entry }: { entry: LogEntry }) {
  const m = entry.text.match(/Còn (\d+) Sói · (\d+) Làng/);
  const wolves = Number(m?.[1] ?? 0);
  const village = Number(m?.[2] ?? 0);
  const total = Math.max(1, wolves + village);
  return (
    <div className="rounded-xl border border-line bg-ink-2 px-3 py-3">
      <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
        <span className="text-ash">Cục diện</span>
        <span>
          <span className="text-blood">{wolves} Sói</span> <span className="text-ash">·</span> <span className="text-moss">{village} Làng</span>
        </span>
      </p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-line">
        <span className="bg-blood" style={{ width: `${(wolves / total) * 100}%` }} />
        <span className="bg-moss" style={{ width: `${(village / total) * 100}%` }} />
      </div>
    </div>
  );
}
