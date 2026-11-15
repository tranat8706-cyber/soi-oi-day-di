import { useGameStore } from "@/store/gameStore";
import { activeTheme, artSrc, cardSrc, type ArtName } from "@/constants/themes";

/** Ảnh theo bộ hình đang dùng. */
export function useArt() {
  const theme = activeTheme(useGameStore((s) => s.theme));
  return {
    theme,
    card: (id: string | null | undefined) => cardSrc(theme, id),
    art: (name: ArtName) => artSrc(theme, name),
  };
}
