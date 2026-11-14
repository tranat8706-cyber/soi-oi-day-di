export type RoleId =
  // FREE
  | "WOLF"
  | "VILLAGER"
  | "SEER"
  | "GUARD"
  | "WITCH"
  | "HUNTER"
  // PRO
  | "CUPID"
  | "CURSED_WOLF"
  | "ELDER"
  | "IDIOT"
  | "WHITE_WOLF"
  | "FOX"
  | "WILD_CHILD"
  | "WOLF_CUB"
  | "WOLF_SEER"
  | "LYCAN"
  | "KAMIKAZE";

/** WOLVES: thức dậy cùng bầy, Tiên tri soi ra Sói. Sói trắng thuộc bầy nhưng thắng một mình. */
export type Team = "WOLVES" | "VILLAGE";
/** FREE: bộ vai cơ bản phổ biến nhất. PRO: vai mở rộng cho bản trả phí. */
export type RoleTier = "FREE" | "PRO";

/** Chưa có cổng thanh toán: tạm mở khoá toàn bộ vai PRO. */
export const PRO_UNLOCKED = true;

export interface Role {
  id: RoleId;
  name: string;
  team: Team;
  tier: RoleTier;
  /** Đọc cho người chơi khi lật bài. */
  description: string;
  /** Lời nhắc cho quản trò khi gọi vai này trong đêm. */
  gmInstruction: string;
  /** Có bước riêng trong đêm (bầy Sói gọi chung ở bước Sói). */
  isNightActive: boolean;
  /** Thứ tự gọi trong đêm (nhỏ gọi trước). 0 = không có bước riêng. */
  nightOrder: number;
  /** Chỉ gọi đêm đầu tiên. */
  firstNightOnly?: boolean;
  /** Chỉ gọi các đêm chẵn (2, 4, 6…). */
  evenNightsOnly?: boolean;
}

const r = (role: Role) => role;

