let ctx: AudioContext | null = null;

export function getAudioContext() {
  return ctx;
}

/** Một tiếng "thịch" trầm, ngắn: sóng sine rơi từ 90Hz xuống 35Hz. */
export function playThud() {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.65);
}

/**
 * iOS/Chrome chỉ cho phát âm thanh sau một cử chỉ của người dùng.
 * Gọi hàm này trong onClick để mở khoá AudioContext cho cả ván.
 */
export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") await ctx.resume();

    // Phát 1 buffer im lặng để Safari thực sự "mở" output.
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.state === "running";
  } catch {
    return false;
  }
}
