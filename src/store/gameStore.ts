import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isWolfRole, looksLikeWolf } from "@/constants/roles";
import { assignRoles as balanceRoles, type DeckConfig } from "@/utils/balancer";
import {
  applyDeaths,
  computeWinner,
  foxGroup,
  sideOf,
  type DeathCause,
  type DeathContext,
  type Winner,
} from "@/utils/rules";

export type { Winner, DeathCause } from "@/utils/rules";

export type GameState = "SETUP" | "PASS_AND_PLAY" | "NIGHT" | "DAY" | "END";

export interface Player {
  id: string;
  name: string;
  roleId: string | null;
  isAlive: boolean;
  avatarBase64?: string;
  /** Lá bài gốc nếu bị hóa Sói giữa ván (Sói nguyền, Đứa trẻ hoang). */
  formerRoleId?: string;
}

export interface HouseRules {
  bodyguardSelfProtect: boolean;
  /** Quản trò chỉ cho Phù thủy biết ai vừa bị cắn. Đọc bằng `!== false` (bản lưu cũ chưa có). */
  witchSeesVictim?: boolean;
  /** Bản cũ của elderPunish (true = "ANY"). */
  elderVillageKill?: boolean;
  /** Già làng chết vì phe Làng thì làng mất phép: không bao giờ / chỉ khi bị treo (mặc định) / mọi cách. */
  elderPunish?: ElderPunish;
  /** Sáng ra / sau khi treo, công khai vai của người chết. Mặc định tắt. */
  revealDeadRoles?: boolean;
  /** Hòa phiếu thì: quay ngẫu nhiên, bầu lại giữa những người bằng phiếu, hoặc không treo ai. */
  tieRule?: TieRule;
  /** Bắt buộc các vai chính (Sói, Bảo vệ, Tiên tri…) dùng phép mỗi đêm. Mặc định: được bỏ qua. */
  forceNightActions?: boolean;
}

export type TieRule = "ROULETTE" | "REVOTE" | "NONE";
export type SetupStep = 1 | 2 | 3;
export type ElderPunish = "NONE" | "LYNCH" | "ANY";

export const elderPunishOf = (h: HouseRules): ElderPunish => h.elderPunish ?? (h.elderVillageKill ? "ANY" : "LYNCH");

/** Một bước có thể lùi lại: nhãn để hiện cho quản trò và ảnh chụp trạng thái ván ngay trước bước đó. */
export interface UndoEntry {
  label: string;
  snap: Record<string, unknown>;
}

const UNDO_LIMIT = 12;

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

export type TrialVia = "VOTE" | "ROULETTE";

/** Các bước có màn riêng trong đêm. */
export type NightRoleId =
  | "CUPID"
  | "WILD_CHILD"
  | "GUARD"
  | "WOLF"
  | "WOLF_SEER"
  | "WHITE_WOLF"
  | "WITCH"
  | "SEER"
  | "FOX"
  | "KAMIKAZE"
  | "HARLOT";
/** Mỗi lựa chọn trong đêm. Một bước có thể có nhiều lựa chọn (Phù thủy 2 bình, Sói cắn 2 khi Sói con chết…). */
export type NightActionKey =
  | "CUPID" // "idA|idB"
  | "WILD_CHILD"
  | "GUARD"
  | "WOLF"
  | "WOLF_2"
  | "WOLF_CURSE"
  | "WOLF_SEER"
  | "WHITE_WOLF"
  | "WITCH_SAVE"
  | "WITCH_KILL"
  | "SEER"
  | "FOX"
  | "KAMIKAZE"
  | "HARLOT";
export type NightActions = Partial<Record<NightActionKey, string>>;

/** Bước (vai) chứa lựa chọn này. */
export const stepOf = (key: NightActionKey): NightRoleId =>
  key.startsWith("WITCH") ? "WITCH" : key === "WOLF_2" || key === "WOLF_CURSE" ? "WOLF" : (key as NightRoleId);

export interface NightHistoryEntry {
  roleId: NightActionKey;
  targetId: string | null;
  /** Mục tiêu trước đó của lựa chọn này, để hoàn tác khôi phục đúng. */
  prevTargetId: string | undefined;
}

interface GameStore {
  sessionTitle: string;
  players: Player[];
  houseRules: HouseRules;
  gameState: GameState;
  isSoundEnabled: boolean;

