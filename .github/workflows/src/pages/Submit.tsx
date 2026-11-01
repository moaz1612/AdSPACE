import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { canvasToBlob, drawCover, loadImage } from "../lib/image";
import { IMAGE_BUCKET, supabase } from "../lib/supabase";
import { DAY, cleanLink, newFileName } from "../lib/util";

export default function Submit() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [pos, setPos] = useState(50);

  const [advertiser, setAdvertiser] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [cta, setCta] = useState("اعرف أكثر");
  const [days, setDays] = useState(7);
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasImage && imgRef.current && canvasRef.current) {
      drawCover(canvasRef.current, imgRef.current, pos / 100);
    }
  }, [hasImage, pos]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("اختر ملف صورة فقط.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("حجم الصورة كبير. اختر صورة أقل من ١٥ ميجابايت.");
      return;
    }
    try {
      imgRef.current = await loadImage(file);
      setPos(50);
      setHasImage(true);
    } catch {
      setError("تعذر قراءة الصورة. جرب صورة أخرى.");
    }
  }

  async function submit(direct: boolean) {
    setError("");
    const linkClean = cleanLink(link);
    if (!user) return;
    if (!advertiser.trim() || !title.trim()) {
      setError("اكتب اسم المعلن وعنوان الإعلان.");
      return;
    }
    if (link.trim() && !linkClean) {
      setError("الرابط غير صحيح.");
      return;
    }
    if (!hasImage || !canvasRef.current) {
      setError("اختر صورة الإعلان.");
      return;
    }

    setBusy(true);
    const path = `${user.id}/${newFileName()}`;
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const up = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;

      const now = Date.now();
      let order = 0;
      if (direct) {
        const { data } = await supabase
          .from("ads")
          .select("sort_order")
          .eq("status", "approved")
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        order = ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
      }

      const row = {
        advertiser_name: advertiser.trim(),
        title: title.trim(),
        link_url: linkClean || null,
        cta_text: cta.trim() || "اعرف أكثر",
        contact: contact.trim() || null,
        image_path: path,
        requested_days: days,
        ...(direct
          ? {
              status: "approved",
              sort_order: order,
              start_at: new Date(now).toISOString(),
              end_at: new Date(now + days * DAY).toISOString(),
              decided_at: new Date(now).toISOString()
            }
          : { status: "pending" })
      };

      const ins = await supabase.from("ads").insert(row);
      if (ins.error) {
        await supabase.storage.from(IMAGE_BUCKET).remove([path]);
        throw ins.error;
      }
      toast(direct ? "تم نشر الإعلان مباشرة" : "تم إرسال الإعلان للمراجعة");
      navigate(direct ? "/admin" : "/mine");
    } catch {
      setError("تعذر إرسال الإعلان. تأكد من اتصالك وحاول مرة أخرى.");
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(false);
  }

  return (
    <>
      <h1>أضف إعلانك</h1>
      <p className="lead">
        ارفع صورة الإعلان وسنراجعها. بعد القبول يظهر إعلانك في العارض طوال المدة المتفق عليها.
      </p>
      <div style={{ height: 20 }} />
      <div className="card">
        <div className="formgrid">
          <form className="f" onSubmit={onSubmit} noValidate>
            <div className="two">
              <label className="l" htmlFor="adv">
                اسم المعلن أو النشاط
                <input id="adv" type="text" maxLength={60} value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} />
              </label>
              <label className="l" htmlFor="title">
                عنوان الإعلان
                <input id="title" type="text" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
            </div>
            <div className="two">
              <label className="l" htmlFor="link">
                رابط الإعلان <small>اختياري. يفتح عند الضغط على الزر</small>
                <input
                  id="link"
                  type="text"
                  dir="ltr"
                  inputMode="url"
                  placeholder="https://example.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </label>
              <label className="l" htmlFor="cta">
                نص الزر
                <input id="cta" type="text" maxLength={20} value={cta} onChange={(e) => setCta(e.target.value)} />
              </label>
            </div>
            <div className="two">
              <label className="l" htmlFor="days">
                مدة الظهور
                <select id="days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {[1, 3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>
                      {d === 1 ? "يوم واحد" : `${d} أيام`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="l" htmlFor="contact">
                وسيلة تواصل <small>تظهر للإدارة فقط</small>
                <input id="contact" type="text" maxLength={80} value={contact} onChange={(e) => setContact(e.target.value)} />
              </label>
            </div>
            <label className="l" htmlFor="file">
              صورة الإعلان <small>يفضل أن تكون طولية. تقص تلقائيا إلى ٩:١٦.</small>
              <input id="file" type="file" accept="image/*" onChange={onFile} />
            </label>
            {hasImage && (
              <label className="l" htmlFor="pos">
                موضع القص
                <input id="pos" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} />
              </label>
            )}
            <div className="err" role="alert">
              {error}
            </div>
            <div className="row">
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "جار الإرسال..." : "إرسال للمراجعة"}
              </button>
              {isAdmin && (
                <button className="btn" type="button" disabled={busy} onClick={() => void submit(true)}>
                  نشر مباشرة
                </button>
              )}
            </div>
          </form>

          <div className={hasImage ? "pv has" : "pv"}>
            {!hasImage && <span>معاينة الإعلان ٩:١٦ تظهر هنا بعد اختيار الصورة</span>}
            <canvas ref={canvasRef} hidden={!hasImage} />
            {hasImage && (
              <div className="cap">
                {title.trim() && <b>{title.trim()}</b>}
                {(cleanLink(link) || cta.trim()) && <span>{cta.trim() || "اعرف أكثر"}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
