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

/** Tiếng sói tru xa: sóng răng cưa qua lọc thấp, cao dần rồi hạ, có rung. */
export function playHowl() {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(560, t + 0.7);
  osc.frequency.setValueAtTime(560, t + 1.3);
  osc.frequency.exponentialRampToValueAtTime(300, t + 2.2);
  lfo.frequency.value = 5.5;
  lfoGain.gain.value = 9;
  lfo.connect(lfoGain).connect(osc.frequency);
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 6;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.4);
  gain.gain.setValueAtTime(0.16, t + 1.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 2.4);
  lfo.stop(t + 2.4);
}

/** Tiếng chuông sáng: hai nốt ngân nhẹ. */
export function playDawn() {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const [freq, at] of [
    [660, 0],
    [990, 0.28],
    [1320, 0.56],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + at);
    gain.gain.exponentialRampToValueAtTime(0.22, t + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 1.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + at);
    osc.stop(t + at + 1.7);
  }
}
