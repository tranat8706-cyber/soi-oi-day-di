"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EyeOff } from "lucide-react";
import type { Player } from "@/store/gameStore";
import Image from "next/image";
import { getRole } from "@/constants/roles";
import { ROLE_QUIPS } from "@/constants/quips";
import { useArt } from "@/hooks/useArt";

const ease = [0.22, 1, 0.36, 1] as const;
const BLOOD_FLASH = "#991B1B";
/** Khoá nút giấu bài một nhịp sau khi lật, tránh chạm đúp lật xong giấu luôn. */
const HIDE_LOCK_MS = 1200;

interface Props {
  player: Player;
  onCancel: () => void;
  onDone: () => void;
}

type WolfFx = {
  color: string;
  flash: number[];
  times: number[];
  duration: number;
  glow: string;
  vibrate: number[];
  iris?: boolean;
  shake?: { x?: number[]; y?: number[]; scale?: number[] };
  shakeDuration?: number;
};

/** Hiệu ứng lật bài riêng cho từng loại Sói. */
const WOLF_FX: Record<string, WolfFx> = {
  // Giật đỏ: bật gắt, tắt, bật lại, rồi tắt hẳn.
  WOLF: {
    color: BLOOD_FLASH,
    flash: [1, 1, 0.1, 0.85, 0.85, 0],
    times: [0, 0.12, 0.2, 0.28, 0.45, 1],
    duration: 0.55,
    glow: "rgba(153,27,27,0.35)",
    vibrate: [200, 100, 200],
    shake: { x: [0, -16, 14, -10, 8, -4, 0], y: [0, 6, -4, 3, 0, 0, 0] },
  },
  // Đập như nhịp tim: ba nhịp đỏ sẫm, màn hình nảy nhẹ.
  WOLF_CUB: {
    color: "#7f1d1d",
    flash: [0, 0.9, 0.1, 0.9, 0.1, 0.7, 0],
    times: [0, 0.12, 0.3, 0.42, 0.6, 0.72, 1],
    duration: 1.1,
    glow: "rgba(127,29,29,0.4)",
    vibrate: [80, 80, 80, 80, 160],
    shake: { scale: [1, 1.04, 1, 1.04, 1, 1.03, 1] },
    shakeDuration: 1.1,
  },
  // Bùa tím: tím đen dâng lên chậm rồi tan, màn hình xoay nhẹ như bị yểm.
  CURSED_WOLF: {
    color: "#3b0764",
    flash: [0, 0.95, 0.6, 0.9, 0],
    times: [0, 0.25, 0.5, 0.7, 1],
    duration: 1.3,
    glow: "rgba(88,28,135,0.45)",
    vibrate: [400, 150, 100],
    shake: { x: [0, -6, 6, -4, 0], y: [0, 0, 0, 0, 0], scale: [1, 0.98, 1.02, 0.99, 1] },
    shakeDuration: 1.2,
  },
  // Mắt mở: vòng đỏ loang từ giữa màn hình ra.
  WOLF_SEER: {
    color: "#b91c1c",
    flash: [1],
    times: [0, 0.6, 1],
    duration: 0.9,
    glow: "rgba(185,28,28,0.3)",
    vibrate: [60, 60, 300],
    iris: true,
  },
  // Lóa trắng như chớp, giật mạnh.
  WHITE_WOLF: {
    color: "#f5f5f4",
    flash: [1, 1, 0.2, 0.9, 0],
    times: [0, 0.1, 0.25, 0.35, 1],
    duration: 0.7,
    glow: "rgba(245,245,244,0.18)",
    vibrate: [300, 80, 300],
    shake: { x: [0, -20, 18, -12, 10, -5, 0], y: [0, 8, -6, 4, 0, 0, 0] },
    shakeDuration: 0.5,
  },
};

