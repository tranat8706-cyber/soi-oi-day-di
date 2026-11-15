"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, Gavel, Moon, Smartphone, Users } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, useGameStore } from "@/store/gameStore";
import { SKILL_LEVELS, type SkillLevel } from "@/utils/balancer";

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
    title: ["Điền tên", "người chơi."],
    body: "App tạo sẵn chỗ ngồi theo số người bạn chọn. Chạm vào từng chỗ để đổi thành tên thật, theo đúng vòng ngồi quanh bàn.",
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

const COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, k) => MIN_PLAYERS + k);

/** Ví dụ vai theo trình độ, để nhóm hình dung. */
const SKILL_EXAMPLE: Record<SkillLevel, string> = {
  NEWBIE: "Sói · Tiên tri · Bảo vệ · Phù thủy · Thợ săn",
  MIXED: "Thêm Cupid, Già làng, Con điếm, Sói con…",
  PRO: "Sói nguyền, Sói tiên tri, Sói trắng, Cáo, Kẻ cảm tử…",
};

/**
 * Màn chào mỗi lần mở app: hướng dẫn nhanh (bỏ qua được), rồi hỏi nhóm mấy người và trình độ
 * để app gợi ý bộ bài phù hợp.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const players = useGameStore((st) => st.players);
  const seatPlayers = useGameStore((st) => st.seatPlayers);
  const skill = useGameStore((st) => st.skill);
  const setSkill = useGameStore((st) => st.setSkill);
  const setCustomDeck = useGameStore((st) => st.setCustomDeck);
  const setSetupStep = useGameStore((st) => st.setSetupStep);

  const [phase, setPhase] = useState<"guide" | "count" | "names" | "skill">("guide");
  // Tên đã có (bỏ tên tạm) để người cũ khỏi gõ lại.
  const [names, setNames] = useState<string[]>(() => players.map((p) => (/^Người \d+$/.test(p.name) ? "" : p.name)));
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [count, setCount] = useState(() => (players.length >= MIN_PLAYERS ? players.length : 8));
  const [level, setLevel] = useState<SkillLevel>(skill);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const Icon = s.icon;

  const go = (next: number) => {
    if (next < 0) return;
    if (next >= SLIDES.length) return setPhase("count");
    setDir(next > i ? 1 : -1);
    setI(next);
  };

  const finish = () => {
    seatPlayers(Array.from({ length: count }, (_, i) => names[i] ?? ""));
    setSkill(level);
    setCustomDeck(null); // để app chia theo trình độ vừa chọn
    setSetupStep(2);
    onDone();
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
      <div className="relative mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col pt-safe">
        <header className="flex items-center justify-between px-safe pt-2">
          <div className="flex min-h-16 items-center gap-1.5" aria-hidden>
            {phase === "guide" ? (
              SLIDES.map((_, k) => (
                <span
                  key={k}
                  className={`h-1 rounded-full transition-all duration-500 ${k === i ? "w-8 bg-blood" : k < i ? "w-4 bg-bone/60" : "w-4 bg-line"}`}
                />
              ))
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                Câu hỏi {phase === "count" ? "1" : phase === "names" ? "2" : "3"}/3
              </span>
            )}
          </div>
          {phase === "guide" && (
            <button
              type="button"
              onClick={() => setPhase("count")}
              className="-mr-3 min-h-16 rounded-full px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-bone active:text-ash"
            >
              Biết rồi · bỏ qua
            </button>
          )}
        </header>

        {phase === "guide" ? (
          <>
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
              <h2 className="mt-3 pt-[0.08em] font-display text-[clamp(3.25rem,16vw,6rem)] uppercase leading-[1.18] text-bone">
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
              <span className="font-display text-3xl uppercase leading-[1.08]">{last ? "Tiếp · 2 câu hỏi" : "Tiếp"}</span>
              <ArrowRight className="size-7" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-safe">
              <AnimatePresence mode="wait" initial={false}>
                {phase === "count" ? (
                  <motion.div
                    key="count"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease }}
                    className="pt-6"
                  >
                    <h2 className="pt-[0.08em] font-display text-[clamp(2.75rem,13vw,4.5rem)] uppercase leading-[1.18] text-bone">
                      Nhóm bạn
                      <br />
                      mấy người<span className="text-blood">?</span>
                    </h2>
                    <p className="mt-3 text-base leading-snug text-ash">
                      Chỉ đếm người chơi, <span className="text-bone">không tính Quản trò</span>. Đổi lại sau cũng được.
                    </p>
                    <p className="mt-6 text-center font-display text-[7rem] leading-none tabular-nums text-blood" aria-live="polite">
                      {count}
                    </p>
                    <div role="radiogroup" aria-label="Số người chơi" className="mt-6 grid grid-cols-4 gap-2 pb-6">
                      {COUNTS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={count === k}
                          onClick={() => setCount(k)}
                          className={`h-14 rounded-xl font-display text-2xl tabular-nums transition-colors ${
                            count === k ? "bg-bone text-ink" : "border border-line text-bone active:bg-ink-2"
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : phase === "names" ? (
                  <motion.div
                    key="names"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease }}
                    className="pt-6"
                  >
                    <h2 className="pt-[0.08em] font-display text-[clamp(2.75rem,13vw,4.5rem)] uppercase leading-[1.18] text-bone">
                      Ai đang
                      <br />
                      ngồi đây<span className="text-blood">?</span>
                    </h2>
                    <p className="mt-3 text-base leading-snug text-ash">
                      Gõ tên <span className="text-bone">theo vòng ngồi</span>, bắt đầu từ người bên trái bạn. Có tên thì gọi dậy, bỏ phiếu khỏi nhầm.
                      Lười thì để trống, app đặt tên tạm.
                    </p>
                    <ol className="mt-5 flex flex-col gap-2 pb-6">
                      {Array.from({ length: count }, (_, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-ash">{String(i + 1).padStart(2, "0")}</span>
                          <input
                            ref={(el) => {
                              nameRefs.current[i] = el;
                            }}
                            value={names[i] ?? ""}
                            onChange={(e) =>
                              setNames((cur) => {
                                const next = [...cur];
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                              e.preventDefault();
                              const nxt = nameRefs.current[i + 1];
                              if (nxt) nxt.focus();
                              else e.currentTarget.blur();
                            }}
                            placeholder={`Người ${i + 1}`}
                            aria-label={`Tên người ngồi chỗ ${i + 1}`}
                            autoComplete="off"
                            autoCapitalize="words"
                            enterKeyHint={i === count - 1 ? "done" : "next"}
                            className="h-14 min-w-0 flex-1 rounded-xl border border-line bg-ink-2 px-4 text-lg text-bone outline-none placeholder:text-ash/40 focus:border-bone"
                          />
                        </li>
                      ))}
                    </ol>
                  </motion.div>
                ) : (
                  <motion.div
                    key="skill"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease }}
                    className="pt-6"
                  >
                    <h2 className="pt-[0.08em] font-display text-[clamp(2.75rem,13vw,4.5rem)] uppercase leading-[1.18] text-bone">
                      Trình độ
                      <br />
                      cả bàn<span className="text-blood">?</span>
                    </h2>
                    <p className="mt-3 text-base leading-snug text-ash">App sẽ gợi ý bộ bài hợp với nhóm. Vẫn sửa được ở bước chọn bài.</p>
                    <div role="radiogroup" aria-label="Trình độ" className="mt-6 flex flex-col gap-3 pb-6">
                      {SKILL_LEVELS.map((o) => {
                        const on = level === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setLevel(o.id)}
                            className={`rounded-2xl border px-5 py-4 text-left transition-colors ${
                              on ? "border-blood bg-blood/15" : "border-line active:bg-ink-2"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="pt-[0.08em] font-display text-3xl uppercase leading-[1.18] text-bone">{o.label}</span>
                              <span
                                aria-hidden
                                className={`grid size-6 shrink-0 place-items-center rounded-full border ${on ? "border-blood bg-blood" : "border-line"}`}
                              >
                                {on && <span className="size-2 rounded-full bg-bone" />}
                              </span>
                            </span>
                            <span className="mt-1 block text-sm leading-snug text-bone/75">{o.hint}</span>
                            <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-ash">{SKILL_EXAMPLE[o.id]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-safe pb-safe">
              <div className="flex gap-3 pb-4 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase(phase === "skill" ? "names" : phase === "names" ? "count" : "guide")}
                  className="h-20 rounded-2xl border border-line px-6 font-mono text-xs uppercase tracking-[0.2em] text-ash active:text-bone"
                >
                  Lùi
                </button>
                <motion.button
                  type="button"
                  onClick={() => (phase === "count" ? setPhase("names") : phase === "names" ? setPhase("skill") : finish())}
                  whileTap={{ scale: 0.97 }}
                  className={`flex h-20 flex-1 items-center justify-between rounded-2xl px-6 ${
                    phase === "skill" ? "bg-blood text-bone" : "bg-bone text-ink"
                  }`}
                >
                  <span className="font-display text-3xl uppercase leading-[1.08]">{phase === "skill" ? "Vào bàn thôi" : "Tiếp"}</span>
                  <ArrowRight className="size-7" strokeWidth={2} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