  /** Đã xem màn hướng dẫn lần đầu chưa. */
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  /** Bộ bài tự chọn; null = tự cân bằng theo số người. */
  customDeck: DeckConfig | null;
  setCustomDeck: (deck: DeckConfig | null) => void;
  /** Bước đang mở ở màn chuẩn bị: 1 người chơi, 2 bộ bài, 3 luật chơi. */
  setupStep: SetupStep;
  setSetupStep: (step: SetupStep) => void;
  /** Seed của bộ tự cân bằng: giữ nguyên thì bộ bài xem trước khớp với lúc chia. */
  autoSeed: number;
  /** Đổi sang một bộ tự cân bằng khác. */
  rerollAutoDeck: () => void;

  setSessionTitle: (title: string) => void;
  /** Trả về false nếu tên rỗng hoặc trùng. */
  addPlayer: (name: string) => boolean;
  /** Thêm nhanh cho đủ n người với tên "Người 1", "Người 2"… */
  fillPlayers: (n: number) => void;
  renamePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;
  clearPlayers: () => void;
  setPlayerAvatar: (id: string, avatarBase64: string | undefined) => void;
  setHouseRule: <K extends keyof HouseRules>(key: K, value: HouseRules[K]) => void;
  toggleSound: () => void;
  /** id những người đã xem bài trong lượt chuyền tay. */
  revealedIds: string[];

  setGameState: (state: GameState) => void;
  /** Chia bài ngẫu nhiên, hồi sinh mọi người, chuyển sang PASS_AND_PLAY. */
  assignRoles: () => void;
  markRevealed: (id: string) => void;
  backToSetup: () => void;

  /** Đêm thứ mấy (bắt đầu từ 1). */
  nightNumber: number;
  /** Lựa chọn trong đêm hiện tại. */
  nightActions: NightActions;
  /** Ngăn xếp các thao tác để hoàn tác theo đúng thứ tự. */
  nightHistory: NightHistoryEntry[];
  /** Người Bảo vệ che đêm trước (không được che lại liền). */
  lastGuardTargetId: string | null;
  /** Những người chết đêm vừa qua (rỗng nếu bình yên). */
  lastVictimIds: string[];
  /** Lời quản trò đọc khi gọi làng dậy. */
  morningScript: string;

  // ── Trạng thái theo vai, giữ suốt ván ──
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  /** Cặp đôi của Thần tình yêu. */
  loverIds: string[];
  /** Thần tượng của Đứa trẻ hoang. */
  wildModelId: string | null;
  /** Già làng đã chịu 1 lần cắn. */
  elderHit: boolean;
  /** Bầy đã dùng lời nguyền của Sói nguyền. */
  curseUsed: boolean;
  /** Sói con vừa chết: đêm tới bầy được cắn 2 người. */
  cubRevenge: boolean;
  /** Già làng bị dân treo: mọi vai phép phe Làng mất phép. */
  villagePowersLost: boolean;
  /** Cáo soi trượt (nhóm không có Sói) nên mất phép. */
  foxPowerLost: boolean;
  /** Thằng ngố đã lật bài (còn sống nhưng mất quyền bỏ phiếu). */
  idiotRevealedId: string | null;
  /** Kẻ cảm tử đã lao vào ai đó (1 lần cả ván). */
  kamikazeUsed: boolean;
  /** Nhà Con điếm ngủ đêm trước (không được ngủ lại liền). */
  lastHarlotTargetId: string | null;
  /** Đứa trẻ hoang vừa hóa Sói, quản trò cần báo cho họ ở đêm kế tiếp. */
  newWolfIds: string[];
  /** Các bước lớn (gọi làng dậy, treo, tha, bắn, sang đêm) để quản trò lùi lại khi lỡ tay. */
  undoStack: UndoEntry[];
  /** Lùi lại bước lớn gần nhất. */
  stepBack: () => void;

  /** Thợ săn vừa chết, đang chờ chọn người bắn (chưa kiểm tra thắng thua). */
  pendingHunterId: string | null;
  /** Người bị Thợ săn bắn gần nhất. */
  hunterShotId: string | null;
  /** Những người chết trong ngày hôm nay và lý do (treo, bị bắn, chết theo người yêu). */
  dayDeaths: { id: string; cause: DeathCause }[];

