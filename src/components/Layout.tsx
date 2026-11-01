import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isConfigured } from "../lib/supabase";

export function Layout() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <i aria-hidden="true" />
          <span>Adspace</span>
        </div>
        <nav className="tabs" aria-label="التنقل">
          <NavLink to="/" end>
            العرض
          </NavLink>
          <NavLink to="/submit">أضف إعلان</NavLink>
          <NavLink to="/mine">إعلاناتي</NavLink>
          {isAdmin && <NavLink to="/admin">الإدارة</NavLink>}
          {user ? (
            <button type="button" className="tablink" onClick={() => void signOut()}>
              خروج
            </button>
          ) : (
            <NavLink to="/login">دخول</NavLink>
          )}
        </nav>
      </header>
      <main>
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