export function RoleReveal({ player, onCancel, onDone }: Props) {
  const role = getRole(player.roleId);
  const { card: cardOf, art } = useArt();
  const card = cardOf(player.roleId);
  const isWolf = role?.team === "WOLVES";
  const reduceMotion = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [canHide, setCanHide] = useState(false);

  useEffect(() => {
    if (!flipped) return;
    const t = setTimeout(() => setCanHide(true), HIDE_LOCK_MS);
    return () => clearTimeout(t);
  }, [flipped]);

  // Khoá cuộn trang nền khi bài đang mở.
  useEffect(() => {
    // Không lưu giá trị cũ: hai overlay chồng nhau lúc exit sẽ khôi phục nhầm "hidden".
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !flipped && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, onCancel]);

  const fx = isWolf ? (WOLF_FX[player.roleId ?? ""] ?? WOLF_FX.WOLF) : null;
  const [quip] = useState(() => {
    const pool = ROLE_QUIPS[player.roleId as keyof typeof ROLE_QUIPS] ?? [];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const flip = () => {
    if (flipped) return;
    // Chỉ rung (người cầm máy mới biết), không phát tiếng để cả bàn khỏi nghe ra ai là Sói.
    if (fx) navigator.vibrate?.(fx.vibrate);
    setFlipped(true);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Bài của ${player.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="fixed inset-0 z-50 overflow-hidden bg-ink"
    >
      {/* Mỗi loại Sói một kiểu chớp: Sói thường giật đỏ, Sói con đập như tim, Sói nguyền tím bùa,
          Sói tiên tri mở mắt đỏ từ giữa ra, Sói trắng lóa trắng. */}
      {flipped && fx && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ backgroundColor: fx.color }}
          initial={fx.iris ? { opacity: 1, clipPath: "circle(0% at 50% 40%)" } : { opacity: fx.flash[0] }}
          animate={fx.iris ? { opacity: [1, 1, 0], clipPath: "circle(150% at 50% 40%)" } : { opacity: fx.flash }}
          transition={{ duration: fx.duration, times: fx.times, ease: fx.iris ? "easeOut" : "linear" }}
        />
      )}
      {/* Dư âm còn đọng lại sau cú chớp. */}
      {flipped && fx && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: `radial-gradient(90% 60% at 50% 35%, ${fx.glow}, transparent 70%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: fx.duration * 0.9, duration: 1.2 }}
        />
      )}

      <motion.div
        className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col overflow-y-auto px-safe pt-safe pb-safe"
        animate={flipped && fx?.shake && !reduceMotion ? fx.shake : { x: 0, y: 0, scale: 1 }}
        transition={{ duration: fx?.shakeDuration ?? 0.42, ease: "linear" }}
      >
        {/* Đầu trang: chữ đổi tại chỗ, chiều cao cố định để lá bài không bị xê dịch khi lật. */}
        <div className="grid pt-8">
          <motion.div
            className="[grid-area:1/1]"
            animate={{ opacity: flipped ? 0 : 1, y: flipped ? -8 : 0 }}
            transition={{ duration: 0.3 }}
            aria-hidden={flipped}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Bài của · chỉ người này được nhìn</p>
            <h2 className="mt-2 truncate pt-[0.1em] font-display text-[clamp(2.75rem,13vw,4.75rem)] uppercase leading-[1.18] text-bone">
              {player.name}
            </h2>
          </motion.div>
          <motion.div
            className="[grid-area:1/1]"
            initial={false}
            animate={{ opacity: flipped ? 1 : 0, y: flipped ? 0 : 8 }}
            transition={{ duration: 0.4, delay: flipped ? 0.35 : 0 }}
            aria-hidden={!flipped}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
              {player.name} · {isWolf ? <span className="text-blood">Phe Sói</span> : "Phe Làng"}
            </p>
            <h2
              className={`mt-2 truncate pt-[0.1em] font-display text-[clamp(2.75rem,13vw,4.75rem)] uppercase leading-[1.18] ${
                isWolf ? "text-blood" : "text-bone"
              }`}
            >
              {flipped ? (role?.name ?? "???") : " "}
            </h2>
          </motion.div>
        </div>

        {/* Lá bài: một tấm hai mặt, lật 3D tại chỗ. */}
        <button
          type="button"
          onClick={flip}
          disabled={flipped}
          aria-label={flipped ? (role?.name ?? "Lá bài") : "Lật bài"}
          className="relative mx-auto mt-4 block shrink-0 [perspective:1400px] disabled:cursor-default"
        >
          <motion.span
            className="block"
            animate={!flipped && !reduceMotion ? { y: [0, -6, 0] } : { y: 0 }}
            transition={!flipped ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
          >
            <motion.span
              className="relative block aspect-9/16 h-[min(44dvh,28rem)] [transform-style:preserve-3d]"
              initial={false}
              animate={flipped ? { rotateY: 180, scale: reduceMotion ? 1 : [1, 1.08, 1] } : { rotateY: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.75, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Mặt sau */}
              <span className="absolute inset-0 [backface-visibility:hidden]">
                <Image
                  src={art("card-back")}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 70vw, 320px"
                  className="rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                />
              </span>
              {/* Mặt trước (tải sẵn để lật là thấy ngay) */}
              <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                {card ? (
                  <Image
                    src={card}
                    alt={role?.name ?? ""}
                    fill
                    priority
                    sizes="(max-width: 640px) 70vw, 320px"
                    className={`rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.8)] ${
                      isWolf ? "drop-shadow-[0_0_24px_rgba(195,22,28,0.45)]" : ""
                    }`}
                  />
                ) : (
                  <span
                    className={`grid size-full place-items-center rounded-2xl border border-line bg-ink-2 font-display text-5xl uppercase ${
                      isWolf ? "text-blood" : "text-bone"
                    }`}
                  >
                    {role?.name ?? "???"}
                  </span>
                )}
              </span>
            </motion.span>
          </motion.span>
        </button>

        {/* Phần dưới: chỉ chữ thay đổi, lá bài đứng yên. */}
        <div className="flex flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {!flipped ? (
              <motion.div key="cover" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="flex flex-1 flex-col">
                <p className="mt-4 text-center font-mono text-xs uppercase tracking-[0.3em] text-ash">Chạm vào lá bài để lật</p>
                <p className="mx-auto mt-2 max-w-[30ch] text-center text-sm text-ash">Những người khác, quay mặt đi.</p>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onCancel}
                  className="mb-4 mt-4 h-16 font-mono text-xs uppercase tracking-[0.2em] text-ash active:text-bone"
                >
                  Không phải tôi
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="face"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease }}
                className="flex flex-1 flex-col"
              >
                {quip && (
                  <p className={`mt-5 text-center font-display text-2xl uppercase leading-[1.25] ${isWolf ? "text-blood" : "text-bone"}`}>
                    “{quip}”
                  </p>
                )}
                {player.formerRoleId && (
                  <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                    Từng là {getRole(player.formerRoleId)?.name}, giờ đã hóa Sói
                  </p>
                )}
                <p className="mt-4 text-base leading-relaxed text-bone/75">
                  {role?.description ?? "Không tìm thấy vai. Báo quản trò chia lại."}
                </p>
                <div className="flex-1" />
                <motion.button
                  type="button"
                  onClick={onDone}
                  disabled={!canHide}
                  animate={{ opacity: canHide ? 1 : 0.3 }}
                  whileTap={{ scale: 0.97 }}
                  className="mb-4 mt-6 flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
                >
                  <span className="font-display text-3xl uppercase leading-[1.08]">Đã hiểu, giấu bài</span>
                  <EyeOff className="size-7" strokeWidth={2} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