  /** targetId = null để bỏ chọn. */
  setNightAction: (key: NightActionKey, targetId: string | null) => void;
  /** Các bước Quản trò đã bấm "Đêm nay không dùng". */
  nightSkips: NightRoleId[];
  setNightSkip: (step: NightRoleId, skipped: boolean) => void;
  /** Trả về thao tác vừa bị hoàn tác (hoặc null). */
  undoLastNightAction: () => NightHistoryEntry | null;
  /** Chốt kết quả đêm, sinh kịch bản sáng, chuyển sang DAY. */
  resolveNight: () => void;
  /** Từ ban ngày sang đêm kế tiếp. */
  startNextNight: () => void;

  /** Người bị treo cổ hôm nay (mỗi ngày tối đa 1). */
  lynchedTodayId: string | null;
  /** Người đang đứng trên giàn bào chữa. */
  accusedId: string | null;
  accusedVia: TrialVia | null;
  /** Những người đã được tha trong ngày (không tố lại được). */
  sparedTodayIds: string[];

  accuse: (playerId: string, via: TrialVia) => void;
  cancelTrial: () => void;
  spare: () => void;
  /** Biểu quyết cuối: treo cổ người đang trên giàn, rồi kiểm tra thắng thua. */
  lynch: () => void;
  /** Thợ săn bắn (hoặc null = không bắn), rồi kiểm tra thắng thua. */
  hunterShoot: (targetId: string | null) => void;

  /** Phe thắng, null khi ván còn tiếp. */
  winner: Winner | null;
  /** Câu chốt hạ ván (hiện trên màn Recap). */
  endReason: string;
  /** Danh hiệu troll theo id người chơi, sinh 1 lần khi hết ván. */
  trollTitles: Record<string, string>;

  /** Kiểm tra thắng thua trên trạng thái hiện tại; nếu có phe thắng thì sang END. */
  checkWinCondition: () => Winner | null;
  /** Chia bài lại cho cùng nhóm, vào thẳng lượt chuyền tay. */
  rematch: () => void;
}

