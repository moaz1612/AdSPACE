import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Slider from "../components/Slider";
import { imageUrl, isConfigured, supabase } from "../lib/supabase";
import type { LiveAd } from "../lib/types";
import { sampleSlides, type Slide } from "../lib/util";

export default function Viewer() {
  const [live, setLive] = useState<LiveAd[] | null>(null);
  const [failed, setFailed] = useState(false);
  const lastView = useRef(new Map<string, number>());
  const lastJson = useRef("");

  const load = useCallback(async () => {
    if (!isConfigured) {
      setLive([]);
      return;
    }
    const { data, error } = await supabase.from("live_ads").select("*").order("sort_order");
    if (error) {
      setFailed(true);
      setLive((prev) => prev ?? []);
      return;
    }
    setFailed(false);
    const json = JSON.stringify(data);
    if (json !== lastJson.current) {
      lastJson.current = json;
      setLive(data as LiveAd[]);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const slides = useMemo<Slide[]>(() => {
    if (!live) return [];
    if (!live.length) return sampleSlides();
    return live.map((a) => ({
      id: a.id,
      title: a.title,
      advertiser: a.advertiser_name,
      imageUrl: imageUrl(a.image_path),
      link: a.link_url ?? "",
      cta: a.cta_text,
      seconds: a.display_seconds,
      endAt: a.end_at
    }));
  }, [live]);

  const trackView = useCallback((adId: string) => {
    const now = Date.now();
    if (now - (lastView.current.get(adId) ?? 0) < 15_000) return;
    lastView.current.set(adId, now);
    supabase
      .from("ad_events")
      .insert({ ad_id: adId, kind: "view" })
      .then(() => undefined);
  }, []);

  const trackClick = useCallback((adId: string) => {
    supabase
      .from("ad_events")
      .insert({ ad_id: adId, kind: "click" })
      .then(() => undefined);
  }, []);

  return (
    <>
      <h1>عرض الإعلانات</h1>
      <p className="lead">
        كل إعلان يأخذ الشاشة كاملة بنسبة ٩:١٦ ويتبدل تلقائيا. اضغط مطولا على الإعلان لإيقافه.
      </p>
      <div style={{ height: 20 }} />
      {failed && <div className="notice warn">تعذر تحديث الإعلانات الآن. سنحاول مرة أخرى.</div>}
      {live === null ? (
        <div className="empty">جار التحميل...</div>
      ) : (
        <Slider slides={slides} onView={trackView} onCta={trackClick} />
      )}
    </>
  );
}
