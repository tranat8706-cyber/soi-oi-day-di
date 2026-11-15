import { getRole, isWolfRole } from "@/constants/roles";
import type { LogEntry } from "./gameLog";

export interface StoryData {
  winnerLabel: string;
  /** Màu chủ đạo theo phe thắng. */
  accent: string;
  artSrc: string;
  title: string;
  date: string;
  nights: number;
  players: { name: string; roleId: string | null; formerRoleId?: string; isAlive: boolean; lover: boolean }[];
  log: LogEntry[];
  best?: { name: string; count: number };
  worst?: { name: string; count: number };
}

const W = 1080;
const H = 1920;

const cssVar = (name: string, fallback: string) =>
  (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cắt chữ cho vừa bề rộng, thêm dấu "…". */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

/** Nhãn dán nghiêng kiểu sticker. */
function sticker(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, bg: string, fg: string, lines: [string, string], fonts: [string, string]) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = fonts[0];
  const w1 = ctx.measureText(lines[0]).width;
  ctx.font = fonts[1];
  const w2 = ctx.measureText(lines[1]).width;
  const w = Math.max(w1, w2) + 56;
  const h = 150;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, -w / 2, -h / 2, w, h, 26);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.font = fonts[0];
  ctx.fillText(lines[0], 0, -14);
  ctx.font = fonts[1];
  ctx.fillText(lines[1], 0, 46);
  ctx.restore();
}