const freshRound = {
  revealedIds: [] as string[],
  nightNumber: 1,
  nightActions: {} as NightActions,
  nightHistory: [] as NightHistoryEntry[],
  nightSkips: [] as NightRoleId[],
  lastGuardTargetId: null as string | null,
  lastVictimIds: [] as string[],
  morningScript: "",
  witchHealUsed: false,
  witchPoisonUsed: false,
  loverIds: [] as string[],
  wildModelId: null as string | null,
  elderHit: false,
  curseUsed: false,
  cubRevenge: false,
  villagePowersLost: false,
  foxPowerLost: false,
  idiotRevealedId: null as string | null,
  kamikazeUsed: false,
  lastHarlotTargetId: null as string | null,
  newWolfIds: [] as string[],
  undoStack: [] as UndoEntry[],
  pendingHunterId: null as string | null,
  hunterShotId: null as string | null,
  dayDeaths: [] as { id: string; cause: DeathCause }[],
  lynchedTodayId: null as string | null,
  accusedId: null as string | null,
  accusedVia: null as TrialVia | null,
  sparedTodayIds: [] as string[],
  winner: null as Winner | null,
  endReason: "",
  trollTitles: {} as Record<string, string>,
};

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
  WITCH: {
    won: ["Dược Sư Thần Sầu", "Bà Đỡ Bóng Đêm", "Phù Thủy Tối Thượng"],
    lost: ["Phù Thủy Run Tay", "Độc Nhầm Đồng Đội", "Bình Hết Hạn"],
  },
  HUNTER: {
    won: ["Xạ Thủ Một Phát", "Viên Đạn Cuối", "Mắt Diều Hâu"],
    lost: ["Bắn Nhầm Quân Mình", "Súng Hết Đạn", "Thợ Săn Cận Thị"],
  },
  CUPID: {
    won: ["Bà Mối Thần Thánh", "Nguyệt Lão Tái Thế"],
    lost: ["Ghép Nhầm Đôi", "Mũi Tên Gãy"],
  },
  WILD_CHILD: {
    won: ["Con Ngoan Trò Giỏi", "Thần Tượng Bất Tử"],
    lost: ["Fan Cuồng Lạc Lối", "Trẻ Trâu Hóa Sói"],
  },
  WOLF_SEER: {
    won: ["Gián Điệp Bầy Đàn", "Mắt Sói Tinh Anh"],
    lost: ["Sói Đeo Kính Râm", "Soi Hoài Không Ra"],
  },
  WHITE_WOLF: {
    won: ["Kẻ Phản Bội Hoàn Hảo", "Bạch Lang Cô Độc"],
    lost: ["Sói Trắng Dính Bùn", "Phản Bội Bất Thành"],
  },
  FOX: {
    won: ["Cáo Già Tinh Ranh", "Mũi Thính Nhất Làng"],
    lost: ["Cáo Mất Mùi", "Cáo Ngửi Nhầm"],
  },
  CURSED_WOLF: {
    won: ["Phù Thủy Đen", "Lời Nguyền Ngàn Năm"],
    lost: ["Nguyền Nhầm Chỗ", "Bùa Hết Hạn"],
  },
  WOLF_CUB: {
    won: ["Sói Con Có Võ", "Báo Thù Thành Công"],
    lost: ["Sói Sữa", "Bé Sói Vô Dụng"],
  },
  ELDER: {
    won: ["Trưởng Lão Bất Tử", "Cây Đa Cây Đề"],
    lost: ["Già Mà Không Nên Nết", "Cụ Bị Hàng Xóm Hại"],
  },
  IDIOT: {
    won: ["Ngố Mà Thắng", "Đại Trí Giả Ngu"],
    lost: ["Ngố Thật Sự", "Cái Loa Phường"],
  },
  LYCAN: {
    won: ["Oan Thị Kính", "Mang Tiếng Sói Mà Hiền"],
    lost: ["Bị Soi Oan", "Sói Đội Lốt Người"],
  },
  KAMIKAZE: {
    won: ["Cảm Tử Quân", "Một Đổi Một"],
    lost: ["Lao Nhầm Đồng Đội", "Hy Sinh Vô Ích"],
  },
  HARLOT: {
    won: ["Ngủ Đâu Cũng Thoát", "Nữ Hoàng Bóng Đêm"],
    lost: ["Ngủ Nhầm Nhà Sói", "Đi Đêm Có Ngày Gặp Sói"],
  },
  VILLAGER: {
    won: ["Kẻ Trắng Án", "Công Dân Gương Mẫu", "Thánh Sống Sót", "Thám Tử Lá Cải"],
    lost: ["Cừu Non", "Bia Đỡ Đạn", "Dân Đen Vô Tội", "Kẻ Cả Tin"],
  },
};

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function buildTrollTitles(players: Player[], winner: Winner, loverIds: string[]) {
  const out: Record<string, string> = {};
  for (const p of players) {
    const pools = TITLE_POOLS[p.formerRoleId ?? p.roleId ?? "VILLAGER"] ?? TITLE_POOLS.VILLAGER;
    const won = sideOf(p, loverIds, winner) === winner;
    if (winner === "LOVERS" && won) out[p.id] = pick(["Romeo & Juliet", "Tình Yêu Bất Chấp", "Cặp Đôi Hoàn Cảnh"]);
    else if (won && !p.isAlive && Math.random() < 0.35) out[p.id] = "Liệt Sĩ Vô Danh";
    else out[p.id] = pick(won ? pools.won : pools.lost);
  }
  return out;
}

