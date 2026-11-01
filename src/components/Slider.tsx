import { useCallback, useEffect, useRef, useState } from "react";
import { cleanLink, daysLeft, type Slide } from "../lib/util";

interface Props {
  slides: Slide[];
  onView?: (adId: string) => void;
  onCta?: (adId: string) => void;
}

/** عارض إعلانات بنسبة 9:16: تبديل تلقائي، سحب، أسهم، ضغط مطول للإيقاف */
export default function Slider({ slides, onView, onCta }: Props) {
  const n = slides.length;
  const [idx, setIdx] = useState(0);
  const [cycle, setCycle] = useState(0); // يزيد مع كل انتقال ليعيد تشغيل شريط التقدم
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const startX = useRef<number | null>(null);

  const safeIdx = n ? Math.min(idx, n - 1) : 0;
  const cur: Slide | undefined = slides[safeIdx];

  const go = useCallback(
    (target: number) => {
      if (!n) return;
      setIdx(((target % n) + n) % n);
      setCycle((c) => c + 1);
    },
    [n]
  );

  // تسجيل المشاهدة عند ظهور كل إعلان
  useEffect(() => {
    if (cur && !cur.sample) onView?.(cur.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, cycle]);

  // إيقاف التقدم عندما تكون الصفحة مخفية
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // الأسهم من لوحة المفاتيح (اتجاه عربي: اليسار هو التالي)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(safeIdx + 1);
      else if (e.key === "ArrowRight") go(safeIdx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, safeIdx]);

  if (!cur) return null;
  const link = cleanLink(cur.link);
  const paused = held || hidden;

  return (
    <div className="show">
      <div
        className="frame"
        role="region"
        aria-label="عارض الإعلانات"
        onPointerDown={(e) => {
          setHeld(true);
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          setHeld(false);
          if (startX.current !== null) {
            const dx = e.clientX - startX.current;
            if (Math.abs(dx) > 50) go(safeIdx + (dx < 0 ? 1 : -1));
          }
          startX.current = null;
        }}
        onPointerLeave={() => {
          setHeld(false);
          startX.current = null;
        }}
        onPointerCancel={() => {
          setHeld(false);
          startX.current = null;
        }}
      >
        <div className="imgs">
          {slides.map((s, i) => (
            <img
              key={s.id}
              src={s.imageUrl}
              alt={s.title}
              draggable={false}
              className={i === safeIdx ? "on" : ""}
            />
          ))}
        </div>

        <div className="bars">
          {slides.map((s, i) => (
            <span key={s.id}>
              {i < safeIdx ? (
                <b style={{ width: "100%" }} />
              ) : i === safeIdx ? (
                <b
                  key={cycle}
                  className="run"
                  style={{
                    animationDuration: `${s.seconds}s`,
                    animationPlayState: paused ? "paused" : "running"
                  }}
                  onAnimationEnd={() => go(safeIdx + 1)}
                />
              ) : (
                <b />
              )}
            </span>
          ))}
        </div>

        <div className="tag">{cur.sample ? "نموذج" : "إعلان"}</div>

        <div className="cap">
          {cur.title && <div className="t">{cur.title}</div>}
          {cur.advertiser && <div className="a">{cur.advertiser}</div>}
          {link && (
            <a
              className="go"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCta?.(cur.id)}
            >
              {cur.cta || "اعرف أكثر"}
            </a>
          )}
        </div>

        <button type="button" className="nav prev" aria-label="السابق" onClick={() => go(safeIdx - 1)}>
          ›
        </button>
        <button type="button" className="nav next" aria-label="التالي" onClick={() => go(safeIdx + 1)}>
          ‹
        </button>
      </div>

      <div className="queue">
        {cur.sample && (
          <div className="notice">
            هذه إعلانات تجريبية. تظهر الإعلانات الحقيقية هنا بعد قبولها من صفحة الإدارة.
          </div>
        )}
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-current={i === safeIdx}
            onClick={() => go(i)}
          >
            <img src={s.imageUrl} alt="" />
            <span className="m">
              <strong>{s.title || "بدون عنوان"}</strong>
              <span>
                {s.advertiser} · {s.sample ? "تجريبي" : `${Math.max(daysLeft(s.endAt), 0)} يوم متبقي`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
