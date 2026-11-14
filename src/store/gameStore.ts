import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { assignRoles as balanceRoles } from "@/utils/balancer";

export type GameState = "SETUP" | "PASS_AND_PLAY" | "NIGHT" | "DAY" | "END";

export interface Player {
  id: string;
  name: string;
  roleId: string | null;
  isAlive: boolean;
  avatarBase64?: string;
}

export interface HouseRules {
  witchSeesVictim: boolean;
  bodyguardSelfProtect: boolean;
}

export const MIN_PLAYERS = 5;

interface GameStore {
  sessionTitle: string;
  players: Player[];
  houseRules: HouseRules;
  gameState: GameState;
  isSoundEnabled: boolean;

  setSessionTitle: (title: string) => void;
  /** Trả về false nếu tên rỗng hoặc trùng. */
  addPlayer: (name: string) => boolean;
  renamePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;
  clearPlayers: () => void;
  setPlayerAvatar: (id: string, avatarBase64: string | undefined) => void;
  setHouseRule: <K extends keyof HouseRules>(key: K, value: HouseRules[K]) => void;
  toggleSound: () => void;
  /** id những người đã xem bài trong lượt chuyền tay. */
  revealedIds: string[];

  setGameState: (state: GameState) => void;
  /** Chia bài ngẫu nhiên (auto-balance), hồi sinh mọi người, chuyển sang PASS_AND_PLAY. */
  assignRoles: () => void;
  markRevealed: (id: string) => void;
  backToSetup: () => void;

  /** Đêm thứ mấy (bắt đầu từ 1). */
  nightNumber: number;
  /** Mục tiêu từng vai đã chọn trong đêm hiện tại. */
  nightActions: NightActions;
  /** Ngăn xếp các thao tác để hoàn tác theo đúng thứ tự. */
  nightHistory: NightHistoryEntry[];
  /** Người Bảo vệ che đêm trước (không được che lại liền). */
  lastGuardTargetId: string | null;
  /** Người chết đêm vừa qua, null nếu bình yên. */
  lastVictimId: string | null;
  /** Lời quản trò đọc khi gọi làng dậy. */
  morningScript: string;

  setNightAction: (roleId: NightRoleId, targetId: string) => void;
  /** Trả về thao tác vừa bị hoàn tác (hoặc null). */
  undoLastNightAction: () => NightHistoryEntry | null;
  /** Chốt kết quả đêm, sinh kịch bản sáng, chuyển sang DAY. */
  resolveNight: () => void;
  /** Từ ban ngày sang đêm kế tiếp. */
  startNextNight: () => void;

  /** Người bị treo cổ hôm nay (mỗi ngày tối đa 1). */
  lynchedTodayId: string | null;
  /** Phe thắng, null khi ván còn tiếp. */
  winner: Winner | null;
  /** Câu chốt hạ ván (hiện trên màn Recap). */
  endReason: string;
  /** Danh hiệu troll theo id người chơi, sinh 1 lần khi hết ván. */
  trollTitles: Record<string, string>;

  /** Treo cổ (bỏ phiếu hoặc vòng quay tử thần), rồi kiểm tra thắng thua. */
  lynch: (playerId: string, via: "VOTE" | "ROULETTE") => void;
  /** Kiểm tra thắng thua trên trạng thái hiện tại; nếu có phe thắng thì sang END. */
  checkWinCondition: () => Winner | null;
  /** Chia bài lại cho cùng nhóm, vào thẳng lượt chuyền tay. */
  rematch: () => void;
}

export type Winner = "WOLF" | "VILLAGER";

export type NightRoleId = "WOLF" | "SEER" | "GUARD";
export type NightActions = Partial<Record<NightRoleId, string>>;
export interface NightHistoryEntry {
  roleId: NightRoleId;
  targetId: string;
  /** Mục tiêu trước đó của vai này, để hoàn tác khôi phục đúng. */
  prevTargetId: string | undefined;
}

const freshRound = {
  revealedIds: [] as string[],
  nightNumber: 1,
  nightActions: {} as NightActions,
  nightHistory: [] as NightHistoryEntry[],
  lastGuardTargetId: null as string | null,
  lastVictimId: null as string | null,
  morningScript: "",
  lynchedTodayId: null as string | null,
  winner: null as Winner | null,
  endReason: "",
  trollTitles: {} as Record<string, string>,
};

