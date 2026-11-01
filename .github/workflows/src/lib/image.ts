/** يحمّل ملف صورة من الجهاز */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    img.src = url;
  });
}

export const AD_W = 720;
export const AD_H = 1280;

/** يرسم الصورة على كانفس 9:16 بقص من المنتصف. pos بين 0 و1 يحرك موضع القص */
export function drawCover(canvas: HTMLCanvasElement, img: HTMLImageElement, pos: number): void {
  canvas.width = AD_W;
  canvas.height = AD_H;
  const scale = Math.max(AD_W / img.naturalWidth, AD_H / img.naturalHeight);
  const sw = AD_W / scale;
  const sh = AD_H / scale;
  const sx = (img.naturalWidth - sw) * pos;
  const sy = (img.naturalHeight - sh) * pos;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, AD_W, AD_H);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, AD_W, AD_H);
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("blob-failed"))),
      "image/jpeg",
      quality
    );
  });
}

/** يصدّر JPEG أقل من حوالي 400KB (الحد الأقصى في Supabase 3MB) */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  let q = 0.85;
  let blob = await toBlob(canvas, q);
  while (blob.size > 400_000 && q > 0.4) {
    q -= 0.07;
    blob = await toBlob(canvas, q);
  }
  return blob;
}
