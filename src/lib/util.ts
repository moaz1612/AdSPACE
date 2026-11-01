export const DAY = 86_400_000;

/** يقبل http/https فقط، ويضيف https:// إذا كتب المستخدم الدومين بدونها. يرجع "" إذا كان غير صالح */
export function cleanLink(value: string | null | undefined): string {
  let v = (value ?? "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function daysLeft(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
}

/** النموذج الذي يعرضه السلايدر */
export interface Slide {
  id: string;
  title: string;
  advertiser: string;
  imageUrl: string;
  link: string;
  cta: string;
  seconds: number;
  endAt: string | null;
  sample?: boolean;
}

/** إعلانات تجريبية تظهر فقط عندما لا يوجد أي إعلان جار */
export function sampleSlides(): Slide[] {
  const palettes = [
    ["#0F766E", "#134E4A", "#F2B84B"],
    ["#2F3E8F", "#1B2559", "#7FD1C7"],
    ["#A23B4B", "#5A1F2B", "#F4D6A0"]
  ];
  const texts = [
    ["مساحة إعلانية", "٩ : ١٦"],
    ["ملء الشاشة", "على الموبايل"],
    ["إعلانك هنا", "ارفعه من صفحة أضف إعلان"]
  ];
  return palettes.map((p, i) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>` +
      `<rect width="720" height="1280" fill="url(#g)"/>` +
      `<circle cx="560" cy="300" r="190" fill="${p[2]}" opacity=".9"/>` +
      `<rect x="90" y="560" width="360" height="360" rx="24" fill="none" stroke="${p[2]}" stroke-width="6" opacity=".6"/>` +
      `<text x="360" y="1010" text-anchor="middle" direction="rtl" font-family="Tahoma,Arial,sans-serif" font-size="76" font-weight="700" fill="#fff">${texts[i][0]}</text>` +
      `<text x="360" y="1080" text-anchor="middle" direction="rtl" font-family="Tahoma,Arial,sans-serif" font-size="36" fill="#fff" opacity=".85">${texts[i][1]}</text></svg>`;
    return {
      id: `sample-${i}`,
      title: texts[i][0],
      advertiser: "نموذج تجريبي",
      imageUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
      link: "",
      cta: "",
      seconds: 5,
      endAt: null,
      sample: true
    };
  });
}

export function newFileName(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return `${id}.jpg`;
}
