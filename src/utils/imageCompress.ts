const MAX_BYTES = 20 * 1024;
const SIZES = [256, 192, 160, 128, 96];
const QUALITIES = [0.82, 0.7, 0.58, 0.46, 0.35];

/** Số byte thật của phần dữ liệu trong data URL base64. */
export function dataUrlBytes(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      // Tôn trọng EXIF orientation của ảnh chụp từ điện thoại.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* rơi xuống fallback <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Cắt vuông giữa ảnh, thu nhỏ và nén WebP (fallback JPEG nếu trình duyệt
 * không encode được WebP) cho tới khi < 20KB.
 */
export async function compressAvatar(file: File): Promise<string> {
  const img = await loadImage(file);
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas không khả dụng");

  let smallest = "";
  for (const size of SIZES) {
    canvas.width = size;
    canvas.height = size;
    c.imageSmoothingQuality = "high";
    c.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    for (const q of QUALITIES) {
      let url = canvas.toDataURL("image/webp", q);
      if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/jpeg", q);
      if (dataUrlBytes(url) <= MAX_BYTES) {
        if ("close" in img) (img as ImageBitmap).close();
        return url;
      }
      if (!smallest || url.length < smallest.length) smallest = url;
    }
  }
  if ("close" in img) (img as ImageBitmap).close();
  return smallest;
}
