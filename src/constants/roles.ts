export type RoleId = "WOLF" | "VILLAGER" | "SEER" | "GUARD";
export type Team = "WOLVES" | "VILLAGE";

export interface Role {
  id: RoleId;
  name: string;
  team: Team;
  /** Đọc cho người chơi khi lật bài. */
  description: string;
  /** Lời nhắc cho quản trò khi gọi vai này trong đêm. */
  gmInstruction: string;
  isNightActive: boolean;
  /** Thứ tự gọi trong đêm (nhỏ gọi trước). 0 = không thức dậy. */
  nightOrder: number;
}

export const ROLES: Record<RoleId, Role> = {
  WOLF: {
    id: "WOLF",
    name: "Sói",
    team: "WOLVES",
    description:
      "Mỗi đêm, cùng bầy sói mở mắt và chọn một người để cắn. Ban ngày, giả làm dân lành. Sói thắng khi số sói bằng số người còn lại.",
    gmInstruction: "Sói mở mắt, nhìn nhau. Chỉ tay chọn một người để cắn. Sói nhắm mắt.",
    isNightActive: true,
    nightOrder: 1,
  },
  SEER: {
    id: "SEER",
    name: "Tiên tri",
    team: "VILLAGE",
    description:
      "Mỗi đêm, chọn một người. Quản trò sẽ cho bạn biết người đó có phải Sói hay không. Dùng sự thật cho khéo, kẻo bị cắn trước.",
    gmInstruction:
      "Tiên tri mở mắt. Chỉ vào người muốn soi. (Gật đầu nếu là Sói, lắc đầu nếu không.) Tiên tri nhắm mắt.",
    isNightActive: true,
    nightOrder: 2,
  },
  GUARD: {
    id: "GUARD",
    name: "Bảo vệ",
    team: "VILLAGE",
    description:
      "Mỗi đêm, chọn một người để che chắn. Nếu Sói cắn đúng người đó, họ sống sót. Không được bảo vệ cùng một người hai đêm liền.",
    gmInstruction: "Bảo vệ mở mắt. Chỉ vào người muốn bảo vệ đêm nay. Bảo vệ nhắm mắt.",
    isNightActive: true,
    nightOrder: 3,
  },
  VILLAGER: {
    id: "VILLAGER",
    name: "Dân làng",
    team: "VILLAGE",
    description:
      "Bạn không có phép gì ngoài cái miệng và cái đầu. Ngủ yên qua đêm, ban ngày tìm ra Sói và treo cổ chúng.",
    gmInstruction: "Dân làng không thức dậy vào ban đêm.",
    isNightActive: false,
    nightOrder: 0,
  },
};

export const getRole = (id: string | null | undefined): Role | null =>
  id && id in ROLES ? ROLES[id as RoleId] : null;

/** Các vai thức dậy ban đêm, theo thứ tự gọi. */
export const NIGHT_SEQUENCE: Role[] = Object.values(ROLES)
  .filter((r) => r.isNightActive)
  .sort((a, b) => a.nightOrder - b.nightOrder);
