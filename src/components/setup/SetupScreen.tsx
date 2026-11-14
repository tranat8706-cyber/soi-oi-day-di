"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Plus, SlidersHorizontal, Smartphone } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, useGameStore, type SetupStep } from "@/store/gameStore";
import { unlockAudio } from "@/utils/audio";
import { track } from "@/utils/analytics";
import { balanceVerdict, rebalance, type DeckConfig } from "@/utils/balancer";
import { SPECIAL_ROLES } from "@/constants/roles";
import { DeckSummary } from "../DeckSummary";
import { PlayerRow } from "./PlayerRow";
import { HouseRulesList, HouseRulesSheet } from "./HouseRulesSheet";
import { DeckEditor, useCurrentDeck } from "./DeckEditor";
import { BalanceMeter } from "./BalanceMeter";
import { Onboarding } from "./Onboarding";

const QUICK_FILL = [6, 8, 10, 12];
const ease = [0.22, 1, 0.36, 1] as const;

const STEPS: { n: SetupStep; label: string }[] = [
  { n: 1, label: "Người chơi" },
  { n: 2, label: "Bộ bài" },
  { n: 3, label: "Luật chơi" },
];

/** Tên tạm do "Thêm nhanh" sinh ra. */
const isPlaceholder = (name: string) => /^Người \d+$/.test(name);

/**
 * Màn chuẩn bị theo 3 bước bắt buộc: nhập người chơi → chốt bộ bài → xem luật chơi.
 * Chưa xong bước trước thì không sang được bước sau.
 */
