"use client";

import { useGameStore, useStoreHydrated } from "@/store/gameStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SetupScreen } from "@/components/setup/SetupScreen";
import { PassAndPlayScreen } from "@/components/play/PassAndPlayScreen";
import { NightScreen } from "@/components/play/NightScreen";
import { DayScreen } from "@/components/play/DayScreen";
import { RecapScreen } from "@/components/play/RecapScreen";

export default function Home() {
  const hydrated = useStoreHydrated();
  const gameState = useGameStore((s) => s.gameState);
  useWakeLock();

  if (!hydrated) return <div className="flex-1 bg-ink" aria-busy="true" />;

  switch (gameState) {
    case "PASS_AND_PLAY":
      return <PassAndPlayScreen />;
    case "NIGHT":
      return <NightScreen />;
    case "DAY":
      return <DayScreen />;
    case "END":
      return <RecapScreen />;
    default:
      return <SetupScreen />;
  }
}