/** Bản vá trạng thái khi ván kết thúc (hoặc null nếu chưa). */
function endPatch(players: Player[], loverIds: string[], reason: string) {
  const winner = computeWinner(players, loverIds);
  if (!winner) return null;
  return {
    gameState: "END" as const,
    winner,
    endReason: reason,
    trollTitles: buildTrollTitles(players, winner, loverIds),
  };
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} và ${names.at(-1)}`;

/** Không tiết lộ nguyên nhân chết (Sói, bình độc, đau lòng…), chỉ nói ai đã ra đi. */
export function buildMorningScript(victimNames: string[]) {
  if (victimNames.length === 0)
    return "Đêm qua vô cùng tĩnh lặng, không có ai ngã xuống. Làng đang được thần linh che chở.";
  const who = joinNames(victimNames);
  return victimNames.length === 1
    ? `Đêm qua là một đêm đẫm máu. ${who} đã ra đi. Xin mời ${who} để lại di ngôn trước khi rời làng.`
    : `Đêm qua là một đêm đẫm máu. Cả ${who} đều đã ra đi. Xin mời từng người để lại di ngôn.`;
}

/** Chụp trạng thái ván hiện tại (bỏ ảnh đại diện cho nhẹ) rồi đẩy vào ngăn lùi. */
function pushUndo(s: GameStore, label: string): UndoEntry[] {
  const snap: Record<string, unknown> = {
    gameState: s.gameState,
    players: s.players.map((p) => ({ ...p, avatarBase64: undefined })),
  };
  for (const k of Object.keys(freshRound)) {
    if (k !== "undoStack") snap[k] = s[k as keyof GameStore];
  }
  return [...s.undoStack, { label, snap }].slice(-UNDO_LIMIT);
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Bỏ dấu vết của ván trước (sống lại, bỏ vai, bỏ vai gốc). */
const resetPlayers = (players: Player[]) =>
  players.map((p) => ({ ...p, roleId: null, isAlive: true, formerRoleId: undefined }));

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      sessionTitle: "",
      players: [],
      houseRules: {
        bodyguardSelfProtect: true,
        witchSeesVictim: true,
        elderPunish: "LYNCH",
        revealDeadRoles: false,
        tieRule: "ROULETTE",
      },
      gameState: "SETUP",
      isSoundEnabled: true,
      onboarded: false,
      customDeck: null,

      setOnboarded: (onboarded) => set({ onboarded }),
      setCustomDeck: (customDeck) => set({ customDeck }),
      setupStep: 1,
      setSetupStep: (setupStep) => set({ setupStep }),
      autoSeed: 1,
      rerollAutoDeck: () => set({ autoSeed: Math.floor(Math.random() * 1_000_000_000) }),
      setSessionTitle: (sessionTitle) => set({ sessionTitle }),

      addPlayer: (raw) => {
        const name = normalize(raw);
        if (!name || get().players.length >= MAX_PLAYERS) return false;
        const taken = get().players.some((p) => p.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"));
        if (taken) return false;
        set((s) => ({ players: [...s.players, { id: newId(), name, roleId: null, isAlive: true }] }));
        return true;
      },

      fillPlayers: (n) =>
        set((s) => {
          const taken = new Set(s.players.map((p) => p.name.toLocaleLowerCase("vi")));
          const players = [...s.players];
          for (let i = 1; players.length < Math.min(n, MAX_PLAYERS); i++) {
            const name = `Người ${i}`;
            if (taken.has(name.toLocaleLowerCase("vi"))) continue;
            players.push({ id: newId(), name, roleId: null, isAlive: true });
          }
          return { players };
        }),

      renamePlayer: (id, raw) => {
        const name = normalize(raw);
        if (!name) return;
        set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, name } : p)) }));
      },

      removePlayer: (id) => set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
      clearPlayers: () => set({ players: [] }),
      setPlayerAvatar: (id, avatarBase64) =>
        set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, avatarBase64 } : p)) })),
      setHouseRule: (key, value) => set((s) => ({ houseRules: { ...s.houseRules, [key]: value } })),
      toggleSound: () => set((s) => ({ isSoundEnabled: !s.isSoundEnabled })),
      setGameState: (gameState) => set({ gameState }),

      ...freshRound,

      assignRoles: () =>
        set((s) => ({
          ...freshRound,
          gameState: "PASS_AND_PLAY",
          players: balanceRoles(resetPlayers(s.players), s.customDeck, s.autoSeed),
        })),

      markRevealed: (id) =>
        set((s) => (s.revealedIds.includes(id) ? s : { revealedIds: [...s.revealedIds, id] })),

      backToSetup: () => set((s) => ({ ...freshRound, gameState: "SETUP", setupStep: 1, players: resetPlayers(s.players) })),

      setNightAction: (roleId, targetId) =>
        set((s) => {
          const prevTargetId = s.nightActions[roleId];
          if ((prevTargetId ?? null) === targetId) return s;
          const nightActions = { ...s.nightActions };
          if (targetId === null) delete nightActions[roleId];
          else nightActions[roleId] = targetId;
          return { nightActions, nightHistory: [...s.nightHistory, { roleId, targetId, prevTargetId }] };
        }),

      setNightSkip: (step, skipped) =>
        set((s) => {
          const has = s.nightSkips.includes(step);
          if (has === skipped) return s;
          if (!skipped) return { nightSkips: s.nightSkips.filter((x) => x !== step) };
          // Bỏ qua bước thì xóa luôn các lựa chọn đã chọn ở bước đó.
          const nightActions = { ...s.nightActions };
          for (const k of Object.keys(nightActions) as NightActionKey[]) if (stepOf(k) === step) delete nightActions[k];
          return { nightSkips: [...s.nightSkips, step], nightActions };
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
          const a = s.nightActions;
          const lost = s.villagePowersLost;
          const players = s.players.map((p) => ({ ...p }));
          const alive = (id?: string) => (id ? players.find((p) => p.id === id && p.isAlive) : undefined);

          // Đêm đầu: ghép đôi, chọn thần tượng.
          const cupidPair = a.CUPID?.split("|").filter(Boolean) ?? [];
          const loverIds = cupidPair.length === 2 ? cupidPair : s.loverIds;
          const wildModelId = s.wildModelId ?? a.WILD_CHILD ?? null;
          const ctx: DeathContext = { loverIds, wildModelId };

          const kills: [string, DeathCause][] = [];
          let elderHit = s.elderHit;
          let curseUsed = s.curseUsed;
          const cursedWolfAlive = players.some((p) => p.isAlive && p.roleId === "CURSED_WOLF");
          const bites = [...new Set([a.WOLF, s.cubRevenge ? a.WOLF_2 : undefined].filter((x): x is string => !!x))];
          // Con điếm đi ngủ nhà người khác (mất phép thì ở nhà).
          const harlot = players.find((p) => p.isAlive && p.roleId === "HARLOT");
          const harlotHost = !lost && harlot && a.HARLOT && a.HARLOT !== harlot.id ? alive(a.HARLOT) : undefined;

          for (const id of bites) {
            const p = alive(id);
            if (!p) continue;
            if (harlotHost && id === harlot?.id) continue; // cắn vào nhà trống
            if (!lost && id === a.GUARD) continue; // Bảo vệ che
            if (!lost && id === a.WITCH_SAVE) continue; // Phù thủy cứu
            if (p.roleId === "ELDER" && !elderHit) {
              elderHit = true; // Già làng chịu được lần cắn đầu
              continue;
            }
            if (a.WOLF_CURSE === id && !curseUsed && cursedWolfAlive && !isWolfRole(p.roleId)) {
              p.formerRoleId = p.roleId ?? undefined; // bị nguyền: hóa Sói thay vì chết
              p.roleId = "WOLF";
              curseUsed = true;
              continue;
            }
            kills.push([id, "BITE"]);
          }
          // Ngủ trúng nhà Sói, hoặc chủ nhà bị Sói cắn chết: Con điếm chết theo.
          if (harlot && harlotHost && (isWolfRole(harlotHost.roleId) || kills.some(([id, c]) => id === harlotHost.id && c === "BITE")))
            kills.push([harlot.id, "BITE"]);
          if (a.WHITE_WOLF && alive(a.WHITE_WOLF)) kills.push([a.WHITE_WOLF, "WHITE_WOLF"]);
          if (!lost && a.WITCH_KILL) kills.push([a.WITCH_KILL, "POISON"]); // bình độc xuyên khiên

          // Kẻ cảm tử lao vào: cả hai cùng chết, không ai cản được.
          const kamikaze = s.players.find((p) => p.roleId === "KAMIKAZE" && p.isAlive);
          const ram = !lost && !s.kamikazeUsed && kamikaze && a.KAMIKAZE && a.KAMIKAZE !== kamikaze.id ? a.KAMIKAZE : null;
          if (ram && kamikaze) kills.push([ram, "KAMIKAZE"], [kamikaze.id, "KAMIKAZE"]);

          // Cáo soi trượt thì mất phép.
          const foxMissed =
            !lost && !s.foxPowerLost && !!a.FOX && !foxGroup(s.players, a.FOX).some((p) => looksLikeWolf(p.roleId));

          const res = applyDeaths(players, kills, ctx);
          // Đọc tên theo thứ tự chỗ ngồi để không lộ ai chết vì gì, ai chết cùng ai.
          const victims = res.players.filter((p) => res.died.some((d) => d.id === p.id));
          const morningScript = buildMorningScript(victims.map((p) => p.name));
          const hunterId = !lost ? res.hunterId : null;
          // Luật nhà: Già làng chết vì phe Làng (độc, cảm tử) thì làng mất phép.
          const elderByVillage =
            elderPunishOf(s.houseRules) === "ANY" &&
            res.died.some((d) => (d.cause === "POISON" || d.cause === "KAMIKAZE") && players.find((p) => p.id === d.id)?.roleId === "ELDER");

          return {
            undoStack: pushUndo(s, `Gọi làng dậy sau đêm ${s.nightNumber}`),
            villagePowersLost: lost || elderByVillage,
            newWolfIds: res.wildChildTurnedId ? [res.wildChildTurnedId] : [],
            gameState: "DAY",
            players: res.players,
            lastVictimIds: victims.map((p) => p.id),
            lastGuardTargetId: a.GUARD ?? null,
            lastHarlotTargetId: harlotHost?.id ?? null,
            loverIds,
            wildModelId,
            elderHit,
            curseUsed,
            cubRevenge: res.cubDied, // lần trả thù (nếu có) đã dùng đêm nay
            foxPowerLost: s.foxPowerLost || foxMissed,
            kamikazeUsed: s.kamikazeUsed || !!ram,
            witchHealUsed: s.witchHealUsed || (!lost && !!a.WITCH_SAVE),
            witchPoisonUsed: s.witchPoisonUsed || (!lost && !!a.WITCH_KILL),
            pendingHunterId: hunterId,
            hunterShotId: null,
            dayDeaths: [],
            morningScript,
            lynchedTodayId: null,
            accusedId: null,
            accusedVia: null,
            sparedTodayIds: [],
            nightActions: {},
            nightSkips: [],
            nightHistory: [],
            // checkWinCondition sau mỗi đêm (đợi Thợ săn bắn xong nếu có).
            ...(hunterId ? null : endPatch(res.players, loverIds, morningScript)),
          };
        }),

      startNextNight: () =>
        set((s) => ({
          undoStack: pushUndo(s, `Sang đêm ${s.nightNumber + 1}`),
          gameState: "NIGHT",
          nightNumber: s.nightNumber + 1,
          nightActions: {},
          nightSkips: [],
          nightHistory: [],
          lynchedTodayId: null,
          accusedId: null,
          accusedVia: null,
          sparedTodayIds: [],
          pendingHunterId: null,
          hunterShotId: null,
          dayDeaths: [],
        })),

      accuse: (playerId, via) =>
        set((s) => {
          const ok =
            s.gameState === "DAY" &&
            !s.lynchedTodayId &&
            !s.pendingHunterId &&
            !s.sparedTodayIds.includes(playerId) &&
            s.players.some((p) => p.id === playerId && p.isAlive);
          return ok ? { accusedId: playerId, accusedVia: via } : s;
        }),

      cancelTrial: () => set({ accusedId: null, accusedVia: null }),

      spare: () =>
        set((s) =>
          s.accusedId
            ? {
                undoStack: pushUndo(s, `Tha ${s.players.find((p) => p.id === s.accusedId)?.name ?? ""}`),
                sparedTodayIds: [...s.sparedTodayIds, s.accusedId],
                accusedId: null,
                accusedVia: null,
              }
            : s,
        ),

      lynch: () => {
        const s = get();
        const target = s.players.find((p) => p.id === s.accusedId && p.isAlive);
        if (!target || s.lynchedTodayId || s.gameState !== "DAY" || s.pendingHunterId) return;

        // Thằng ngố bị treo lần đầu: lật bài, không chết.
        const undoStack = pushUndo(s, `Treo ${target.name}`);
        if (target.roleId === "IDIOT" && s.idiotRevealedId !== target.id) {
          set({ undoStack, idiotRevealedId: target.id, lynchedTodayId: target.id, accusedId: null, accusedVia: null });
          return;
        }

        const res = applyDeaths(s.players, [[target.id, "LYNCH"]], { loverIds: s.loverIds, wildModelId: s.wildModelId });
        const villagePowersLost =
          s.villagePowersLost || (target.roleId === "ELDER" && elderPunishOf(s.houseRules) !== "NONE");
        const hunterId = !villagePowersLost ? res.hunterId : null;
        set({
          undoStack,
          newWolfIds: res.wildChildTurnedId ? [...s.newWolfIds, res.wildChildTurnedId] : s.newWolfIds,
          players: res.players,
          lynchedTodayId: target.id,
          accusedId: null,
          accusedVia: null,
          villagePowersLost,
          cubRevenge: s.cubRevenge || res.cubDied,
          pendingHunterId: hunterId,
          dayDeaths: [...s.dayDeaths, ...res.died],
          endReason:
            s.accusedVia === "ROULETTE"
              ? `Hòa phiếu. Vòng quay tử thần gọi tên ${target.name}, và làng đã không tha.`
              : `Cả làng giơ tay. ${target.name} lên giá treo cổ.`,
        });
        // Thợ săn bắn xong mới kiểm tra thắng thua.
        if (!hunterId) get().checkWinCondition();
      },

      hunterShoot: (targetId) => {
        const s = get();
        const hunter = s.players.find((p) => p.id === s.pendingHunterId);
        if (!hunter) return;
        const target = targetId ? s.players.find((p) => p.id === targetId && p.isAlive && p.id !== hunter.id) : undefined;
        const base = s.lynchedTodayId === hunter.id ? s.endReason : s.morningScript;
        const res = target
          ? applyDeaths(s.players, [[target.id, "SHOT"]], { loverIds: s.loverIds, wildModelId: s.wildModelId })
          : null;
        set({
          undoStack: pushUndo(s, target ? `Thợ săn bắn ${target.name}` : "Thợ săn không bắn"),
          newWolfIds: res?.wildChildTurnedId ? [...s.newWolfIds, res.wildChildTurnedId] : s.newWolfIds,
          villagePowersLost:
            s.villagePowersLost || (elderPunishOf(s.houseRules) === "ANY" && target?.roleId === "ELDER"),
          players: res?.players ?? s.players,
          pendingHunterId: null,
          hunterShotId: target?.id ?? null,
          cubRevenge: s.cubRevenge || !!res?.cubDied,
          dayDeaths: [...s.dayDeaths, ...(res?.died ?? [])],
          endReason: target
            ? `${base} Trước khi gục, Thợ săn ${hunter.name} bắn chết ${target.name}.`
            : `${base} Thợ săn ${hunter.name} buông súng.`,
        });
        get().checkWinCondition();
      },

      stepBack: () => {
        const s = get();
        const last = s.undoStack.at(-1);
        if (!last) return;
        const snap = last.snap as Partial<GameStore>;
        const avatars = new Map(s.players.map((p) => [p.id, p.avatarBase64]));
        set({
          ...snap,
          players: (snap.players ?? s.players).map((p) => ({ ...p, avatarBase64: avatars.get(p.id) })),
          undoStack: s.undoStack.slice(0, -1),
        });
      },

      checkWinCondition: () => {
        const s = get();
        const patch = endPatch(s.players, s.loverIds, s.endReason || s.morningScript);
        if (patch) set(patch);
        return patch?.winner ?? null;
      },

      rematch: () =>
        set((s) => ({
          ...freshRound,
          gameState: "PASS_AND_PLAY",
          players: balanceRoles(resetPlayers(s.players), s.customDeck, s.autoSeed),
        })),
    }),
    {
      name: "soi-oi-day-di",
      version: 1,
      // Node 25+ có global `localStorage` giả phía server → chỉ đụng tới ở client.
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? (undefined as unknown as Storage) : window.localStorage,
      ),
      partialize: (s) => {
        const keep: Partial<GameStore> = {
          sessionTitle: s.sessionTitle,
          players: s.players,
          houseRules: s.houseRules,
          gameState: s.gameState,
          isSoundEnabled: s.isSoundEnabled,
          onboarded: s.onboarded,
          customDeck: s.customDeck,
          autoSeed: s.autoSeed,
        };
        // Toàn bộ trạng thái ván (để tải lại trang không mất ván).
        for (const k of Object.keys(freshRound) as (keyof typeof freshRound)[]) {
          (keep as Record<string, unknown>)[k] = s[k];
        }
        return keep;
      },
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