export function SetupScreen() {
  const sessionTitle = useGameStore((s) => s.sessionTitle);
  const setSessionTitle = useGameStore((s) => s.setSessionTitle);
  const players = useGameStore((s) => s.players);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const clearPlayers = useGameStore((s) => s.clearPlayers);
  const houseRules = useGameStore((s) => s.houseRules);
  const assignRoles = useGameStore((s) => s.assignRoles);
  const fillPlayers = useGameStore((s) => s.fillPlayers);
  const onboarded = useGameStore((s) => s.onboarded);
  const setOnboarded = useGameStore((s) => s.setOnboarded);
  const customDeck = useGameStore((s) => s.customDeck);
  const setCustomDeck = useGameStore((s) => s.setCustomDeck);
  const storedStep = useGameStore((s) => s.setupStep);
  const setStep = useGameStore((s) => s.setSetupStep);

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [lopsidedOpen, setLopsidedOpen] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const deck = useCurrentDeck();
  const verdict = balanceVerdict(deck.counts);
  const missing = Math.max(0, MIN_PLAYERS - players.length);
  const ready = missing === 0;
  // Chưa đủ người thì luôn ở bước 1.
  const step: SetupStep = ready ? storedStep : 1;
  const placeholders = players.filter((p) => isPlaceholder(p.name)).length;

  const go = (next: SetupStep) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const submitDraft = () => {
    const name = draft.trim();
    if (!name) return;
    if (addPlayer(name)) {
      setDraft("");
      setError(null);
      track("player_added", { count: players.length + 1 });
      requestAnimationFrame(() => addRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    } else {
      setError(players.length >= MAX_PLAYERS ? `Tối đa ${MAX_PLAYERS} người một bàn.` : `“${name}” đã ngồi ở bàn rồi.`);
    }
    addRef.current?.focus();
  };

  const onClearTap = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    clearPlayers();
    setConfirmClear(false);
    addRef.current?.focus();
  };

  /** Rời bước bộ bài: bộ tự chọn lệch nặng thì hỏi lại. */
  const leaveDeckStep = () => {
    if (deck.custom && verdict.level === "lopsided") {
      setLopsidedOpen(true);
      return;
    }
    go(3);
  };

  const onStart = () => {
    void unlockAudio(); // phải gọi trong chính cử chỉ chạm
    track("game_started", {
      players: players.length,
      sessionTitle: sessionTitle || null,
      houseRules,
      customDeck,
      withAvatars: players.filter((p) => p.avatarBase64).length,
    });
    assignRoles();
  };

  const cta =
    step === 1
      ? ready
        ? { key: "s1", label: "Tiếp · chọn bộ bài", onClick: () => go(2) }
        : null
      : step === 2
        ? { key: "s2", label: "Tiếp · luật chơi", onClick: leaveDeckStep }
        : { key: "s3", label: "Bắt đầu chia bài", onClick: onStart };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe">
      {/* Thanh trên */}
      <header className="flex items-center justify-between px-safe pt-2">
        {step === 1 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Quản trò · Offline</p>
        ) : (
          <button
            type="button"
            onClick={() => go((step - 1) as SetupStep)}
            className="-ml-3 flex min-h-16 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone active:text-ash"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            {STEPS[step - 2].label}
          </button>
        )}
        <div className="-mr-4 flex">
          <button
            type="button"
            onClick={() => setOnboarded(false)}
            aria-label="Xem hướng dẫn"
            className="grid size-16 place-items-center text-ash transition-colors active:text-bone"
          >
            <CircleHelp className="size-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            aria-label="Luật nhà"
            className="grid size-16 place-items-center text-ash transition-colors active:text-bone"
          >
            <SlidersHorizontal className="size-6" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Các bước */}
      <nav aria-label="Các bước chuẩn bị" className="px-safe">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            const reachable = s.n === 1 || ready;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  disabled={!reachable || s.n === step || (s.n === 3 && step === 1)}
                  onClick={() => (s.n === 3 ? leaveDeckStep() : go(s.n))}
                  aria-current={active ? "step" : undefined}
                  className="w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-1 rounded-full ${done || active ? "bg-blood" : "bg-line"}`} />
                  <span
                    className={`mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                      active ? "text-bone" : done ? "text-ash" : "text-ash/50"
                    }`}
                  >
                    {done ? <Check className="size-3" strokeWidth={2.5} /> : `0${s.n}`} {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="flex-1 px-safe pb-44">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              {/* Tiêu đề */}
              <h1 className="mt-6 font-display uppercase leading-[1.02] tracking-tight text-bone text-[clamp(5rem,26vw,10.5rem)]">
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease }}
                >
                  Sói ơi
                </motion.span>
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.15, ease }}
                >
                  Dậy đi<span className="text-blood">!</span>
                </motion.span>
              </h1>
              <p className="mt-4 max-w-[28ch] text-base leading-relaxed text-ash">Một chiếc điện thoại. Một bàn người. Không ai được tin ai.</p>

              {/* Ai cầm máy */}
              <div className="mt-10 flex gap-4 rounded-2xl border border-line bg-ink-2 px-4 py-4">
                <Smartphone className="mt-0.5 size-6 shrink-0 text-blood" strokeWidth={1.5} />
                <p className="text-sm leading-relaxed text-bone/80">
                  <span className="font-semibold text-bone">Bạn là Quản trò.</span> Bạn cầm máy dẫn truyện, không nhận bài nên không cần
                  nhập tên mình. Chỉ nhập tên những người chơi.
                </p>
              </div>

              {/* Người chơi */}
              <section className="mt-12">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">01 — Người chơi</span>
                  <span className="font-display text-5xl leading-none tabular-nums text-bone">{String(players.length).padStart(2, "0")}</span>
                </div>
                <p className="mt-2 text-sm leading-snug text-ash">
                  Gõ tên từng người theo <span className="text-bone">thứ tự chỗ ngồi</span> rồi bấm Enter. Cần ít nhất {MIN_PLAYERS} người.
                </p>

                <ul className="mt-3 border-t border-line">
                  <AnimatePresence initial={false}>
                    {players.map((p, i) => (
                      <PlayerRow key={p.id} player={p} index={i} />
                    ))}
                  </AnimatePresence>
                </ul>

                <form
                  className="flex items-center gap-3 border-b border-line py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitDraft();
                  }}
                >
                  <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-ash/50">{String(players.length + 1).padStart(2, "0")}</span>
                  <input
                    ref={addRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={players.length ? "Thêm người…" : "Gõ tên rồi Enter"}
                    aria-label="Tên người chơi mới"
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="enter"
                    className="h-16 min-w-0 flex-1 bg-transparent text-xl text-bone outline-none placeholder:text-ash/50"
                  />
                  <button
                    type="submit"
                    aria-label="Thêm người chơi"
                    onPointerDown={(e) => e.preventDefault() /* giữ focus + bàn phím */}
                    disabled={!draft.trim()}
                    className="grid size-16 shrink-0 place-items-center text-bone transition-opacity disabled:opacity-25"
                  >
                    <Plus className="size-6" strokeWidth={1.5} />
                  </button>
                </form>

                <div className="flex min-h-16 items-center justify-between">
                  <AnimatePresence mode="wait">
                    {error ? (
                      <motion.p
                        key="err"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="text-sm text-blood"
                      >
                        {error}
                      </motion.p>
                    ) : (
                      <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-ash">
                        {players.length === 0
                          ? "Chưa ai ngồi vào bàn."
                          : missing
                            ? `Thêm ${missing} người nữa là chơi được.`
                            : "Chạm vào tên để sửa, vào tròn tròn để chụp ảnh."}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {players.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearTap}
                      className={`-mr-3 min-h-16 px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                        confirmClear ? "text-blood" : "text-ash active:text-bone"
                      }`}
                    >
                      {confirmClear ? "Chạm lần nữa" : "Xóa hết"}
                    </button>
                  )}
                </div>

                {placeholders > 0 && (
                  <p className="rounded-2xl border border-line px-4 py-3 text-sm leading-snug text-ash">
                    Còn <span className="text-bone">{placeholders} tên tạm</span> “Người…”. Đổi thành tên thật để lúc gọi dậy, bỏ phiếu không ai
                    nhầm. Chạm vào tên để sửa.
                  </p>
                )}

                {players.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Lười gõ? Thêm nhanh</p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {QUICK_FILL.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => fillPlayers(k)}
                          className="flex h-16 flex-col items-center justify-center rounded-xl border border-line text-bone active:bg-ink-2"
                        >
                          <span className="font-display text-2xl leading-none">{k}</span>
                          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ash">người</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-snug text-ash">Tên tạm “Người 1, Người 2…”, chạm vào để đổi lại sau.</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {step === 2 && (
            <motion.section key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <h2 className="mt-8 font-display text-[clamp(3rem,15vw,5rem)] uppercase leading-[1.02] text-bone">
                Bộ bài<span className="text-blood">.</span>
              </h2>
              <p className="mt-2 text-sm leading-snug text-ash">
                {players.length} người chơi. Chọn ván này có những vai nào; Quản trò sẽ đọc to cho cả bàn biết trước khi chia.
              </p>
              <DeckEditor />
            </motion.section>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <h2 className="mt-8 font-display text-[clamp(3rem,15vw,5rem)] uppercase leading-[1.02] text-bone">
                Luật chơi<span className="text-blood">.</span>
              </h2>
              <p className="mt-2 text-sm leading-snug text-ash">Thống nhất với cả bàn trước khi chơi để khỏi cãi nhau giữa ván.</p>

              <div className="mt-6">
                <HouseRulesList />
              </div>

              <section className="mt-10">
                <label htmlFor="session-title" className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                  Tên ván <span className="text-ash/50">· không bắt buộc</span>
                </label>
                <input
                  id="session-title"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Đêm đẫm máu"
                  autoComplete="off"
                  enterKeyHint="done"
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && e.currentTarget.blur()}
                  className="mt-2 h-16 w-full border-b border-line bg-transparent text-2xl font-medium text-bone outline-none placeholder:text-ash/40 focus:border-bone"
                />
                <p className="mt-2 text-sm text-ash">In lên ảnh tổng kết cuối ván để khoe lên Story.</p>
              </section>

              {/* Tóm tắt trước khi chia */}
              <section className="mt-10 rounded-2xl border border-line bg-ink-2 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Sẵn sàng · {players.length} người</p>
                <div className="mt-3">
                  <DeckSummary counts={deck.counts} label="" size="sm" />
                </div>
                <div className="mt-3">
                  <BalanceMeter counts={deck.counts} />
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* CTA cố định đáy */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <AnimatePresence mode="wait" initial={false}>
              {cta ? (
                <motion.button
                  key={cta.key}
                  type="button"
                  onClick={cta.onClick}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`group flex h-20 w-full items-center justify-between rounded-2xl px-6 ${
                    step === 3 ? "bg-blood text-bone" : "bg-bone text-ink"
                  }`}
                >
                  <span className="font-display text-3xl uppercase leading-none">{cta.label}</span>
                  <ArrowRight className="size-7 transition-transform group-active:translate-x-1" strokeWidth={2} />
                </motion.button>
              ) : (
                <motion.div
                  key="wait"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-line"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-ash">
                    Cần thêm <span className="text-bone">{missing}</span> người nữa
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <HouseRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Hỏi lại khi bộ tự chọn lệch nặng */}
      <AnimatePresence>
        {lopsidedOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLopsidedOpen(false)}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-[2px]"
            />
            <motion.div
              key="dialog"
              role="alertdialog"
              aria-modal="true"
              aria-label="Bộ bài đang lệch"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl rounded-t-[28px] border-t border-blood bg-ink-2 px-safe pb-safe"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-blood">Khoan đã</p>
              <p className="mt-2 pt-[0.1em] font-display text-[clamp(2rem,9vw,2.75rem)] uppercase leading-[1.08] text-bone">
                Phe {verdict.favored === "VILLAGE" ? "Làng" : "Sói"} quá mạnh
              </p>
              <p className="mt-2 text-sm leading-snug text-ash">
                Với bộ bài này, phe {verdict.favored === "VILLAGE" ? "Làng" : "Sói"} gần như chắc thắng. Cân bằng lại cho cả bàn cùng vui?
              </p>
              <div className="mt-4">
                <BalanceMeter counts={deck.counts} />
              </div>
              <div className="mt-5 space-y-2 pb-6">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const current: DeckConfig = { WOLF: deck.counts.WOLF };
                    for (const id of SPECIAL_ROLES) current[id] = deck.counts[id];
                    setCustomDeck(rebalance(deck.n, current));
                    setLopsidedOpen(false);
                  }}
                  className="flex h-16 w-full items-center justify-center rounded-2xl bg-bone text-ink"
                >
                  <span className="font-display text-2xl uppercase leading-none">Cân bằng giúp, tôi xem lại</span>
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    setLopsidedOpen(false);
                    go(3);
                  }}
                  className="min-h-16 w-full font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
                >
                  Kệ, vẫn đi tiếp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{!onboarded && <Onboarding key="onboarding" onDone={() => setOnboarded(true)} />}</AnimatePresence>
    </div>
  );
}
