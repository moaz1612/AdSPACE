import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import mark from "../assets/mark.png";
import { isConfigured } from "../lib/supabase";

export function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHome = location.pathname === "/";

  // إغلاق القائمة عند التنقل
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // إغلاقها عند الضغط خارجها أو زر Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="badge">
            <img src={mark} alt="" />
          </span>
          <span>Adspace</span>
        </div>
        <div className="menu" ref={menuRef}>
          <button
            type="button"
            className="menubtn"
            aria-expanded={open}
            aria-controls="mainmenu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="bars3" aria-hidden="true" />
            القائمة
          </button>
          {open && (
            <nav id="mainmenu" className="dropdown" aria-label="التنقل">
              <NavLink to="/" end>
                العرض
              </NavLink>
              <NavLink to="/submit">أضف إعلان</NavLink>
              <NavLink to="/mine">إعلاناتي</NavLink>
              {isAdmin && <NavLink to="/admin">الإدارة</NavLink>}
              <hr />
              {user ? (
                <button type="button" onClick={() => void signOut()}>
                  خروج
                </button>
              ) : (
                <NavLink to="/login">دخول</NavLink>
              )}
            </nav>
          )}
        </div>
      </header>
      <main className={isHome ? "home" : undefined}>
        {!isConfigured && (
          <div className="notice warn" style={{ marginBottom: 16 }}>
            لم يتم ربط Supabase بعد. انسخ الملف <code dir="ltr">.env.example</code> إلى{" "}
            <code dir="ltr">.env.local</code> وضع رابط المشروع والمفتاح، ثم أعد تشغيل التطبيق.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

/** يحمي الصفحات التي تحتاج تسجيل دخول (أو أدمن) */
export function RequireAuth({ admin = false, children }: { admin?: boolean; children: JSX.Element }) {
  const { user, isAdmin, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="empty">جار التحميل...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin) {
    if (!profile) return <div className="empty">جار التحميل...</div>;
    if (!isAdmin) return <Navigate to="/" replace />;
  }
  return children;
}
