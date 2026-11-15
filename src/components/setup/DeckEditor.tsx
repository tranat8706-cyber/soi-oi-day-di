"use client";

import { PRO_UNLOCKED } from "@/constants/pro";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, Lock, Minus, Plus, Scale, Shuffle, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { isWolfRole, ROLE_ORDER, ROLES, SPECIAL_ROLES, type RoleId } from "@/constants/roles";
import { MIN_PLAYERS, useGameStore } from "@/store/gameStore";
import {
  balanceVerdict,
  maxWolves,
  rebalance,
  resolveDeck,
  SKILL_LEVELS,
  activeSkill,
  wolfTotal,
  type DeckConfig,
  type DeckCounts,
} from "@/utils/balancer";
import { BalanceMeter } from "./BalanceMeter";
import { useArt } from "@/hooks/useArt";
import { RoleInfoSheet } from "../RoleInfoSheet";

const ease = [0.22, 1, 0.36, 1] as const;

const BLURB: Record<RoleId, string> = {
  WOLF: "Đêm cắn một người. Thắng khi Sói đông bằng phần còn lại.",
  SEER: "Đêm soi một người: là Sói hay không.",
  GUARD: "Đêm che một người khỏi Sói. Không che 1 người 2 đêm liền.",
  WITCH: "1 bình cứu + 1 bình độc, mỗi bình dùng 1 lần cả ván.",
  HUNTER: "Chết thì được bắn chết theo một người.",
  VILLAGER: "Không có phép. Ban ngày tìm Sói mà treo.",
  CUPID: "Đêm đầu ghép đôi 2 người, chết thì chết cùng. Khác phe thì thành phe thứ ba.",
  CURSED_WOLF: "Sói. 1 lần cả ván: biến người bị cắn thành Sói thay vì giết.",
  WOLF_CUB: "Sói. Chết thì đêm sau bầy được cắn 2 người.",
  WOLF_SEER: "Sói. Mỗi đêm soi riêng 1 người để biết chính xác vai.",
  WHITE_WOLF: "Dậy cùng bầy nhưng chơi một mình. Đêm chẵn được giết 1 Sói.",
  ELDER: "Chịu được lần cắn đầu. Bị dân treo thì cả làng mất phép.",
  IDIOT: "Bị treo thì lật bài, không chết nhưng mất quyền bỏ phiếu.",
  FOX: "Đêm đánh hơi nhóm 3 người có Sói không. Trượt thì mất phép.",
  WILD_CHILD: "Đêm đầu chọn thần tượng. Thần tượng chết thì hóa Sói.",
  LYCAN: "Phe Làng, nhưng Tiên tri và Cáo soi ra Sói.",
  KAMIKAZE: "1 lần cả ván, đêm lao vào 1 người: cả hai cùng chết.",
  HARLOT: "Đêm ngủ nhà người khác: Sói cắn nhà mình thì thoát, ngủ trúng Sói hay nạn nhân thì chết.",
};

/** Ảnh nhỏ của lá bài (hoặc ô trống cùng cỡ nếu vai chưa có ảnh). */
function CardThumb({ id }: { id: RoleId }) {
  const src = useArt().card(id);
  return (
    <span className={`relative block h-[60px] w-11 shrink-0 overflow-hidden rounded-md ${src ? "" : "border border-dashed border-line"}`}>
      {src && <Image src={src} alt="" fill sizes="44px" className="object-cover" />}
    </span>
  );
}

/**
 * Bộ bài tự cân bằng hiện thành các lá bài nhỏ. Mỗi lần đổi bộ: một chồng bài úp xáo qua lại
 * rồi chia ra từng lá, lật mặt.
 */
