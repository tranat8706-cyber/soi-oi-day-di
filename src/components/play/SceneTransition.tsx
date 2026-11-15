"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { playDawn, playHowl } from "@/utils/audio";

export type Scene = "night" | "day";

const DURATION = { night: 2900, day: 2700 } as const;

/** Sao rải ngẫu nhiên nhưng cố định theo chỉ số (không đổi giữa các lần render). */
const STARS = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 37) % 62,
  s: 1 + ((i * 7) % 3),
  d: ((i * 13) % 10) / 10,
}));

/**
 * Màn chuyển cảnh toàn màn hình: đêm buông (trời tối dần từ trên xuống, trăng máu nhô lên)
 * và trời sáng (mặt trời mọc, bầu trời ửng hồng). Chạm để bỏ qua.
 */
export function SceneTransition({
  scene,
  round,
  sound,
  onDone,
}: {
  scene: Scene;
  round: number;
  sound: boolean;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const ms = reduce ? 900 : DURATION[scene];

  useEffect(() => {
    if (!sound) return;
    if (scene === "night") playHowl();
    else playDawn();
  }, [scene, sound]);

  useEffect(() => {
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [ms, onDone]);

  // Chạm đúp vào nút vừa bấm không được bỏ qua luôn màn chuyển cảnh.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 800);
    return () => clearTimeout(t);
  }, []);

  const pad = useMemo(() => String(round).padStart(2, "0"), [round]);

  return (
    <motion.button
      type="button"
      onClick={() => armed && onDone()}
      aria-label="Bỏ qua chuyển cảnh"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      className="fixed inset-0 z-[60] block cursor-default overflow-hidden text-left"
    >
      {scene === "night" ? <Night pad={pad} reduce={!!reduce} /> : <Day pad={pad} reduce={!!reduce} />}
      <span className="absolute inset-x-0 bottom-0 pb-safe text-center">
        <span className="mb-6 block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/40">Chạm để bỏ qua</span>
      </span>
    </motion.button>
  );
}

function Night({ pad, reduce }: { pad: string; reduce: boolean }) {
  return (
    <>
      {/* Bóng tối phủ dần từ trên xuống */}
      <motion.span
        className="absolute inset-0 bg-linear-to-b from-[#020203] via-[#07070a] to-[#140406]"
        initial={reduce ? { opacity: 0 } : { y: "-100%" }}
        animate={reduce ? { opacity: 1 } : { y: "0%" }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Sao lấp lánh */}
      {STARS.map((st, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-bone"
          style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s }}
          initial={{ opacity: 0 }}
          animate={{ opacity: reduce ? 0.6 : [0, 0.9, 0.3, 0.8] }}
          transition={{ delay: 0.7 + st.d, duration: 1.6 }}
        />
      ))}
      {/* Trăng máu nhô lên */}
      <motion.span
        className="absolute left-1/2 top-[22%] size-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_40%_35%,#e2464b,#9f1217_60%,#5a0d10)] shadow-[0_0_120px_40px_rgba(195,22,28,0.35)]"
        initial={reduce ? { opacity: 0 } : { y: 260, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Sương mù trôi ngang */}
      {!reduce && (
        <motion.span
          className="absolute inset-x-[-20%] bottom-[18%] h-40 bg-[radial-gradient(ellipse_at_center,rgba(236,231,221,0.08),transparent_70%)] blur-xl"
          initial={{ x: "-10%", opacity: 0 }}
          animate={{ x: "10%", opacity: 1 }}
          transition={{ delay: 0.8, duration: 2.2, ease: "easeOut" }}
        />
      )}
      <span className="absolute inset-x-0 top-[52%] px-safe text-center">
        <motion.span
          className="block font-mono text-[11px] uppercase tracking-[0.3em] text-blood"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          Đêm {pad}
        </motion.span>
        <motion.span
          className="mt-3 block pt-[0.1em] font-display text-[clamp(3.25rem,16vw,6rem)] uppercase leading-[1.18] text-bone"
          initial={{ opacity: 0, filter: "blur(10px)", letterSpacing: "0.15em" }}
          animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0em" }}
          transition={{ delay: 1.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          Màn đêm
          <br />
          buông xuống
        </motion.span>
        <motion.span
          className="mt-4 block text-base text-bone/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          Cả làng nhắm mắt lại…
        </motion.span>
      </span>
    </>
  );
}

function Day({ pad, reduce }: { pad: string; reduce: boolean }) {
  return (
    <>
      {/* Trời đêm */}
      <span className="absolute inset-0 bg-[#050507]" />
      {/* Bầu trời ửng dần từ chân trời lên */}
      <motion.span
        className="absolute inset-0 bg-linear-to-t from-[#f2a65a] via-[#b4473a] to-[#1b1530]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0.3 : 1.6, ease: "easeInOut" }}
      />
      {/* Tia nắng xoay chậm */}
      {!reduce && (
        <motion.span
          className="absolute left-1/2 top-[62%] size-[160vmax] -translate-x-1/2 -translate-y-1/2 bg-[repeating-conic-gradient(rgba(255,236,200,0.12)_0deg_6deg,transparent_6deg_18deg)]"
          style={{ maskImage: "radial-gradient(circle, black 0%, transparent 45%)" }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 25 }}
          transition={{ delay: 0.6, duration: 2.4, ease: "easeOut" }}
        />
      )}
      {/* Mặt trời mọc */}
      <motion.span
        className="absolute left-1/2 top-[52%] size-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#fff6e0,#ffd27a_55%,#f59e3b)] shadow-[0_0_140px_60px_rgba(255,200,120,0.45)]"
        initial={reduce ? { opacity: 0 } : { y: 320, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Đường chân trời che nửa dưới mặt trời */}
      <span className="absolute inset-x-0 bottom-0 top-[62%] bg-linear-to-b from-[#2a1712] to-[#09090b]" />
      <span className="absolute inset-x-0 top-[66%] px-safe text-center">
        <motion.span
          className="block font-mono text-[11px] uppercase tracking-[0.3em] text-[#ffd27a]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          Sáng ngày {pad}
        </motion.span>
        <motion.span
          className="mt-2 block pt-[0.1em] font-display text-[clamp(3.25rem,16vw,6rem)] uppercase leading-[1.18] text-bone"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          Làng thức dậy
        </motion.span>
        <motion.span
          className="mt-2 block text-base text-bone/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          Mở mắt ra xem ai còn, ai mất…
        </motion.span>
      </span>
    </>
  );
}