/** Vẽ ảnh Story 9:16 tóm tắt cục diện ván. */
export async function renderStory(d: StoryData): Promise<Blob> {
  await document.fonts?.ready;
  const display = cssVar("--font-anton", "Impact");
  const sans = cssVar("--font-be-vietnam", "system-ui");
  const mono = cssVar("--font-jetbrains", "monospace");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  // Nền + ảnh phe thắng ở nửa trên.
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);
  try {
    const art = await loadImage(d.artSrc);
    const h = (art.height / art.width) * W;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(art, 0, 0, W, h);
    ctx.globalAlpha = 1;
  } catch {
    /* thiếu ảnh thì để nền đen */
  }
  const fade = ctx.createLinearGradient(0, 0, 0, 1250);
  fade.addColorStop(0, "rgba(9,9,11,0.15)");
  fade.addColorStop(0.55, "rgba(9,9,11,0.55)");
  fade.addColorStop(1, "rgba(9,9,11,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, 1250);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 1250, W, H - 1250);

  // Đầu trang
  ctx.fillStyle = "rgba(236,231,221,0.75)";
  ctx.font = `600 30px ${mono}`;
  ctx.textAlign = "left";
  ctx.fillText("SÓI ƠI DẬY ĐI!", 72, 110);
  ctx.textAlign = "right";
  ctx.fillText(d.date, W - 72, 110);

  // Tiêu đề lớn
  ctx.textAlign = "left";
  ctx.fillStyle = d.accent;
  ctx.shadowColor = d.accent;
  ctx.shadowBlur = 40;
  ctx.font = `230px ${display}`;
  ctx.fillText(fit(ctx, d.winnerLabel.toUpperCase(), W - 144), 64, 560);
  ctx.fillText("THẮNG.", 64, 800);
  ctx.shadowBlur = 0;

  // Sticker GG
  const deaths = d.players.filter((p) => !p.isAlive).length;
  const bads = d.log.filter((e) => e.tone === "bad").length;
  const goods = d.log.filter((e) => e.tone === "good").length;
  const vibe = bads > goods ? ["TOANG", "cả bàn đi học lại"] : d.nights <= 2 ? ["SPEEDRUN", "ván nhanh như chớp"] : ["GG", "căng như dây đàn"];
  sticker(ctx, 860, 300, 0.16, "#ece7dd", "#09090b", [vibe[0], vibe[1]], [`88px ${display}`, `600 30px ${sans}`]);

  // Tên ván + số liệu
  ctx.fillStyle = "#ece7dd";
  ctx.font = `76px ${display}`;
  ctx.fillText(fit(ctx, (d.title || "Ván không tên").toUpperCase(), W - 144), 72, 920);
  const chips = [`${d.nights} đêm`, `${d.players.length} người`, `${deaths} người ra đi`];
  let cx = 72;
  ctx.font = `600 34px ${sans}`;
  for (const c of chips) {
    const w = ctx.measureText(c).width + 48;
    roundRect(ctx, cx, 960, w, 66, 33);
    ctx.fillStyle = "rgba(236,231,221,0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(236,231,221,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ece7dd";
    ctx.fillText(c, cx + 24, 1005);
    cx += w + 16;
  }

  // Diễn biến: mỗi chặng một ô, hiện số Sói / Làng còn lại.
  const statuses = d.log.filter((e) => e.tone === "status").slice(-8);
  if (statuses.length) {
    ctx.fillStyle = "rgba(236,231,221,0.6)";
    ctx.font = `600 26px ${mono}`;
    ctx.fillText("DIỄN BIẾN · SÓI VS LÀNG", 72, 1100);
    const gap = 12;
    const bw = (W - 144 - gap * (statuses.length - 1)) / statuses.length;
    statuses.forEach((e, i) => {
      const m = e.text.match(/Còn (\d+) Sói · (\d+) Làng/);
      const wv = Number(m?.[1] ?? 0);
      const vv = Number(m?.[2] ?? 0);
      const x = 72 + i * (bw + gap);
      const total = Math.max(1, wv + vv);
      const barH = 150;
      roundRect(ctx, x, 1125, bw, barH, 14);
      ctx.fillStyle = "#4f9d74";
      ctx.fill();
      ctx.save();
      roundRect(ctx, x, 1125, bw, barH, 14);
      ctx.clip();
      ctx.fillStyle = "#c3161c";
      ctx.fillRect(x, 1125, bw, (wv / total) * barH);
      ctx.restore();
      ctx.fillStyle = "#ece7dd";
      ctx.textAlign = "center";
      ctx.font = `44px ${display}`;
      ctx.fillText(`${wv}:${vv}`, x + bw / 2, 1215);
      ctx.font = `600 24px ${mono}`;
      ctx.fillStyle = "rgba(236,231,221,0.6)";
      ctx.fillText(`${e.phase === "NIGHT" ? "Đ" : "N"}${e.round}`, x + bw / 2, 1315);
      ctx.textAlign = "left";
    });
  }

  // Giải thưởng
  let y = 1390;
  const award = (label: string, name: string, color: string, x: number, w: number) => {
    roundRect(ctx, x, y, w, 150, 28);
    ctx.fillStyle = color + "26";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `600 26px ${mono}`;
    ctx.fillText(label, x + 28, y + 50);
    ctx.fillStyle = "#ece7dd";
    ctx.font = `64px ${display}`;
    ctx.fillText(fit(ctx, name.toUpperCase(), w - 56), x + 28, y + 122);
  };
  if (d.best || d.worst) {
    const half = (W - 144 - 20) / 2;
    if (d.best) award("MVP · CHƠI HAY NHẤT", d.best.name, "#4f9d74", 72, d.worst ? half : W - 144);
    if (d.worst) award("GÀ NHẤT BÀN", d.worst.name, "#c3161c", d.best ? 72 + half + 20 : 72, d.best ? half : W - 144);
    y += 190;
  }

  // Danh sách: sống / chết + vai
  const cols = d.players.length > 12 ? 3 : 2;
  const cw = (W - 144) / cols;
  const rows = Math.ceil(d.players.length / cols);
  const rowH = Math.min(52, (H - 140 - y) / rows);
  ctx.font = `600 ${Math.round(rowH * 0.58)}px ${sans}`;
  d.players.forEach((p, i) => {
    const x = 72 + (i % cols) * cw;
    const yy = y + Math.floor(i / cols) * rowH + rowH * 0.7;
    const role = getRole(p.roleId)?.name ?? "?";
    const wolf = isWolfRole(p.roleId);
    ctx.globalAlpha = p.isAlive ? 1 : 0.45;
    ctx.fillStyle = "#ece7dd";
    const label = `${p.isAlive ? "●" : "✕"} ${p.lover ? "♥ " : ""}${p.name}`;
    const nameText = fit(ctx, label, cw * 0.55);
    ctx.fillText(nameText, x, yy);
    ctx.fillStyle = wolf ? "#e2464b" : "rgba(236,231,221,0.6)";
    ctx.fillText(fit(ctx, role, cw * 0.42), x + ctx.measureText(nameText).width + 12, yy);
    ctx.globalAlpha = 1;
  });

  // Chân trang
  ctx.fillStyle = "rgba(236,231,221,0.5)";
  ctx.font = `600 28px ${mono}`;
  ctx.textAlign = "center";
  ctx.fillText("#SóiƠiDậyĐi  #MaSói  #AiLàSói", W / 2, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}
