import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../components/Toast";
import { IMAGE_BUCKET, imageUrl, supabase } from "../lib/supabase";
import type { Ad, AdStats } from "../lib/types";
import { DAY, cleanLink, daysLeft, fmtDate } from "../lib/util";

type Tab = "pending" | "live";

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pending");
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [stats, setStats] = useState<Record<string, AdStats>>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([
      supabase.from("ads").select("*").order("created_at", { ascending: true }),
      supabase.rpc("ad_stats")
    ]);
    if (a.error) {
      setFailed(true);
      setAds((prev) => prev ?? []);
      return;
    }
    setFailed(false);
    setAds(a.data as Ad[]);
    const map: Record<string, AdStats> = {};
    ((s.data as AdStats[] | null) ?? []).forEach((x) => {
      map[x.ad_id] = { ...x, views: Number(x.views), clicks: Number(x.clicks) };
    });
    setStats(map);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const pending = useMemo(() => (ads ?? []).filter((a) => a.status === "pending"), [ads]);
  const live = useMemo(
    () => (ads ?? []).filter((a) => a.status === "approved").sort((a, b) => a.sort_order - b.sort_order),
    [ads]
  );

  const nextOrder = () => live.reduce((m, a) => Math.max(m, a.sort_order), 0) + 1;

  async function approve(ad: Ad, days: number) {
    const d = days > 0 ? days : ad.requested_days;
    const now = Date.now();
    const { error } = await supabase
      .from("ads")
      .update({
        status: "approved",
        start_at: new Date(now).toISOString(),
        end_at: new Date(now + d * DAY).toISOString(),
        sort_order: nextOrder(),
        is_active: true,
        reject_reason: null,
        decided_at: new Date(now).toISOString()
      })
      .eq("id", ad.id);
    if (error) return toast("تعذر قبول الإعلان");
    toast("تم قبول الإعلان ونشره");
    void load();
  }

  async function reject(ad: Ad, reason: string) {
    const { error } = await supabase
      .from("ads")
      .update({ status: "rejected", reject_reason: reason || null, decided_at: new Date().toISOString() })
      .eq("id", ad.id);
    if (error) return toast("تعذر رفض الإعلان");
    toast("تم رفض الإعلان");
    void load();
  }

  async function patch(ad: Ad, values: Partial<Ad>) {
    const { error } = await supabase.from("ads").update(values).eq("id", ad.id);
    if (error) {
      toast("تعذر حفظ التغيير");
      return false;
    }
    void load();
    return true;
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= live.length) return;
    const arr = [...live];
    [arr[index], arr[j]] = [arr[j], arr[index]];
    const jobs = arr
      .map((ad, k) => (ad.sort_order !== k + 1 ? supabase.from("ads").update({ sort_order: k + 1 }).eq("id", ad.id) : null))
      .filter((x) => x !== null);
    const results = await Promise.all(jobs);
    if (results.some((r) => r && r.error)) toast("تعذر تغيير الترتيب");
    void load();
  }

  async function remove(ad: Ad) {
    const { error } = await supabase.from("ads").delete().eq("id", ad.id);
    if (error) return toast("تعذر حذف الإعلان");
    await supabase.storage.from(IMAGE_BUCKET).remove([ad.image_path]);
    toast("تم حذف الإعلان");
    void load();
  }

  return (
    <>
      <h1>لوحة الإدارة</h1>
      <p className="lead">راجع الطلبات الجديدة، وتحكم في الإعلانات المنشورة.</p>
      <div className="seg" role="group">
        <button type="button" aria-pressed={tab === "pending"} onClick={() => setTab("pending")}>
          طلبات المراجعة ({pending.length})
        </button>
        <button type="button" aria-pressed={tab === "live"} onClick={() => setTab("live")}>
          الإعلانات المنشورة ({live.length})
        </button>
      </div>
      {failed && <div className="notice warn">تعذر تحميل الإعلانات. تأكد أن حسابك أدمن وأن قاعدة البيانات جاهزة.</div>}
      <div className="items">
        {ads === null && <div className="empty">جار التحميل...</div>}
        {ads && tab === "pending" && pending.length === 0 && <div className="empty">لا توجد طلبات جديدة.</div>}
        {ads && tab === "pending" && pending.map((ad) => <PendingCard key={ad.id} ad={ad} onApprove={approve} onReject={reject} />)}
        {ads && tab === "live" && live.length === 0 && (
          <div className="empty">لا توجد إعلانات منشورة. اقبل طلبا جديدا أو انشر إعلانا مباشرة من صفحة أضف إعلان.</div>
        )}
        {ads &&
          tab === "live" &&
          live.map((ad, i) => (
            <LiveRow
              key={ad.id}
              ad={ad}
              stats={stats[ad.id]}
              first={i === 0}
              last={i === live.length - 1}
              onMove={(dir) => void move(i, dir)}
              onPatch={patch}
              onDelete={remove}
            />
          ))}
      </div>
    </>
  );
}