/** Sói >= phần còn lại → Sói thắng; hết Sói → Làng thắng. */
export function computeWinner(players: Player[]): Winner | null {
  const alive = players.filter((p) => p.isAlive);
  const wolves = alive.filter((p) => p.roleId === "WOLF").length;
  if (wolves === 0) return "VILLAGER";
  if (wolves >= alive.length - wolves) return "WOLF";
  return null;
}

const TITLE_POOLS: Record<string, { won: string[]; lost: string[] }> = {
  WOLF: {
    won: ["Sát Nhân", "Ảnh Đế Trăm Năm", "Sói Đầu Đàn", "Thợ Săn Bóng Đêm", "Mặt Lạnh Tim Đen"],
    lost: ["Sói Ngáo", "Sói Ăn Chay", "Sói Lộ Hàng", "Sói Hiến Máu", "Sói Tự Khai"],
  },
  SEER: {
    won: ["Thần Nhãn", "Mắt Thần", "Nhà Tiên Tri Vũ Trụ", "Camera Chạy Bằng Cơm"],
    lost: ["Tiên Tri Mù", "Thầy Bói Xem Voi", "Kính Cận 10 Độ", "Soi Trật Lất"],
  },
  GUARD: {
    won: ["Lá Chắn Thép", "Vệ Sĩ Tận Tâm", "Bức Tường Thành"],
    lost: ["Bảo Vệ Ngủ Gật", "Khiên Giấy", "Vệ Sĩ Đi Lạc"],
  },
  VILLAGER: {
    won: ["Kẻ Trắng Án", "Công Dân Gương Mẫu", "Thánh Sống Sót", "Thám Tử Lá Cải"],
    lost: ["Cừu Non", "Bia Đỡ Đạn", "Dân Đen Vô Tội", "Kẻ Cả Tin"],
  },
};

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function buildTrollTitles(players: Player[], winner: Winner) {
  const out: Record<string, string> = {};
  for (const p of players) {
    const pools = TITLE_POOLS[p.roleId ?? "VILLAGER"] ?? TITLE_POOLS.VILLAGER;
    const won = (p.roleId === "WOLF") === (winner === "WOLF");
    // Người phe thắng nhưng đã chết: thỉnh thoảng thành liệt sĩ.
    out[p.id] = won && !p.isAlive && Math.random() < 0.35 ? "Liệt Sĩ Vô Danh" : pick(won ? pools.won : pools.lost);
  }
  return out;
}

/** Bản vá trạng thái khi ván kết thúc (hoặc rỗng nếu chưa). */
function endPatch(players: Player[], reason: string) {
  const winner = computeWinner(players);
  if (!winner) return null;
  return {
    gameState: "END" as const,
    winner,
    endReason: reason,
    trollTitles: buildTrollTitles(players, winner),
  };
}

