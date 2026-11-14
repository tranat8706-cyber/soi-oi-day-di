type EventName = "game_started" | "player_added" | "avatar_captured";

/** Phase 1: chỉ log ra console. Sau này cắm provider thật vào đây. */
export function track(event: EventName, props: Record<string, unknown> = {}) {
  console.log(`[analytics] ${event}`, { ...props, at: new Date().toISOString() });
}
