"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleHelp, Plus, SlidersHorizontal, Smartphone } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, useGameStore } from "@/store/gameStore";
import { unlockAudio } from "@/utils/audio";
import { track } from "@/utils/analytics";
import { PlayerRow } from "./PlayerRow";
import { HouseRulesSheet } from "./HouseRulesSheet";
import { DeckEditor } from "./DeckEditor";
import { Onboarding } from "./Onboarding";

const QUICK_FILL = [6, 8, 10, 12];

const ease = [0.22, 1, 0.36, 1] as const;

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

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const missing = Math.max(0, MIN_PLAYERS - players.length);
  const ready = missing === 0;

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

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-safe">
      {/* Thanh trên */}
      <header className="flex items-center justify-between px-safe pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
          Quản trò · Offline
        </p>
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

      <main className="flex-1 px-safe pb-44">
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
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-4 max-w-[28ch] text-base leading-relaxed text-ash"
        >
          Một chiếc điện thoại. Một bàn người. Không ai được tin ai.
        </motion.p>

        {/* Ai cầm máy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease }}
          className="mt-10 flex gap-4 rounded-2xl border border-line bg-ink-2 px-4 py-4"
        >
          <Smartphone className="mt-0.5 size-6 shrink-0 text-blood" strokeWidth={1.5} />
          <p className="text-sm leading-relaxed text-bone/80">
            <span className="font-semibold text-bone">Bạn là Quản trò.</span> Bạn cầm máy dẫn truyện, không nhận bài nên
            không cần nhập tên mình. Chỉ nhập tên những người chơi.
          </p>
        </motion.div>

        {/* Người chơi */}
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">01 — Người chơi</span>
            <span className="font-display text-5xl leading-none tabular-nums text-bone">
              {String(players.length).padStart(2, "0")}
            </span>
          </div>
          <p className="mt-2 text-sm leading-snug text-ash">
            Gõ tên từng người rồi bấm <span className="text-bone">Enter</span>. Cần ít nhất {MIN_PLAYERS} người.
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
            <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-ash/50">
              {String(players.length + 1).padStart(2, "0")}
            </span>
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

        {/* Bộ bài */}
        <section className="mt-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">02 — Bộ bài</span>
          <p className="mt-2 text-sm leading-snug text-ash">
            Ván này gồm những vai nào. Quản trò đọc to cho cả bàn biết trước khi chia.
          </p>
          <DeckEditor />
        </section>

        {/* Tên ván */}
        <section className="mt-12">
          <label htmlFor="session-title" className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
            03 — Tên ván <span className="text-ash/50">· không bắt buộc</span>
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
      </main>

      {/* CTA cố định đáy */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-ink via-ink/95 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-xl px-safe pb-safe">
          <div className="pb-4">
            <AnimatePresence mode="wait" initial={false}>
              {ready ? (
                <motion.button
                  key="start"
                  type="button"
                  onClick={onStart}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="group flex h-20 w-full items-center justify-between rounded-2xl bg-bone px-6 text-ink"
                >
                  <span className="font-display text-3xl uppercase leading-none">Bắt đầu chia bài</span>
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

      <AnimatePresence>{!onboarded && <Onboarding key="onboarding" onDone={() => setOnboarded(true)} />}</AnimatePresence>
    </div>
  );
}
