"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EyeOff } from "lucide-react";
import type { Player } from "@/store/gameStore";
import { useGameStore } from "@/store/gameStore";
import Image from "next/image";
import { cardImage, getRole } from "@/constants/roles";
import { playThud } from "@/utils/audio";

const ease = [0.22, 1, 0.36, 1] as const;
const BLOOD_FLASH = "#991B1B";
/** Khoá nút giấu bài một nhịp sau khi lật, tránh chạm đúp lật xong giấu luôn. */
const HIDE_LOCK_MS = 700;

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

/** Lời "an ủi" cho Dân làng. */
const VILLAGER_TROLL = [
  "Chúc mừng, bạn đã trúng giải… không có gì.",
  "Phép thuật của bạn: hít thở. Hãy tận dụng tối đa.",
  "Sói cũng chẳng thèm cắn bạn đâu, đừng lo.",
  "Bạn là xương sống của làng. Loại xương dễ gãy nhất.",
  "Không phép, không bình, không súng. Chỉ có tấm lòng.",
  "Nhiệm vụ: sống sót. Kỹ năng: cầu nguyện.",
  "Đêm ngủ ngon nhé. Có khi là giấc cuối đấy.",
  "Bạn không vô dụng đâu. Bạn có một lá phiếu. Một.",
];

export function RoleReveal({ player, onCancel, onDone }: Props) {
  const role = getRole(player.roleId);
  const card = cardImage(player.roleId);
  const isWolf = role?.team === "WOLVES";
  const isSoundEnabled = useGameStore((s) => s.isSoundEnabled);
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
  const [troll] = useState(() => VILLAGER_TROLL[Math.floor(Math.random() * VILLAGER_TROLL.length)]);

  const flip = () => {
    if (flipped) return;
    // Rung + âm thanh phải chạy đồng bộ trong cử chỉ chạm.
    if (fx) {
      navigator.vibrate?.(fx.vibrate);
      if (isSoundEnabled) playThud();
    }
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
        <AnimatePresence mode="wait" initial={false}>
          {!flipped ? (
            <motion.section
              key="cover"
              exit={isWolf ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              className="flex flex-1 flex-col"
            >
              <div className="pt-10">
                {/* Tải sẵn ảnh lá bài để lật là hiện ngay. */}
                {card && <Image src={card} alt="" width={720} height={980} priority className="hidden" />}
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Bài của</p>
                <h2 className="mt-4 break-words font-display text-[clamp(3.5rem,18vw,7rem)] uppercase leading-[1.18] text-bone">
                  {player.name}
                </h2>
                <p className="mt-3 max-w-[30ch] text-ash">
                  Chỉ <span className="text-bone">{player.name}</span> được nhìn. Những người khác, quay mặt đi.
                </p>
              </div>

              <button
                type="button"
                onClick={flip}
                aria-label="Lật bài"
                className="group relative my-6 flex min-h-64 flex-1 flex-col items-center justify-center gap-3 transition-transform active:scale-[0.98]"
              >
                <motion.span
                  className="relative block h-[min(48dvh,30rem)] aspect-720/913"
                  animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Image
                    src="/art/card-back.jpg"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 640px) 70vw, 380px"
                    className="rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                  />
                </motion.span>
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-ash">Chạm để lật bài</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="mb-4 h-16 font-mono text-xs uppercase tracking-[0.2em] text-ash active:text-bone"
              >
                Không phải tôi
              </button>
            </motion.section>
          ) : (
            <motion.section
              key="face"
              initial={isWolf ? { opacity: 1, scale: 1.08 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              transition={isWolf ? { duration: 0.25, ease: "easeOut" } : { duration: 0.9, ease }}
              className="flex flex-1 flex-col"
            >
              <div className="flex-1 pt-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                  {player.name} · {role?.team === "WOLVES" ? "Phe Sói" : "Phe Dân"}
                  {card && <span className={isWolf ? "text-blood" : "text-bone"}> · {role?.name}</span>}
                </p>
                {card ? (
                  <>
                    <h2 className="sr-only">{role?.name}</h2>
                    <motion.div
                      initial={isWolf ? false : { rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.5, ease }}
                      className="mx-auto mt-4 w-fit"
                    >
                      <Image
                        src={card}
                        alt={role?.name ?? ""}
                        width={720}
                        height={980}
                        priority
                        className={`h-auto max-h-[52dvh] w-auto rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.8)] ${
                          isWolf ? "ring-2 ring-blood/70" : "ring-1 ring-bone/20"
                        }`}
                      />
                    </motion.div>
                  </>
                ) : (
                  <h2
                    className={`mt-5 font-display uppercase leading-[1.18] text-[clamp(5rem,28vw,11rem)] ${
                      isWolf ? "text-blood" : "text-bone"
                    }`}
                  >
                    {role?.name ?? "???"}
                  </h2>
                )}
                {player.formerRoleId && (
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                    Từng là {getRole(player.formerRoleId)?.name}, giờ đã hóa Sói
                  </p>
                )}
                <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-bone/85">
                  {role?.description ?? "Không tìm thấy vai. Báo quản trò chia lại."}
                </p>
                {player.roleId === "VILLAGER" && <p className="mt-3 max-w-[34ch] text-base italic leading-snug text-ash">“{troll}”</p>}
              </div>

              <motion.button
                type="button"
                onClick={onDone}
                disabled={!canHide}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: canHide ? 1 : 0.3, y: 0 }}
                transition={{ duration: 0.4 }}
                whileTap={{ scale: 0.97 }}
                className="mb-4 flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
              >
                <span className="font-display text-3xl uppercase leading-none">Đã hiểu, giấu bài</span>
                <EyeOff className="size-7" strokeWidth={2} />
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
