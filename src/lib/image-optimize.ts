export const MAX_DIM = 1000;
export const START_QUALITY = 0.82;
export const MIN_QUALITY = 0.7;
export const TARGET_BYTES = 200 * 1024;

/** Fit (w,h) inside max x max keeping aspect ratio; never upscale. */
export function fitWithin(w: number, h: number, max = MAX_DIM) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Quality steps tried in order until the file is under TARGET_BYTES. */
export function qualitySteps() {
  const steps: number[] = [];
  for (let q = START_QUALITY; q >= MIN_QUALITY - 1e-9; q -= 0.04) steps.push(Math.round(q * 100) / 100);
  return steps;
}

export type Optimized = { blob: Blob; width: number; height: number; type: string; originalBytes: number };

function toBlob(c: HTMLCanvasElement, type: string, q?: number) {
  return new Promise<Blob | null>((res) => c.toBlob(res, type, q));
}

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("decode")); img.src = url; });
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export async function optimizeImage(file: File): Promise<Optimized> {
  const d = await decode(file);
  const { width, height } = fitWithin(d.w, d.h);
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  c.getContext("2d")!.drawImage(d.src, 0, 0, width, height);
  d.close();

  let best: Blob | null = null;
  for (const q of qualitySteps()) {
    const b = await toBlob(c, "image/webp", q);
    if (!b || b.type !== "image/webp") { best = null; break; } // WebP unsupported
    best = b;
    if (b.size <= TARGET_BYTES) break;
  }
  if (best) return { blob: best, width, height, type: "image/webp", originalBytes: file.size };

  // Fallback: keep original format (PNG stays PNG, else JPEG), still resized.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const fb = await toBlob(c, type, type === "image/jpeg" ? START_QUALITY : undefined);
  if (fb) return { blob: fb, width, height, type, originalBytes: file.size };
  return { blob: file, width: d.w, height: d.h, type: file.type, originalBytes: file.size };
}

export function formatBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export function blobToDataUrl(b: Blob) {
  return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b); });
}
