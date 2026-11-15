/**
 * Avatar chân dung kiểu tranh khắc gỗ: 3 màu trắng ngà, mực đen, đỏ son, nét Việt
 * (nón lá, búi tóc, khăn rằn, áo dài, khăn vấn). Ngẫu nhiên nhưng cố định theo seed.
 * Hình vẽ trong khung 100x100, trả về danh sách hình để React dựng SVG.
 */

const INK = "#141210";
const BONE = "#ece7dd";
const RED = "#c3161c";
const BG = ["#3b342b", "#2f3739", "#40302c", "#372c3d", "#4a1c1f", "#3a3a30"];

export type Shape =
  | { t: "path"; d: string; fill?: string; stroke?: string; sw?: number; dash?: string; op?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; op?: number }
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; sw?: number };

const line = (d: string, sw = 2.4, stroke = INK): Shape => ({ t: "path", d, fill: "none", stroke, sw });
const solid = (d: string, fill = INK, stroke?: string, sw?: number): Shape => ({ t: "path", d, fill, stroke, sw });

/** Tóc phía sau đầu (vẽ trước mặt). */
const HAIR_BACK: Record<string, string> = {
  long: "M31 46 Q28 21 50 21 Q72 21 69 46 L73 86 L60 86 L63 54 L37 54 L40 86 L27 86Z",
  bob: "M31 46 Q29 21 50 21 Q71 21 69 46 L71 67 L59 67 L61 52 L39 52 L41 67 L29 67Z",
  ponytail: "M63 32 Q83 38 77 68 Q71 54 61 44Z",
};

/** Tóc phía trước (vẽ sau mặt). */
const HAIR_FRONT: Record<string, string> = {
  short: "M33 45 Q31 23 50 23 Q69 23 67 45 Q64 33 56 32 Q46 36 36 34 Q34 38 33 45Z",
  bowl: "M31 45 Q30 21 50 21 Q70 21 69 45 L68 39 Q50 36 32 39Z",
  side: "M33 46 Q31 22 50 22 Q70 23 67 46 Q62 31 44 33 Q38 36 33 46Z",
  spiky: "M33 43 L34 30 L39 33 L41 21 L46 29 L50 17 L54 28 L59 21 L61 32 L66 29 L67 43 Q58 34 50 35 Q42 34 33 43Z",
  center: "M33 47 Q31 23 50 23 Q69 23 67 47 Q61 30 50 33 Q39 30 33 47Z",
  bun: "M33 44 Q31 24 50 24 Q69 24 67 44 Q62 31 50 31 Q38 31 33 44Z",
};

const STYLES: { back?: string; front: string; extra?: Shape[] }[] = [
  { front: "short" },
  { front: "short" },
  { front: "side" },
  { front: "bowl" },
  { front: "spiky" },
  { back: "long", front: "center" },
  { back: "long", front: "center" },
  { back: "bob", front: "bowl" },
  { back: "bob", front: "center" },
  { front: "bun", extra: [{ t: "circle", cx: 50, cy: 17, r: 8, fill: INK }] },
  {
    front: "bun",
    extra: [
      { t: "circle", cx: 34, cy: 25, r: 7, fill: INK },
      { t: "circle", cx: 66, cy: 25, r: 7, fill: INK },
    ],
  },
  { back: "ponytail", front: "side" },
];

const EYES: Shape[][] = [
  [line("M40 48h6 M54 48h6", 2.6)],
  [
    { t: "circle", cx: 43, cy: 48, r: 2.3, fill: INK },
    { t: "circle", cx: 57, cy: 48, r: 2.3, fill: INK },
  ],
  [line("M40 49 Q43 45 46 49 M54 49 Q57 45 60 49", 2.3)],
  [
    { t: "ellipse", cx: 43, cy: 48, rx: 3.2, ry: 1.8, fill: INK },
    { t: "ellipse", cx: 57, cy: 48, rx: 3.2, ry: 1.8, fill: INK },
  ],
  [{ t: "circle", cx: 43, cy: 48, r: 2.3, fill: INK }, line("M54 49 Q57 45 60 49", 2.3)],
];

const MOUTHS: Shape[] = [
  line("M47 58h6", 2.2),
  line("M45 57 Q50 61.5 55 57", 2.2),
  { t: "ellipse", cx: 50, cy: 58.5, rx: 2.6, ry: 2.2, fill: RED },
  line("M46 58.5 Q51 59.5 55 56", 2.2),
];

