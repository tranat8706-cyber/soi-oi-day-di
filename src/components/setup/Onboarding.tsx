"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, Gavel, Moon, Smartphone, Users } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const SLIDES = [
  {
    icon: Smartphone,
    kicker: "Bạn là ai?",
    title: ["Bạn là", "Quản trò."],
    body: "Bạn cầm điện thoại và dẫn truyện cho cả bàn. Quản trò không nhận bài, không đi bầu, và không cần nhập tên mình.",
  },
  {
    icon: Users,
    kicker: "Bước 1",
    title: ["Gõ tên", "người chơi."],
    body: "Gõ tên từng người ngồi quanh bàn, cần từ 5 người trở lên. App tự đếm số người và tự chia bài cho cân. Lười gõ thì bấm Thêm nhanh.",
  },
  {
    icon: Eye,
    kicker: "Bước 2",
    title: ["Chuyền tay", "xem bài."],
    body: "Đưa máy cho từng người. Mỗi người chạm vào tên mình, lật bài, nhớ vai rồi úp lại và chuyền cho người kế tiếp.",
  },
  {
    icon: Moon,
    kicker: "Bước 3",
    title: ["Đêm,", "chỉ bạn nhìn."],
    body: "Cả làng nhắm mắt. App đọc giúp bạn lời gọi từng vai: Sói cắn ai, Tiên tri soi ai, Bảo vệ che ai. Bạn chỉ việc chạm theo tay họ chỉ.",
  },
  {
    icon: Gavel,
    kicker: "Bước 4",
    title: ["Ngày,", "cả làng xử."],
    body: "Làng bàn bạc rồi bỏ phiếu. Ai nhiều phiếu nhất lên giàn bào chữa, rồi cả làng biểu quyết treo hay tha. Hòa phiếu thì để Vòng quay tử thần quyết.",
  },
] as const;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const Icon = s.icon;

  const go = (next: number) => {
    if (next < 0) return;
    if (next >= SLIDES.length) return onDone();
    setDir(next > i ? 1 : -1);
    setI(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-50 flex flex-col bg-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(195,22,28,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe">
        <header className="flex items-center justify-between px-safe pt-2">
          <div className="flex gap-1.5" aria-hidden>
            {SLIDES.map((_, k) => (
              <span
                key={k}
                className={`h-1 rounded-full transition-all duration-500 ${k === i ? "w-8 bg-blood" : k < i ? "w-4 bg-bone/60" : "w-4 bg-line"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onDone}
            className="-mr-3 min-h-16 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
          >
            Bỏ qua
          </button>
        </header>

        <motion.div
          className="flex flex-1 flex-col justify-center overflow-hidden px-safe"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(i + 1);
            else if (info.offset.x > 60) go(i - 1);
          }}
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: 40 * dir, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -40 * dir, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease }}
            >
              <span className="grid size-20 place-items-center rounded-full border border-blood/50 bg-blood/10">
                <Icon className="size-9 text-blood" strokeWidth={1.5} />
              </span>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-ash">{s.kicker}</p>
              <h2 className="mt-3 pt-[0.08em] font-display text-[clamp(3.25rem,16vw,6rem)] uppercase leading-[1.02] text-bone">
                {s.title[0]}
                <br />
                {s.title[1].replace(/\.$/, "")}
                <span className="text-blood">.</span>
              </h2>
              <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-bone/75">{s.body}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="px-safe pb-safe">
          <div className="flex gap-3 pb-4">
            {i > 0 && (
              <button
                type="button"
                onClick={() => go(i - 1)}
                className="h-20 rounded-2xl border border-line px-6 font-mono text-xs uppercase tracking-[0.2em] text-ash active:text-bone"
              >
                Lùi
              </button>
            )}
            <motion.button
              type="button"
              onClick={() => go(i + 1)}
              whileTap={{ scale: 0.97 }}
              className={`flex h-20 flex-1 items-center justify-between rounded-2xl px-6 ${last ? "bg-blood text-bone" : "bg-bone text-ink"}`}
            >
              <span className="font-display text-3xl uppercase leading-none">{last ? "Vào bàn thôi" : "Tiếp"}</span>
              <ArrowRight className="size-7" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
