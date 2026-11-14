"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Minus, Plus } from "lucide-react";
import { isWolfRole, PRO_UNLOCKED, ROLE_ORDER, ROLES, SPECIAL_ROLES, type RoleId } from "@/constants/roles";
import { MIN_PLAYERS, useGameStore } from "@/store/gameStore";
import { maxWolves, resolveDeck, wolfTotal, type DeckConfig } from "@/utils/balancer";
import { DeckSummary } from "../DeckSummary";

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
};

export function DeckEditor() {
  const playerCount = useGameStore((s) => s.players.length);
  const customDeck = useGameStore((s) => s.customDeck);
  const setCustomDeck = useGameStore((s) => s.setCustomDeck);

  // Chưa đủ người thì xem trước theo số tối thiểu.
  const n = Math.max(playerCount, MIN_PLAYERS);
  const counts = resolveDeck(n, customDeck);
  const custom = customDeck !== null;
  const current: DeckConfig = { WOLF: counts.WOLF };
  for (const id of SPECIAL_ROLES) current[id] = counts[id];

  const wolves = wolfTotal(counts);
  const wolfCap = maxWolves(n);

  const change = (id: Exclude<RoleId, "VILLAGER">, delta: number) => {
    const lo = id === "WOLF" ? 1 : 0;
    const hi = id === "WOLF" ? wolfCap : 1;
    const next = Math.min(hi, Math.max(lo, counts[id] + delta));
    setCustomDeck({ ...current, [id]: next });
  };

  const canAdd = (id: RoleId) => {
    if (counts.VILLAGER === 0) return false;
    if (isWolfRole(id) && wolves >= wolfCap) return false;
    return id === "WOLF" ? true : counts[id] < 1;
  };

  const specials = SPECIAL_ROLES.reduce((sum, id) => sum + counts[id], 0);
  const warnings: string[] = [];
  if (wolves > Math.max(1, Math.floor(n / 3))) warnings.push("Sói đông, làng sẽ rất khó thắng.");
  if (wolves < Math.floor(n / 4)) warnings.push("Ít Sói quá, ván có thể kết thúc sớm.");
  if (specials === 0) warnings.push("Không có vai đặc biệt: làng chỉ còn cách đoán.");
  if (specials - (wolves - counts.WOLF) >= 4 && wolves <= 1) warnings.push("Nhiều vai phép mà chỉ 1 Sói: Sói gần như chắc thua.");
  if (counts.WHITE_WOLF && wolves < 3) warnings.push("Sói trắng nên đi cùng ít nhất 2 Sói khác.");

  const row = (id: RoleId) => {
    const fixed = id === "VILLAGER";
    const locked = ROLES[id].tier === "PRO" && !PRO_UNLOCKED;
    const wolfish = isWolfRole(id);
    return (
      <li key={id} className="flex min-h-20 items-center gap-3 border-b border-line py-2">
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-2 text-lg font-medium ${wolfish ? "text-blood" : "text-bone"}`}>
            {ROLES[id].name}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-ash">{fixed ? "Tự động = số người còn lại." : BLURB[id]}</span>
        </span>
        {fixed ? (
          <span className="w-16 text-center font-display text-3xl tabular-nums text-bone/70">{counts.VILLAGER}</span>
        ) : locked ? (
          <Lock className="mx-5 size-5 text-ash" strokeWidth={1.5} />
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

  const free = ROLE_ORDER.filter((id) => ROLES[id].tier === "FREE");
  const pro = ROLE_ORDER.filter((id) => ROLES[id].tier === "PRO");

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
            <p className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
              <span>Vai cơ bản · miễn phí</span>
              <span>
                Sói {wolves}/{wolfCap}
              </span>
            </p>
            <ul className="mt-1">{free.map(row)}</ul>

            <p className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
              <span className="rounded bg-blood px-1.5 py-0.5 font-semibold tracking-[0.15em] text-bone">PRO</span>
              Vai mở rộng {PRO_UNLOCKED && "· đang mở thử"}
            </p>
            <ul className="mt-1">{pro.map(row)}</ul>
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
            <DeckSummary counts={counts} label="" />
            <p className="mt-3 text-sm leading-snug text-ash">
              Khoảng 1 Sói cho mỗi 3 người, luôn có Tiên tri và Bảo vệ. Từ 7 người thêm Phù thủy, từ 9 người thêm Thợ săn. Muốn
              dùng vai PRO, chọn “Tự chọn vai”.
            </p>
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
    </div>
  );
}