function ShuffleDeck({ counts, shuffleKey }: { counts: DeckCounts; shuffleKey: string }) {
  const { card, art } = useArt();
  const reduce = useReducedMotion();
  // Lượt xáo đã xong cho bộ nào; khác bộ hiện tại nghĩa là đang xáo.
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [info, setInfo] = useState<RoleId | null>(null);
  const shuffling = !reduce && doneKey !== shuffleKey;
  const cards = ROLE_ORDER.flatMap((id) => Array.from({ length: counts[id] }, (_, k) => ({ id, key: `${id}-${k}` })));
  // Phe Sói trước, rồi phe Làng, mỗi vai một dòng kèm số lượng.
  const kinds = ROLE_ORDER.filter((id) => counts[id] > 0).sort((x, y) => Number(isWolfRole(y)) - Number(isWolfRole(x)));
  const wolfCount = cards.filter((c) => isWolfRole(c.id)).length;

  // Mở bước bộ bài hoặc đổi bộ: xáo một lượt rồi chia.
  useEffect(() => {
    if (reduce) return;
    navigator.vibrate?.([20, 40, 20, 40, 20]);
    const t = setTimeout(() => setDoneKey(shuffleKey), 900);
    return () => clearTimeout(t);
  }, [shuffleKey, reduce]);

  return (
    <div className="relative mt-4 min-h-40">
      <AnimatePresence mode="wait" initial={false}>
        {shuffling ? (
          <motion.div
            key="stack"
            className="relative mx-auto h-40 w-24"
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            aria-label="Đang xáo bài"
          >
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <motion.span
                key={k}
                className="absolute inset-0"
                initial={{ x: 0, rotate: 0 }}
                animate={{
                  x: [0, k % 2 ? 70 : -70, 0, k % 2 ? -50 : 50, 0],
                  rotate: [0, k % 2 ? 14 : -14, 0, k % 2 ? -8 : 8, (k - 2.5) * 2],
                  y: [0, -6 * (k % 3), 0, 4, -k * 1.5],
                }}
                transition={{ duration: 0.85, delay: k * 0.02, ease: "easeInOut" }}
                style={{ zIndex: k }}
              >
                <Image src={art("card-back")} alt="" fill sizes="96px" className="rounded-md object-cover shadow-lg" />
              </motion.span>
            ))}
          </motion.div>
        ) : (
          <motion.div key={`deal-${shuffleKey}`}>
            {/* Tóm tắt nhanh để Quản trò đọc to cho cả bàn */}
            <p className="pt-[0.1em] font-display text-3xl uppercase leading-[1.15] text-bone">
              {cards.length} lá · <span className="text-blood">{wolfCount} Sói</span> · {cards.length - wolfCount} Làng
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {kinds.map((id, i) => {
                const src = card(id);
                const wolf = isWolfRole(id);
                return (
                  <motion.li
                    key={id}
                    initial={reduce ? false : { opacity: 0, y: -24, rotateY: 90 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease }}
                  >
                    <button
                      type="button"
                      onClick={() => setInfo(id)}
                      aria-label={`Xem chức năng ${ROLES[id].name}`}
                      className={`flex h-16 w-full items-center gap-3 rounded-xl border pl-1.5 pr-3 text-left active:scale-[0.98] ${
                        wolf ? "border-blood/50 bg-blood/10" : "border-line bg-ink-2"
                      }`}
                    >
                      <span className="relative h-13 w-[1.85rem] shrink-0 overflow-hidden rounded-md">
                        {src && <Image src={src} alt="" fill sizes="32px" className="object-cover" />}
                      </span>
                      <span className={`min-w-0 flex-1 truncate pt-[0.1em] font-display text-2xl uppercase leading-[1.1] ${wolf ? "text-blood" : "text-bone"}`}>
                        {ROLES[id].name}
                      </span>
                      <span className="shrink-0 font-display text-2xl tabular-nums leading-none text-bone">
                        {counts[id] > 1 ? `×${counts[id]}` : ""}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Chạm vào vai để xem chức năng</p>
      <RoleInfoSheet id={info} onClose={() => setInfo(null)} />
    </div>
  );
}

/** Bộ bài đang dùng (tự cân bằng hoặc tự chọn) cho n người. Dùng chung với màn chuẩn bị. */
export function useCurrentDeck() {
  const playerCount = useGameStore((s) => s.players.length);
  const customDeck = useGameStore((s) => s.customDeck);
  const autoSeed = useGameStore((s) => s.autoSeed);
  const skill = useGameStore((s) => s.skill);
  // Chưa đủ người thì xem trước theo số tối thiểu.
  const n = Math.max(playerCount, MIN_PLAYERS);
  const counts = resolveDeck(n, customDeck, autoSeed, skill);
  return { n, counts, custom: customDeck !== null, playerCount, autoSeed, skill };
}

export function DeckEditor() {
  const setCustomDeck = useGameStore((s) => s.setCustomDeck);
  const rerollAutoDeck = useGameStore((s) => s.rerollAutoDeck);
  const { n, counts, custom, playerCount, autoSeed, skill } = useCurrentDeck();
  const setSkill = useGameStore((s) => s.setSkill);
  const [info, setInfo] = useState<RoleId | null>(null);

  const current: DeckConfig = { WOLF: counts.WOLF };
  for (const id of SPECIAL_ROLES) current[id] = counts[id];

  const wolves = wolfTotal(counts);
  const wolfCap = maxWolves(n);
  const verdict = balanceVerdict(counts);

  /** Sói đặc biệt thay chỗ 1 Sói thường (giữ nguyên tổng số Sói), bỏ ra thì trả lại Sói thường. */
  const swapsWolf = (id: RoleId) => id !== "WOLF" && isWolfRole(id);

  const change = (id: Exclude<RoleId, "VILLAGER">, delta: number) => {
    const lo = id === "WOLF" ? 1 : 0;
    const hi = id === "WOLF" ? wolfCap : 1;
    const next = Math.min(hi, Math.max(lo, counts[id] + delta));
    const deck: DeckConfig = { ...current, [id]: next };
    if (swapsWolf(id) && delta > 0 && counts.WOLF > 1) deck.WOLF = counts.WOLF - 1;
    if (swapsWolf(id) && delta < 0) deck.WOLF = counts.WOLF + 1;
    setCustomDeck(deck);
  };

  const canAdd = (id: RoleId) => {
    if (swapsWolf(id)) return counts[id] < 1 && (counts.WOLF > 1 || (wolves < wolfCap && counts.VILLAGER > 0));
    if (counts.VILLAGER === 0) return false;
    if (isWolfRole(id) && wolves >= wolfCap) return false;
    return id === "WOLF" ? true : counts[id] < 1;
  };

  const specials = SPECIAL_ROLES.reduce((sum, id) => sum + counts[id], 0);
  const warnings: string[] = [];
  if (specials === 0) warnings.push("Không có vai đặc biệt: làng chỉ còn cách đoán.");
  if (counts.WHITE_WOLF && wolves < 3) warnings.push("Sói trắng nên đi cùng ít nhất 2 Sói khác.");
  if (counts.WILD_CHILD && !counts.SEER && !counts.FOX) warnings.push("Có Đứa trẻ hoang mà không ai soi: Sói dễ được thêm người.");

  const row = (id: RoleId) => {
    const fixed = id === "VILLAGER";
    const wolfish = isWolfRole(id);
    return (
      <li key={id} className="flex min-h-20 items-center gap-3 border-b border-line py-2">
        <button
          type="button"
          onClick={() => setInfo(id)}
          aria-label={`Xem chức năng ${ROLES[id].name}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
        >
          <CardThumb id={id} />
          <span className="min-w-0 flex-1">
            <span className={`flex items-center gap-2 text-lg font-medium ${wolfish ? "text-blood" : "text-bone"}`}>
              {ROLES[id].name}
              <Info className="size-4 shrink-0 text-ash" strokeWidth={1.75} />
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-ash">{fixed ? "Tự động = số người còn lại." : BLURB[id]}</span>
          </span>
        </button>
        {fixed ? (
          <span className="w-16 text-center font-display text-3xl tabular-nums text-bone/70">{counts.VILLAGER}</span>
        ) : (
          <span className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label={`Bớt ${ROLES[id].name}`}
              disabled={counts[id] <= (id === "WOLF" ? 1 : 0)}
              onClick={() => change(id as Exclude<RoleId, "VILLAGER">, -1)}
              className="grid size-14 place-items-center rounded-full text-bone active:bg-ink-2 disabled:opacity-20"
            >
              <Minus className="size-5" strokeWidth={1.75} />
            </button>
            <span className="w-8 text-center font-display text-3xl tabular-nums text-bone">{counts[id]}</span>
            <button
              type="button"
              aria-label={`Thêm ${ROLES[id].name}`}
              disabled={!canAdd(id)}
              onClick={() => change(id as Exclude<RoleId, "VILLAGER">, 1)}
              className="grid size-14 place-items-center rounded-full text-bone active:bg-ink-2 disabled:opacity-20"
            >
              <Plus className="size-5" strokeWidth={1.75} />
            </button>
          </span>
        )}
      </li>
    );
  };

  const wolfRoles = ROLE_ORDER.filter((id) => isWolfRole(id));
  const villageRoles = ROLE_ORDER.filter((id) => !isWolfRole(id));
  const favoredName = verdict.favored === "VILLAGE" ? "Làng" : "Sói";
  const favoredPct = Math.round(Math.max(verdict.village, verdict.wolves) * 100);

  return (
    <div>
      {/* Chế độ */}
      <div role="radiogroup" aria-label="Cách chia bài" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-line p-1">
        {[
          { on: !custom, label: "Tự cân bằng", act: () => setCustomDeck(null) },
          { on: custom, label: "Tự chọn vai", act: () => setCustomDeck(current) },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={o.on}
            onClick={o.act}
            className={`h-14 rounded-xl font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
              o.on ? "bg-bone text-ink" : "text-ash active:text-bone"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <BalanceMeter counts={counts} />
      </div>

      {/* Lệch nặng: báo đỏ thật rõ, kèm nút cân bằng giúp */}
      <AnimatePresence>
        {custom && verdict.level === "lopsided" && (
          <motion.div
            key="lopsided"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl bg-blood px-4 py-4 text-bone">
              <p className="font-display text-2xl uppercase leading-tight">
                Phe {favoredName} quá mạnh · ~{favoredPct}%
              </p>
              <p className="mt-1 text-sm leading-snug text-bone/85">
                Ván dễ thành một chiều, phe kia chơi sẽ chán. Để app chỉnh lại vài lá, giữ các vai bạn đã chọn nhiều nhất có thể.
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setCustomDeck(rebalance(n, current))}
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-bone text-ink"
              >
                <Scale className="size-5" strokeWidth={2} />
                <span className="font-display text-xl uppercase leading-[1.08]">Cân bằng giúp tôi</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {custom ? (
          <motion.div
            key="custom"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <p className="mt-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-blood">
              <span>Phe Sói</span>
              <span>
                {wolves}/{wolfCap} lá
              </span>
            </p>
            <p className="mt-1 text-xs leading-snug text-ash">Thêm một Sói đặc biệt sẽ thay chỗ 1 Sói thường, tổng số Sói giữ nguyên.</p>
            <ul className="mt-1">{wolfRoles.map(row)}</ul>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">Phe Làng</p>
            <ul className="mt-1">{villageRoles.map(row)}</ul>

            {verdict.level !== "lopsided" && verdict.level !== "even" && (
              <button
                type="button"
                onClick={() => setCustomDeck(rebalance(n, current))}
                className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-line font-mono text-[11px] uppercase tracking-[0.2em] text-bone active:bg-ink-2"
              >
                <Scale className="size-4" strokeWidth={1.75} />
                Cân bằng giúp tôi
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            <div role="radiogroup" aria-label="Trình độ của nhóm" className="grid grid-cols-3 gap-1 rounded-2xl border border-line p-1">
              {SKILL_LEVELS.map((o) => {
                const locked = o.pro && !PRO_UNLOCKED;
                const on = activeSkill(skill) === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={locked}
                    onClick={() => setSkill(o.id)}
                    className={`flex h-12 items-center justify-center gap-1 rounded-xl font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                      on ? "bg-blood text-bone" : locked ? "text-ash/50" : "text-ash active:text-bone"
                    }`}
                  >
                    {locked && <Lock className="size-3" strokeWidth={2.5} />}
                    {o.short}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm leading-snug text-ash">
              {SKILL_LEVELS.find((o) => o.id === activeSkill(skill))?.hint}
              {!PRO_UNLOCKED && <span className="text-[#f5c15a]"> Trùm cuối server có trong bản Pro.</span>}
            </p>
            {/* Nút xáo đặt ngay trên bộ bài, to và sáng để cả bàn thấy. */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96, rotate: -1 }}
              onClick={rerollAutoDeck}
              className="mt-4 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-bone text-ink"
            >
              <Shuffle className="size-6" strokeWidth={2} />
              <span className="pt-[0.1em] font-display text-2xl uppercase leading-[1.08]">Xáo bộ khác</span>
            </motion.button>
            <ShuffleDeck counts={counts} shuffleKey={`${autoSeed}-${skill}-${n}`} />
            <button
              type="button"
              onClick={() => setCustomDeck(current)}
              className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-line text-bone active:bg-ink-2"
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.75} />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Sửa bộ này bằng tay</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {playerCount < MIN_PLAYERS && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ash/70">Đang xem trước cho {n} người</p>
      )}
      {custom &&
        warnings.map((w) => (
          <p key={w} className="mt-3 text-sm text-blood">
            {w}
          </p>
        ))}
      <RoleInfoSheet id={info} onClose={() => setInfo(null)} />
    </div>
  );
}