/** Áo: vẽ thân + chi tiết. `fill` là màu vải. */
const OUTFITS: ((fill: string, trim: string) => Shape[])[] = [
  // Áo cổ tròn
  (f, t) => [solid("M10 100 Q12 74 50 72 Q88 74 90 100Z", f, INK, 2.5), line("M42 74 Q50 80 58 74", 2, t)],
  // Áo dài cổ cao
  (f, t) => [
    solid("M10 100 Q12 74 50 72 Q88 74 90 100Z", f, INK, 2.5),
    solid("M43 66 h14 v9 h-14Z", RED, INK, 2),
    line("M57 75 Q60 88 64 100", 2, t),
  ],
  // Áo bà ba
  (f, t) => [
    solid("M10 100 Q12 74 50 72 Q88 74 90 100Z", f, INK, 2.5),
    line("M42 73 L50 82 L58 73", 2, t),
    { t: "circle", cx: 50, cy: 88, r: 1.8, fill: t },
    { t: "circle", cx: 50, cy: 95, r: 1.8, fill: t },
  ],
  // Khăn rằn quàng cổ
  (f) => [
    solid("M10 100 Q12 74 50 72 Q88 74 90 100Z", f, INK, 2.5),
    { t: "path", d: "M30 77 Q50 87 70 77", fill: "none", stroke: RED, sw: 7 },
    { t: "path", d: "M30 77 Q50 87 70 77", fill: "none", stroke: INK, sw: 7, dash: "3 4", op: 0.85 },
    solid("M58 82 L66 96 L58 94Z", RED, INK, 1.5),
  ],
];

/** Nét khắc gạch bóng trên vai cho chất tranh khắc gỗ. */
const HATCH = line("M16 94 l7 -7 M22 98 l7 -7 M84 94 l-7 -7 M78 98 l-7 -7", 1.6);

const NON_LA: Shape[] = [
  solid("M12 35 L50 5 L88 35 Q50 41 12 35Z", BONE, INK, 2.5),
  line("M50 5 L34 37 M50 5 L50 39 M50 5 L66 37", 1.4),
  line("M36 37 Q38 60 45 66", 1.4, RED),
];
const KHAN_VAN: Shape[] = [solid("M31 40 Q30 23 50 22 Q70 23 69 40 Q50 33 31 40Z", RED, INK, 2.2), line("M38 26 L44 37 M50 23 L54 35 M60 25 L62 36", 1.3)];
const HEADBAND: Shape[] = [solid("M32 33 Q50 28 68 33 L68 38 Q50 33 32 38Z", RED, INK, 1.6)];
const GLASSES: Shape[] = [
  { t: "circle", cx: 43, cy: 48, r: 6, fill: "none", stroke: INK, sw: 2 },
  { t: "circle", cx: 57, cy: 48, r: 6, fill: "none", stroke: INK, sw: 2 },
  line("M49 47 h2", 2),
];
const BROWS = line("M39 42 L46 41 M54 41 L61 42", 2.2);
const CHEEKS: Shape[] = [
  { t: "circle", cx: 38.5, cy: 54.5, r: 3, fill: RED, op: 0.55 },
  { t: "circle", cx: 61.5, cy: 54.5, r: 3, fill: RED, op: 0.55 },
];
const FLOWER: Shape[] = [{ t: "circle", cx: 64, cy: 30, r: 3.6, fill: RED, stroke: INK, sw: 1.2 }];
const MOLE: Shape[] = [{ t: "circle", cx: 56, cy: 55, r: 1, fill: INK }];

/** Số giả ngẫu nhiên từ seed (FNV + mulberry32). */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function folkAvatar(seed: string): { bg: string; shapes: Shape[] } {
  const r = rng(seed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
  const chance = (p: number) => r() < p;

  const style = pick(STYLES);
  // Vải: trắng ngà, đỏ son hoặc đen viền ngà.
  const cloth = pick([BONE, BONE, RED, INK]);
  const trim = cloth === INK ? BONE : INK;
  const outfit = pick(OUTFITS)(cloth, trim);
  const hat = r();

  const shapes: Shape[] = [];
  if (style.back) shapes.push(solid(HAIR_BACK[style.back]));
  shapes.push(...outfit);
  if (cloth !== INK) shapes.push(HATCH);
  shapes.push(solid("M44 60 h12 v13 h-12Z", BONE, INK, 2.2)); // cổ
  shapes.push({ t: "ellipse", cx: 33.5, cy: 49, rx: 3, ry: 5, fill: BONE, stroke: INK, sw: 2 });
  shapes.push({ t: "ellipse", cx: 66.5, cy: 49, rx: 3, ry: 5, fill: BONE, stroke: INK, sw: 2 });
  shapes.push({ t: "ellipse", cx: 50, cy: 46, rx: 17, ry: 20, fill: BONE, stroke: INK, sw: 2.5 });
  if (hat < 0.1) shapes.push(...KHAN_VAN);
  else {
    shapes.push(solid(HAIR_FRONT[style.front]));
    if (style.extra) shapes.push(...style.extra);
  }
  if (chance(0.3)) shapes.push(BROWS);
  shapes.push(...pick(EYES));
  if (chance(0.12)) shapes.push(...GLASSES);
  shapes.push(pick(MOUTHS));
  if (chance(0.4)) shapes.push(...CHEEKS);
  if (chance(0.1)) shapes.push(...MOLE);
  if (hat >= 0.1 && hat < 0.26) shapes.push(...NON_LA);
  else if (hat >= 0.26 && hat < 0.34) shapes.push(...HEADBAND);
  else if (hat >= 0.34 && hat < 0.42 && style.back) shapes.push(...FLOWER);

  return { bg: pick(BG), shapes };
}
