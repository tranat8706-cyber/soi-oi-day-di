"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Dices, Plus, SlidersHorizontal } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, useGameStore, type SetupStep } from "@/store/gameStore";
import { unlockAudio } from "@/utils/audio";
import { track } from "@/utils/analytics";
import { balanceVerdict, rebalance, villageWinRate, type DeckConfig } from "@/utils/balancer";
import { SPECIAL_ROLES } from "@/constants/roles";
import { DeckSummary } from "../DeckSummary";
import { PlayerRow } from "./PlayerRow";
import { HouseRulesList, HouseRulesSheet } from "./HouseRulesSheet";
import { DeckEditor, useCurrentDeck } from "./DeckEditor";
import { BalanceMeter } from "./BalanceMeter";
import { Onboarding } from "./Onboarding";
import { Handbook } from "../Handbook";
import Image from "next/image";
import { Lock } from "lucide-react";
import { THEME_ORDER, THEMES, PRO_THEMES_UNLOCKED, activeTheme, cardSrc } from "@/constants/themes";

const QUICK_FILL = [6, 8, 10, 12];

const STEPS: { n: SetupStep; label: string }[] = [
  { n: 2, label: "Bộ bài" },
  { n: 3, label: "Luật chơi" },
];

/** Tên tạm do "Thêm nhanh" sinh ra. */
const isPlaceholder = (name: string) => /^Người \d+$/.test(name);

/**
 * Màn chuẩn bị theo 3 bước bắt buộc: nhập người chơi → chốt bộ bài → xem luật chơi.
 * Chưa xong bước trước thì không sang được bước sau.
 */
