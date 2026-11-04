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

const MAX_SIDE = 1280;

/** يرسم الصورة كاملة بنسبتها الأصلية (بدون قص)، مع تصغيرها لو كانت أكبر من ١٢٨٠ بكسل */
export function drawFit(canvas: HTMLCanvasElement, img: HTMLImageElement): void {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff"; // خلفية بيضاء للصور الشفافة لأن الحفظ بصيغة JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
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