export function buildMorningScript(victimName: string | null) {
  return victimName
    ? `Đêm qua là một đêm đẫm máu. Sói đã nhắm vào ${victimName}. Xin mời ${victimName} để lại di ngôn trước khi rời làng.`
    : "Đêm qua vô cùng tĩnh lặng, không có ai ngã xuống. Làng đang được thần linh che chở.";
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      sessionTitle: "",
      players: [],
      houseRules: { witchSeesVictim: true, bodyguardSelfProtect: true },
      gameState: "SETUP",
      isSoundEnabled: true,

      setSessionTitle: (sessionTitle) => set({ sessionTitle }),

      addPlayer: (raw) => {
        const name = normalize(raw);
        if (!name) return false;
        const taken = get().players.some(
          (p) => p.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
        );
        if (taken) return false;
        set((s) => ({
          players: [...s.players, { id: newId(), name, roleId: null, isAlive: true }],
        }));
        return true;
      },

      renamePlayer: (id, raw) => {
        const name = normalize(raw);
        if (!name) return;
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
        }));
      },

      removePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

      clearPlayers: () => set({ players: [] }),

      setPlayerAvatar: (id, avatarBase64) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, avatarBase64 } : p)),
        })),

      setHouseRule: (key, value) =>
        set((s) => ({ houseRules: { ...s.houseRules, [key]: value } })),

      toggleSound: () => set((s) => ({ isSoundEnabled: !s.isSoundEnabled })),

      setGameState: (gameState) => set({ gameState }),

      ...freshRound,

      assignRoles: () =>
        set((s) => ({
          ...freshRound,
          gameState: "PASS_AND_PLAY",
          players: balanceRoles(s.players.map((p) => ({ ...p, isAlive: true }))),
        })),

      markRevealed: (id) =>
        set((s) => (s.revealedIds.includes(id) ? s : { revealedIds: [...s.revealedIds, id] })),

      backToSetup: () =>
        set((s) => ({
          ...freshRound,
          gameState: "SETUP",
          players: s.players.map((p) => ({ ...p, roleId: null, isAlive: true })),
        })),

      setNightAction: (roleId, targetId) =>
        set((s) => {
          const prevTargetId = s.nightActions[roleId];
          if (prevTargetId === targetId) return s;
          return {
            nightActions: { ...s.nightActions, [roleId]: targetId },
            nightHistory: [...s.nightHistory, { roleId, targetId, prevTargetId }],
          };
        }),

      undoLastNightAction: () => {
        const { nightHistory, nightActions } = get();
        const last = nightHistory.at(-1);
        if (!last) return null;
        const next = { ...nightActions };
        if (last.prevTargetId === undefined) delete next[last.roleId];
        else next[last.roleId] = last.prevTargetId;
        set({ nightActions: next, nightHistory: nightHistory.slice(0, -1) });
        return last;
      },

      resolveNight: () =>
        set((s) => {
          const { WOLF: bitten, GUARD: guarded } = s.nightActions;
          const victim =
            bitten && bitten !== guarded
              ? s.players.find((p) => p.id === bitten && p.isAlive) ?? null
              : null;
          const players = victim
            ? s.players.map((p) => (p.id === victim.id ? { ...p, isAlive: false } : p))
            : s.players;
          const morningScript = buildMorningScript(victim?.name ?? null);
          return {
            gameState: "DAY",
            players,
            lastVictimId: victim?.id ?? null,
            lastGuardTargetId: guarded ?? null,
            morningScript,
            lynchedTodayId: null,
            nightActions: {},
            nightHistory: [],
            // checkWinCondition sau mỗi đêm.
            ...endPatch(players, morningScript),
          };
        }),

      startNextNight: () =>
        set((s) => ({
          gameState: "NIGHT",
          nightNumber: s.nightNumber + 1,
          nightActions: {},
          nightHistory: [],
          lynchedTodayId: null,
        })),

      lynch: (playerId, via) => {
        const s = get();
        const target = s.players.find((p) => p.id === playerId && p.isAlive);
        if (!target || s.lynchedTodayId || s.gameState !== "DAY") return;
        set({
          players: s.players.map((p) => (p.id === playerId ? { ...p, isAlive: false } : p)),
          lynchedTodayId: playerId,
          endReason:
            via === "ROULETTE"
              ? `Hòa phiếu. Vòng quay tử thần đã gọi tên ${target.name}.`
              : `Cả làng giơ tay. ${target.name} lên giá treo cổ.`,
        });
        get().checkWinCondition();
      },

      checkWinCondition: () => {
        const s = get();
        const patch = endPatch(s.players, s.endReason || s.morningScript);
        if (patch) set(patch);
        return patch?.winner ?? null;
      },

      rematch: () =>
        set((s) => ({
          ...freshRound,
          gameState: "PASS_AND_PLAY",
          players: balanceRoles(s.players.map((p) => ({ ...p, isAlive: true }))),
        })),
    }),
    {
      name: "soi-oi-day-di",
      version: 1,
      // Node 25+ có global `localStorage` giả phía server → chỉ đụng tới ở client.
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? (undefined as unknown as Storage) : window.localStorage,
      ),
      partialize: (s) => ({
        sessionTitle: s.sessionTitle,
        players: s.players,
        houseRules: s.houseRules,
        gameState: s.gameState,
        isSoundEnabled: s.isSoundEnabled,
        revealedIds: s.revealedIds,
        nightNumber: s.nightNumber,
        nightActions: s.nightActions,
        nightHistory: s.nightHistory,
        lastGuardTargetId: s.lastGuardTargetId,
        lastVictimId: s.lastVictimId,
        morningScript: s.morningScript,
        lynchedTodayId: s.lynchedTodayId,
        winner: s.winner,
        endReason: s.endReason,
        trollTitles: s.trollTitles,
      }),
    },
  ),
);

const subscribeHydration = (cb: () => void) => useGameStore.persist.onFinishHydration(cb);

/**
 * false trong lượt render hydrate đầu tiên (khớp HTML từ server), true khi
 * localStorage đã được nạp. Dùng để chặn hydration mismatch.
 */
export function useStoreHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useGameStore.persist.hasHydrated(),
    () => false,
  );
}
