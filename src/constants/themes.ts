import { ROLES } from "./roles";
import { PRO_UNLOCKED } from "./pro";

export type ThemeId = "classic" | "chibi" | "sexy";

export interface Theme {
  id: ThemeId;
  name: string;
  blurb: string;
  /** Bộ hình dành cho bản Pro (chưa mở bán). */
  pro: boolean;
  /** Kích thước gốc của ảnh lá bài (để next/image giữ đúng tỉ lệ). */
  card: { w: number; h: number };
}

export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    id: "classic",
    name: "Truyền thống",
    blurb: "Tranh khắc gỗ mực đen, điểm đỏ son. Làng quê Việt, áo dài, nón lá.",
    pro: false,
    card: { w: 720, h: 1280 },
  },
  chibi: {
    id: "chibi",
    name: "Chibi",
    blurb: "Nhân vật đầu to mắt tròn, dễ thương mà vẫn rùng rợn. Hợp mọi lứa tuổi.",
    pro: false,
    card: { w: 720, h: 1280 },
  },
  sexy: {
    id: "sexy",
    name: "Gợi cảm",
    blurb: "Gothic tối, nhân vật quyến rũ. Dành cho hội bạn thân lớn tuổi.",
    pro: true,
    card: { w: 720, h: 980 },
  },
};

export const THEME_ORDER: ThemeId[] = ["classic", "chibi", "sexy"];

/** Bộ hình Pro mở theo cờ chung của bản Pro. */
export const PRO_THEMES_UNLOCKED = PRO_UNLOCKED;

/** Bộ hình thực sự dùng: bộ Pro chưa mở thì quay về Truyền thống. */
export const activeTheme = (id: ThemeId | undefined): Theme => {
  const t = THEMES[id ?? "classic"] ?? THEMES.classic;
  return t.pro && !PRO_THEMES_UNLOCKED ? THEMES.classic : t;
};

export type ArtName = "card-back" | "night" | "day" | "gallows" | "win-wolf" | "win-village" | "win-lovers" | "win-white-wolf";

export const cardSrc = (theme: Theme, id: string | null | undefined) =>
  id && id in ROLES ? `/themes/${theme.id}/cards/${id.toLowerCase()}.jpg` : null;

export const artSrc = (theme: Theme, name: ArtName) => `/themes/${theme.id}/art/${name}.jpg`;