function PendingCard({
  ad,
  onApprove,
  onReject
}: {
  ad: Ad;
  onApprove: (ad: Ad, days: number) => void;
  onReject: (ad: Ad, reason: string) => void;
}) {
  const [days, setDays] = useState(ad.requested_days);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const link = cleanLink(ad.link_url);

  return (
    <div className="item">
      <img className="th" src={imageUrl(ad.image_path)} alt="" />
      <div className="bd">
        <h3>{ad.title}</h3>
        <div className="meta">
          {ad.advertiser_name} · طلب {ad.requested_days} يوم · {fmtDate(ad.created_at)}
        </div>
        {ad.contact && <div className="meta">تواصل: {ad.contact}</div>}
        {link && (
          <div className="meta">
            الرابط:{" "}
            <a href={link} target="_blank" rel="noopener noreferrer" dir="ltr">
              {link}
            </a>
          </div>
        )}
        <div className="row">
          <label className="meta" htmlFor={`d-${ad.id}`}>
            مدة النشر بالأيام
          </label>
          <input
            id={`d-${ad.id}`}
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mini"
          />
        </div>
        <div className="row">
          <button type="button" className="btn primary sm" onClick={() => onApprove(ad, days)}>
            قبول ونشر
          </button>
          <button type="button" className="btn danger sm" onClick={() => setRejecting((v) => !v)}>
            {rejecting ? "إلغاء" : "رفض"}
          </button>
        </div>
        {rejecting && (
          <div className="row">
            <input
              type="text"
              placeholder="سبب الرفض (يراه المعلن)"
              maxLength={120}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="سبب الرفض"
            />
            <button type="button" className="btn danger sm" onClick={() => onReject(ad, reason.trim())}>
              تأكيد الرفض
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveRow({
  ad,
  stats,
  first,
  last,
  onMove,
  onPatch,
  onDelete
}: {
  ad: Ad;
  stats?: AdStats;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onPatch: (ad: Ad, values: Partial<Ad>) => Promise<boolean>;
  onDelete: (ad: Ad) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [title, setTitle] = useState(ad.title);
  const [adv, setAdv] = useState(ad.advertiser_name);
  const [link, setLink] = useState(ad.link_url ?? "");
  const [cta, setCta] = useState(ad.cta_text);
  const [seconds, setSeconds] = useState(ad.display_seconds);
  const [extend, setExtend] = useState(0);
  const [err, setErr] = useState("");

  const now = Date.now();
  const start = ad.start_at ? new Date(ad.start_at).getTime() : 0;
  const end = ad.end_at ? new Date(ad.end_at).getTime() : 0;
  const status: [string, string] = !ad.is_active
    ? ["mute", "مخفي"]
    : now < start
      ? ["warn", "لم يبدأ"]
      : now >= end
        ? ["bad", "منتهي"]
        : ["good", "جار العرض"];

  async function save() {
    setErr("");
    const linkClean = cleanLink(link);
    if (!title.trim() || !adv.trim()) return setErr("اكتب العنوان واسم المعلن.");
    if (link.trim() && !linkClean) return setErr("الرابط غير صحيح.");
    const values: Partial<Ad> = {
      title: title.trim(),
      advertiser_name: adv.trim(),
      link_url: linkClean || null,
      cta_text: cta.trim() || "اعرف أكثر",
      display_seconds: Math.min(30, Math.max(2, Math.round(seconds) || 6))
    };
    if (extend > 0) values.end_at = new Date(Math.max(end, Date.now()) + extend * DAY).toISOString();
    if (await onPatch(ad, values)) {
      setEditing(false);
      setExtend(0);
    }
  }

  return (
    <div className="item">
      <img className="th" src={imageUrl(ad.image_path)} alt="" />
      <div className="bd">
        <h3>{ad.title}</h3>
        <div className="meta">
          {ad.advertiser_name} · {fmtDate(ad.start_at)} إلى {fmtDate(ad.end_at)}
          {now < end ? ` · متبقي ${daysLeft(ad.end_at)} يوم` : ""}
        </div>
        <div className="meta">
          مشاهدات {stats?.views ?? 0} · نقرات {stats?.clicks ?? 0}
        </div>
        <div>
          <span className={`chip ${status[0]}`}>{status[1]}</span>
        </div>
        <div className="row">
          <button type="button" className="btn sm" aria-label="تقديم" disabled={first} onClick={() => onMove(-1)}>
            ▲
          </button>
          <button type="button" className="btn sm" aria-label="تأخير" disabled={last} onClick={() => onMove(1)}>
            ▼
          </button>
          <button type="button" className="btn sm" onClick={() => void onPatch(ad, { is_active: !ad.is_active })}>
            {ad.is_active ? "إخفاء" : "إظهار"}
          </button>
          <button type="button" className="btn sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "إغلاق" : "تعديل"}
          </button>
          <button
            type="button"
            className="btn danger sm"
            onClick={() => (confirmDel ? onDelete(ad) : setConfirmDel(true))}
          >
            {confirmDel ? "تأكيد الحذف" : "حذف"}
          </button>
          {confirmDel && (
            <button type="button" className="btn sm" onClick={() => setConfirmDel(false)}>
              تراجع
            </button>
          )}
        </div>
        {editing && (
          <div className="edit">
            <label className="l" htmlFor={`t-${ad.id}`}>
              العنوان
              <input id={`t-${ad.id}`} type="text" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="l" htmlFor={`a-${ad.id}`}>
              المعلن
              <input id={`a-${ad.id}`} type="text" maxLength={60} value={adv} onChange={(e) => setAdv(e.target.value)} />
            </label>
            <label className="l" htmlFor={`l-${ad.id}`}>
              الرابط
              <input id={`l-${ad.id}`} type="text" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} />
            </label>
            <label className="l" htmlFor={`c-${ad.id}`}>
              نص الزر
              <input id={`c-${ad.id}`} type="text" maxLength={20} value={cta} onChange={(e) => setCta(e.target.value)} />
            </label>
            <label className="l" htmlFor={`s-${ad.id}`}>
              ثواني الظهور
              <input id={`s-${ad.id}`} type="number" min={2} max={30} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
            </label>
            <label className="l" htmlFor={`x-${ad.id}`}>
              تمديد (أيام)
              <input id={`x-${ad.id}`} type="number" min={0} max={365} value={extend} onChange={(e) => setExtend(Number(e.target.value))} />
            </label>
            <div className="err" style={{ gridColumn: "1 / -1" }} role="alert">
              {err}
            </div>
            <div className="row" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="btn primary sm" onClick={() => void save()}>
                حفظ
              </button>
              <button type="button" className="btn sm" onClick={() => setEditing(false)}>
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
