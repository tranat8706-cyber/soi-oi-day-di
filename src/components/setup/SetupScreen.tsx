"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, SlidersHorizontal } from "lucide-react";
import { MIN_PLAYERS, useGameStore } from "@/store/gameStore";
import { unlockAudio } from "@/utils/audio";
import { track } from "@/utils/analytics";
import { PlayerRow } from "./PlayerRow";
import { HouseRulesSheet } from "./HouseRulesSheet";

const ease = [0.22, 1, 0.36, 1] as const;

export function SetupScreen() {
  const sessionTitle = useGameStore((s) => s.sessionTitle);
  const setSessionTitle = useGameStore((s) => s.setSessionTitle);
  const players = useGameStore((s) => s.players);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const clearPlayers = useGameStore((s) => s.clearPlayers);
  const houseRules = useGameStore((s) => s.houseRules);
  const assignRoles = useGameStore((s) => s.assignRoles);

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
      setError(`“${name}” đã ngồi ở bàn rồi.`);
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
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          aria-label="Luật nhà"
          className="-mr-4 grid size-16 place-items-center text-ash transition-colors active:text-bone"
        >
          <SlidersHorizontal className="size-6" strokeWidth={1.5} />
        </button>
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

        {/* Tên ván */}
        <section className="mt-14">
          <label htmlFor="session-title" className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
            01 — Tên ván
          </label>
          <input
            id="session-title"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Đêm đẫm máu"
            autoComplete="off"
            enterKeyHint="next"
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addRef.current?.focus()}
            className="mt-2 h-16 w-full border-b border-line bg-transparent text-2xl font-medium text-bone outline-none placeholder:text-ash/40 focus:border-bone"
          />
        </section>

        {/* Người chơi */}
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">02 — Người chơi</span>
            <span className="font-display text-5xl leading-none tabular-nums text-bone">
              {String(players.length).padStart(2, "0")}
            </span>
          </div>

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
                  {players.length === 0 ? "Chưa ai ngồi vào bàn." : "Danh sách được nhớ cho ván sau."}
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
    </div>
  );
}
