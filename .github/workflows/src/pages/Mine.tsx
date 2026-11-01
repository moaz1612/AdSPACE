import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { IMAGE_BUCKET, imageUrl, supabase } from "../lib/supabase";
import type { Ad, AdStats } from "../lib/types";
import { fmtDate } from "../lib/util";

const STATUS: Record<Ad["status"], [string, string]> = {
  pending: ["warn", "قيد المراجعة"],
  approved: ["good", "تم القبول"],
  rejected: ["bad", "مرفوض"]
};

export default function Mine() {
  const { user } = useAuth();
  const toast = useToast();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [stats, setStats] = useState<Record<string, AdStats>>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [a, s] = await Promise.all([
      supabase.from("ads").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.rpc("ad_stats")
    ]);
    setAds((a.data as Ad[] | null) ?? []);
    const map: Record<string, AdStats> = {};
    ((s.data as AdStats[] | null) ?? []).forEach((x) => {
      map[x.ad_id] = { ...x, views: Number(x.views), clicks: Number(x.clicks) };
    });
    setStats(map);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(ad: Ad) {
    const { error } = await supabase.from("ads").delete().eq("id", ad.id);
    if (error) {
      toast("تعذر حذف الإعلان");
      return;
    }
    await supabase.storage.from(IMAGE_BUCKET).remove([ad.image_path]);
    setConfirmDel(null);
    toast("تم حذف الإعلان");
    void load();
  }

  return (
    <>
      <h1>إعلاناتي</h1>
      <p className="lead">تابع حالة كل إعلان أرسلته وعدد مشاهداته ونقراته.</p>
      <div style={{ height: 20 }} />
      <div className="items">
        {ads === null && <div className="empty">جار التحميل...</div>}
        {ads?.length === 0 && (
          <div className="empty">
            لم ترسل أي إعلان بعد. <Link to="/submit">أضف إعلانك الأول</Link>
          </div>
        )}
        {ads?.map((ad) => {
          const st = STATUS[ad.status];
          const s = stats[ad.id];
          const canDelete = ad.status !== "approved";
          return (
            <div className="item" key={ad.id}>
              <img className="th" src={imageUrl(ad.image_path)} alt="" />
              <div className="bd">
                <h3>{ad.title}</h3>
                <div className="meta">
                  {ad.advertiser_name} · أرسل في {fmtDate(ad.created_at)} · {ad.requested_days} يوم
                </div>
                <div>
                  <span className={`chip ${st[0]}`}>{st[1]}</span>
                </div>
                {ad.status === "rejected" && ad.reject_reason && (
                  <div className="meta">سبب الرفض: {ad.reject_reason}</div>
                )}
                {ad.status === "approved" && (
                  <div className="meta">
                    من {fmtDate(ad.start_at)} إلى {fmtDate(ad.end_at)} · مشاهدات {s?.views ?? 0} · نقرات {s?.clicks ?? 0}
                  </div>
                )}
                {canDelete && (
                  <div className="row">
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => (confirmDel === ad.id ? void remove(ad) : setConfirmDel(ad.id))}
                    >
                      {confirmDel === ad.id ? "تأكيد الحذف" : "حذف"}
                    </button>
                    {confirmDel === ad.id && (
                      <button type="button" className="btn sm" onClick={() => setConfirmDel(null)}>
                        تراجع
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
