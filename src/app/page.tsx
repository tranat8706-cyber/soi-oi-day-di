"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore, useStoreHydrated, type GameState } from "@/store/gameStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SetupScreen } from "@/components/setup/SetupScreen";
import { PassAndPlayScreen } from "@/components/play/PassAndPlayScreen";
import { NightScreen } from "@/components/play/NightScreen";
import { DayScreen } from "@/components/play/DayScreen";
import { RecapScreen } from "@/components/play/RecapScreen";
import { SceneTransition, type Scene } from "@/components/play/SceneTransition";

/** Chuyển cảnh nào khi đổi màn (chỉ đêm buông và trời sáng; lùi lại thì không chiếu). */
function sceneFor(from: GameState, to: GameState): Scene | null {
  if (to === "NIGHT" && (from === "PASS_AND_PLAY" || from === "DAY")) return "night";
  if (to === "DAY" && from === "NIGHT") return "day";
  return null;
}

export default function Home() {
  const hydrated = useStoreHydrated();
  const gameState = useGameStore((s) => s.gameState);
  const nightNumber = useGameStore((s) => s.nightNumber);
  const undoDepth = useGameStore((s) => s.undoStack.length);
  const sound = useGameStore((s) => s.isSoundEnabled);
  useWakeLock();

  // Theo dõi màn trước ngay trong lúc render (không cần effect) để bật chuyển cảnh.
  const [prev, setPrev] = useState({ state: gameState, undo: undoDepth });
  const [scene, setScene] = useState<Scene | null>(null);
  if (prev.state !== gameState || prev.undo !== undoDepth) {
    const goingBack = undoDepth < prev.undo;
    const next = prev.state !== gameState && !goingBack ? sceneFor(prev.state, gameState) : null;
    setPrev({ state: gameState, undo: undoDepth });
    if (next) setScene(next);
  }
  const endScene = useCallback(() => setScene(null), []);

  if (!hydrated) return <div className="flex-1 bg-ink" aria-busy="true" />;

  let screen;
  switch (gameState) {
    case "PASS_AND_PLAY":
      screen = <PassAndPlayScreen />;
      break;
    case "NIGHT":
      screen = <NightScreen />;
      break;
    case "DAY":
      screen = <DayScreen />;
      break;
    case "END":
      screen = <RecapScreen />;
      break;
    default:
      screen = <SetupScreen />;
  }

  return (
    <>
      {screen}
      <AnimatePresence>
        {scene && <SceneTransition key={scene + nightNumber} scene={scene} round={nightNumber} sound={sound} onDone={endScene} />}
      </AnimatePresence>
    </>
  );
}