const TITLES = [
  "Đêm đẫm máu",
  "Làng không ngủ",
  "Ai cũng đáng nghi",
  "Sói đội lốt cừu",
  "Đêm trăng máu",
  "Thề là tôi dân",
  "Tin nhau đi mà",
  "Bữa tối cuối cùng",
  "Treo nhầm còn hơn bỏ sót",
  "Làng hoang mang",
  "Sói về làng",
  "Đêm không trăng",
];
const randomTitle = (cur: string) => {
  const pool = TITLES.filter((t) => t !== cur);
  return pool[Math.floor(Math.random() * pool.length)];
};

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
  const [bookOpen, setBookOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  /** Cảnh báo bộ lệch: mở khi rời bước bộ bài ("deck") hoặc khi bấm chia bài ("start"). */
  const [lopsidedOpen, setLopsidedOpen] = useState<false | "deck" | "start">(false);
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
      setLopsidedOpen("deck");
      return;
    }
    go(3);
  };

  /** Bấm chia bài: bộ lệch nặng (một phe gần như chắc thắng) thì cảnh báo ngay. */
  const onStart = (force = false) => {
    if (!force && verdict.level === "lopsided") {
      setLopsidedOpen("start");
      return;
    }
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
        ? { key: "s1", label: "Xong · về bộ bài", onClick: () => go(2) }
        : null
      : step === 2
        ? { key: "s2", label: "Tiếp · luật chơi", onClick: leaveDeckStep }
        : sessionTitle.trim()
          ? { key: "s3", label: "Bắt đầu chia bài", onClick: () => onStart() }
          : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe">
      {/* Thanh trên */}
      <header className="flex items-center justify-between px-safe pt-2">
        {step === 2 || (step === 1 && !ready) ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Quản trò · Offline</p>
        ) : (
          <button
            type="button"
            onClick={() => go(step === 1 ? 2 : ((step - 1) as SetupStep))}
            className="-ml-3 flex min-h-16 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone active:text-ash"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            {step === 1 ? "Về bộ bài" : "Bộ bài"}
          </button>
        )}
        <div className="-mr-4 flex">
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            aria-label="Sổ tay luật chơi và các vai"
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
        <ol className="grid grid-cols-2 gap-2">
          {STEPS.map((s, idx) => {
            const done = s.n < step;
            const active = s.n === step;
            const reachable = ready;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  disabled={!reachable || s.n === step}
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
                    {done ? <Check className="size-3" strokeWidth={2.5} /> : `0${idx + 1}`} {s.label}
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
              <h2 className="mt-8 font-display text-[clamp(3rem,15vw,5rem)] uppercase leading-[1.18] text-bone">
                Người chơi<span className="text-blood">.</span>
              </h2>
              <p className="mt-2 text-sm leading-snug text-ash">Quản trò không nhận bài nên không nhập tên mình.</p>

              {/* Người chơi */}
              <section className="mt-6">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Theo vòng ngồi</span>
                  <span className="font-display text-5xl leading-none tabular-nums text-bone">{String(players.length).padStart(2, "0")}</span>
                </div>
                <p className="mt-2 text-sm leading-snug text-ash">
                  Gõ tên từng người <span className="text-bone">lần lượt theo vòng ngồi</span> (người cuối ngồi cạnh người đầu) rồi bấm
                  Enter. Cần ít nhất {MIN_PLAYERS} người. Thứ tự này dùng cho vai Cáo.
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
              <h2 className="mt-8 font-display text-[clamp(3rem,15vw,5rem)] uppercase leading-[1.18] text-bone">
                Bộ bài<span className="text-blood">.</span>
              </h2>
              <p className="mt-2 text-sm leading-snug text-ash">
                {players.length} người chơi. Chọn ván này có những vai nào; Quản trò sẽ đọc to cho cả bàn biết trước khi chia.
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                className="mt-4 flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-line px-4 text-left active:bg-ink-2"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Người chơi · {players.length} người</span>
                  <span className="block truncate text-base text-bone">{players.map((p) => p.name).join(", ")}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-bone underline decoration-blood underline-offset-4">
                  Sửa tên
                </span>
              </button>
              <DeckEditor />
            </motion.section>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <h2 className="mt-8 font-display text-[clamp(3rem,15vw,5rem)] uppercase leading-[1.18] text-bone">
                Luật chơi<span className="text-blood">.</span>
              </h2>
              <p className="mt-2 text-sm leading-snug text-ash">Thống nhất với cả bàn trước khi chơi để khỏi cãi nhau giữa ván.</p>

              <div className="mt-6">
                <HouseRulesList compact />
              </div>

              <ThemePicker />

              <section className="mt-10">
                <label htmlFor="session-title" className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                  Tên ván <span className="text-blood">· bắt buộc</span>
                </label>
                <div className="mt-2 flex items-end gap-2">
                <input
                  id="session-title"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Đêm đẫm máu"
                  autoComplete="off"
                  enterKeyHint="done"
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && e.currentTarget.blur()}
                  className={`h-16 min-w-0 flex-1 border-b bg-transparent text-2xl font-medium text-bone outline-none placeholder:text-ash/40 focus:border-bone ${
                    sessionTitle.trim() ? "border-line" : "border-blood"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setSessionTitle(randomTitle(sessionTitle))}
                  aria-label="Gợi ý tên ván ngẫu nhiên"
                  className="grid size-16 shrink-0 place-items-center rounded-xl border border-line text-bone active:bg-ink-2"
                >
                  <Dices className="size-6" strokeWidth={1.75} />
                </button>
                </div>
                <p className="mt-2 text-sm text-ash">In lên ảnh tổng kết và ảnh Story. Bí ý tưởng thì bấm xúc xắc.</p>
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
                    step === 3 ? "cta-pulse-blood bg-blood text-bone" : "bg-bone text-ink"
                  }`}
                >
                  <span className="font-display text-3xl uppercase leading-[1.08]">{cta.label}</span>
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
                    {step === 3 ? (
                      <>
                        Đặt <span className="text-bone">tên ván</span> để bắt đầu
                      </>
                    ) : (
                      <>
                        Cần thêm <span className="text-bone">{missing}</span> người nữa
                      </>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <HouseRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Handbook
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onReplayGuide={() => {
          setBookOpen(false);
          setOnboarded(false);
        }}
      />

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
              <p className="mt-2 pt-[0.1em] font-display text-[clamp(2rem,9vw,2.75rem)] uppercase leading-[1.18] text-bone">
                Phe {verdict.favored === "VILLAGE" ? "Làng" : "Sói"} quá mạnh
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                Ước tính thắng khoảng {Math.round(Math.max(villageWinRate(deck.counts), 1 - villageWinRate(deck.counts)) * 100)}%
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
                    // Bấm chia bài mà bị lệch: cân bằng xong quay về bước bộ bài cho cả bàn xem lại.
                    if (lopsidedOpen === "start") go(2);
                    setLopsidedOpen(false);
                  }}
                  className="flex h-16 w-full items-center justify-center rounded-2xl bg-bone text-ink"
                >
                  <span className="font-display text-2xl uppercase leading-[1.08]">Cân bằng giúp, tôi xem lại</span>
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    const from = lopsidedOpen;
                    setLopsidedOpen(false);
                    if (from === "start") onStart(true);
                    else go(3);
                  }}
                  className="min-h-16 w-full font-mono text-[11px] uppercase tracking-[0.2em] text-ash active:text-bone"
                >
                  {lopsidedOpen === "start" ? "Kệ, vẫn chia bài" : "Kệ, vẫn đi tiếp"}
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