export const ROLES: Record<RoleId, Role> = {
  // ───────── FREE ─────────
  WOLF: r({
    id: "WOLF",
    name: "Sói",
    team: "WOLVES",
    tier: "FREE",
    description:
      "Mỗi đêm, cùng bầy sói mở mắt và chọn một người để cắn. Ban ngày, giả làm dân lành. Sói thắng khi số sói bằng số người còn lại.",
    gmInstruction: "Sói mở mắt, nhìn nhau. Chỉ tay chọn một người để cắn. Sói nhắm mắt.",
    isNightActive: true,
    nightOrder: 4,
  }),
  SEER: r({
    id: "SEER",
    name: "Tiên tri",
    team: "VILLAGE",
    tier: "FREE",
    description:
      "Mỗi đêm, chọn một người. Quản trò sẽ cho bạn biết người đó có phải Sói hay không. Dùng sự thật cho khéo, kẻo bị cắn trước.",
    gmInstruction:
      "Tiên tri mở mắt. Chỉ vào người muốn soi. (Gật đầu nếu là Sói, lắc đầu nếu không.) Tiên tri nhắm mắt.",
    isNightActive: true,
    nightOrder: 8,
  }),
  GUARD: r({
    id: "GUARD",
    name: "Bảo vệ",
    team: "VILLAGE",
    tier: "FREE",
    description:
      "Mỗi đêm, chọn một người để che chắn. Nếu Sói cắn đúng người đó, họ sống sót. Không được bảo vệ cùng một người hai đêm liền.",
    gmInstruction: "Bảo vệ mở mắt. Chỉ vào người muốn bảo vệ đêm nay. Bảo vệ nhắm mắt.",
    isNightActive: true,
    nightOrder: 3,
  }),
  WITCH: r({
    id: "WITCH",
    name: "Phù thủy",
    team: "VILLAGE",
    tier: "FREE",
    description:
      "Bạn có 2 bình, mỗi bình dùng 1 lần cả ván. Bình cứu: cứu người vừa bị Sói cắn. Bình độc: giết một người bất kỳ. Dùng đúng lúc, đừng phí.",
    gmInstruction:
      "Phù thủy mở mắt. Đêm nay người này bị cắn (chỉ tay). Có muốn dùng bình cứu không? Có muốn dùng bình độc lên ai không? Phù thủy nhắm mắt.",
    isNightActive: true,
    nightOrder: 7,
  }),
  HUNTER: r({
    id: "HUNTER",
    name: "Thợ săn",
    team: "VILLAGE",
    tier: "FREE",
    description:
      "Khi bạn chết (bị cắn hoặc bị treo), bạn được bắn chết ngay một người bất kỳ. Riêng chết vì bình độc của Phù thủy thì không kịp bắn.",
    gmInstruction: "Thợ săn không thức dậy ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  }),
  VILLAGER: r({
    id: "VILLAGER",
    name: "Dân làng",
    team: "VILLAGE",
    tier: "FREE",
    description:
      "Bạn không có phép gì ngoài cái miệng và cái đầu. Ngủ yên qua đêm, ban ngày tìm ra Sói và treo cổ chúng.",
    gmInstruction: "Dân làng không thức dậy vào ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  }),

  // ───────── PRO ─────────
  CUPID: r({
    id: "CUPID",
    name: "Thần tình yêu",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Đêm đầu tiên, bắn tên ghép đôi 2 người (có thể gồm chính bạn). Một người chết, người kia chết theo vì đau lòng. Nếu cặp đôi khác phe, họ chỉ thắng khi là 2 người cuối cùng còn sống.",
    gmInstruction:
      "Thần tình yêu mở mắt. Chỉ vào 2 người sẽ yêu nhau. Thần tình yêu nhắm mắt. (Chạm vai 2 người đó: mở mắt nhìn nhau rồi nhắm lại.)",
    isNightActive: true,
    nightOrder: 1,
    firstNightOnly: true,
  }),
  WILD_CHILD: r({
    id: "WILD_CHILD",
    name: "Đứa trẻ hoang",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Đêm đầu tiên, chọn một người làm thần tượng. Còn thần tượng sống, bạn là Dân làng. Thần tượng chết, bạn hóa Sói và dậy cùng bầy từ đêm sau.",
    gmInstruction: "Đứa trẻ hoang mở mắt. Chỉ vào người bạn chọn làm thần tượng. Đứa trẻ hoang nhắm mắt.",
    isNightActive: true,
    nightOrder: 2,
    firstNightOnly: true,
  }),
  WOLF_SEER: r({
    id: "WOLF_SEER",
    name: "Sói tiên tri",
    team: "WOLVES",
    tier: "PRO",
    description:
      "Bạn là Sói, dậy cắn cùng bầy. Sau đó mỗi đêm được soi riêng một người để biết chính xác vai của họ. Săn Tiên tri trước khi bị lộ.",
    gmInstruction: "Sói tiên tri mở mắt. Chỉ vào người muốn soi. (Ra hiệu vai của người đó.) Sói tiên tri nhắm mắt.",
    isNightActive: true,
    nightOrder: 5,
  }),
  WHITE_WOLF: r({
    id: "WHITE_WOLF",
    name: "Sói trắng",
    team: "WOLVES",
    tier: "PRO",
    description:
      "Bạn dậy cắn cùng bầy như Sói thường, nhưng bạn chơi một mình. Mỗi đêm chẵn, bạn dậy riêng và được giết một con Sói. Bạn chỉ thắng khi là người cuối cùng còn sống.",
    gmInstruction: "Sói trắng mở mắt. Có muốn giết một con Sói không? Chỉ tay. Sói trắng nhắm mắt.",
    isNightActive: true,
    nightOrder: 6,
    evenNightsOnly: true,
  }),
  FOX: r({
    id: "FOX",
    name: "Cáo",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Mỗi đêm, chỉ vào một người. Quản trò cho biết trong nhóm 3 người (người đó và 2 người ngồi sát hai bên) có Sói hay không. Nếu không có Sói nào, bạn mất phép vĩnh viễn.",
    gmInstruction: "Cáo mở mắt. Chỉ vào một người. (Gật nếu nhóm 3 người có Sói, lắc nếu không.) Cáo nhắm mắt.",
    isNightActive: true,
    nightOrder: 9,
  }),
  CURSED_WOLF: r({
    id: "CURSED_WOLF",
    name: "Sói nguyền",
    team: "WOLVES",
    tier: "PRO",
    description:
      "Bạn là Sói, dậy cắn cùng bầy. Một lần duy nhất trong ván, bầy có thể nguyền người bị cắn: người đó không chết mà hóa thành Sói.",
    gmInstruction: "Sói nguyền dậy cùng bầy Sói.",
    isNightActive: false,
    nightOrder: 0,
  }),
  WOLF_CUB: r({
    id: "WOLF_CUB",
    name: "Sói con",
    team: "WOLVES",
    tier: "PRO",
    description:
      "Bạn là Sói, dậy cắn cùng bầy. Nếu bạn chết, bầy Sói nổi giận: đêm kế tiếp được cắn 2 người.",
    gmInstruction: "Sói con dậy cùng bầy Sói.",
    isNightActive: false,
    nightOrder: 0,
  }),
  ELDER: r({
    id: "ELDER",
    name: "Già làng",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Bạn sống dai: chịu được lần đầu bị Sói cắn. Nhưng nếu dân làng treo cổ bạn, cả làng bị trời phạt: mọi vai có phép bên phe Làng đều mất phép.",
    gmInstruction: "Già làng không thức dậy ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  }),
  IDIOT: r({
    id: "IDIOT",
    name: "Thằng ngố",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Nếu bị dân làng treo cổ, bạn lật bài và được tha vì ai cũng biết bạn ngố, nhưng từ đó mất quyền bỏ phiếu. Bị treo lần nữa thì chết thật.",
    gmInstruction: "Thằng ngố không thức dậy ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  }),
  LYCAN: r({
    id: "LYCAN",
    name: "Bán sói",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Bạn là dân làng, thắng cùng phe Làng, nhưng trong người mang dòng máu Sói: Tiên tri soi bạn sẽ ra Sói. Hãy thuyết phục cả làng tin mình.",
    gmInstruction: "Bán sói không thức dậy ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  }),
  KAMIKAZE: r({
    id: "KAMIKAZE",
    name: "Kẻ cảm tử",
    team: "VILLAGE",
    tier: "PRO",
    description:
      "Một lần duy nhất trong ván, vào ban đêm, bạn lao vào một người bất kỳ: sáng ra cả hai cùng chết. Không gì cản được. Chọn sai thì làng mất hai người.",
    gmInstruction: "Kẻ cảm tử mở mắt. Đêm nay có muốn lao vào ai không? Chỉ tay, hoặc lắc đầu. Kẻ cảm tử nhắm mắt.",
    isNightActive: true,
    nightOrder: 10,
  }),
};

/** Thứ tự hiển thị vai trong bộ bài. */
export const ROLE_ORDER: RoleId[] = [
  "WOLF",
  "SEER",
  "GUARD",
  "WITCH",
  "HUNTER",
  "CURSED_WOLF",
  "WOLF_CUB",
  "WOLF_SEER",
  "WHITE_WOLF",
  "CUPID",
  "ELDER",
  "IDIOT",
  "FOX",
  "WILD_CHILD",
  "LYCAN",
  "KAMIKAZE",
  "VILLAGER",
];

/** Các vai đặc biệt (tối đa 1 lá mỗi vai), không gồm Sói thường và Dân. */
export const SPECIAL_ROLES = ROLE_ORDER.filter((id) => id !== "WOLF" && id !== "VILLAGER") as Exclude<
  RoleId,
  "WOLF" | "VILLAGER"
>[];
export type SpecialRoleId = Exclude<RoleId, "WOLF" | "VILLAGER">;

export const getRole = (id: string | null | undefined): Role | null =>
  id && id in ROLES ? ROLES[id as RoleId] : null;

/** Thuộc bầy Sói (Tiên tri soi ra Sói, dậy cùng bầy). */
export const isWolfRole = (id: string | null | undefined) => getRole(id)?.team === "WOLVES";

/** Tiên tri và Cáo soi ra Sói: bầy Sói và Bán sói. */
export const looksLikeWolf = (id: string | null | undefined) => isWolfRole(id) || id === "LYCAN";

/** Các vai có bước riêng ban đêm, theo thứ tự gọi. */
export const NIGHT_SEQUENCE: Role[] = Object.values(ROLES)
  .filter((role) => role.isNightActive)
  .sort((a, b) => a.nightOrder - b.nightOrder);

/** Vai này có được gọi trong đêm thứ `night` không. */
export const wakesOnNight = (role: Role, night: number) =>
  role.isNightActive && (!role.firstNightOnly || night === 1) && (!role.evenNightsOnly || night % 2 === 0);