/** Chọn bộ hình lá bài. Bộ Pro hiện khóa, chạm vào thì báo sắp có. */
function ThemePicker() {
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  const current = activeTheme(theme).id;
  const [note, setNote] = useState(false);

  return (
    <section className="mt-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Bộ hình lá bài</p>
      <div role="radiogroup" aria-label="Bộ hình lá bài" className="mt-3 grid grid-cols-2 gap-3">
        {THEME_ORDER.map((id) => {
          const t = THEMES[id];
          const locked = t.pro && !PRO_THEMES_UNLOCKED;
          const on = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => (locked ? setNote(true) : (setTheme(id), setNote(false)))}
              className={`overflow-hidden rounded-2xl border text-left transition-colors ${on ? "border-blood" : "border-line"}`}
            >
              <span className="relative block aspect-[4/3] bg-ink-2">
                {[ "WOLF", "SEER", "WITCH" ].map((rid, k) => (
                  <span
                    key={rid}
                    className="absolute top-3 h-[80%] aspect-9/16 overflow-hidden rounded-md shadow-lg"
                    style={{ left: `${14 + k * 24}%`, transform: `rotate(${(k - 1) * 8}deg)`, zIndex: k === 1 ? 2 : 1 }}
                  >
                    <Image
                      src={cardSrc(t, rid)!}
                      alt=""
                      fill
                      sizes="80px"
                      className={`object-cover ${locked ? "blur-[3px] brightness-50" : ""}`}
                    />
                  </span>
                ))}
                {locked && (
                  <span className="absolute inset-0 z-10 grid place-items-center">
                    <span className="flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-bone">
                      <Lock className="size-3.5" strokeWidth={2} /> Pro
                    </span>
                  </span>
                )}
              </span>
              <span className="block px-3 py-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="pt-[0.1em] font-display text-xl uppercase leading-[1.2] text-bone">{t.name}</span>
                  {on && <Check className="size-5 shrink-0 text-blood" strokeWidth={2.5} />}
                </span>
                <span className="mt-1 block text-xs leading-snug text-ash">{t.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      {note && (
        <p className="mt-3 rounded-2xl border border-line px-4 py-3 text-sm leading-snug text-ash">
          Bộ <span className="text-bone">Sexy</span> sẽ mở trong bản Pro, sắp ra mắt. Tạm thời cả bàn dùng bộ Truyền thống nhé.
        </p>
      )}
    </section>
  );
}
