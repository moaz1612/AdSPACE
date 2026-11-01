import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/logo.png";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }
    if (mode === "up" && !name.trim()) {
      setError("اكتب اسمك أو اسم نشاطك.");
      return;
    }
    setBusy(true);
    const res =
      mode === "in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.needsConfirm) {
      setInfo("تم إنشاء الحساب. افتح بريدك واضغط على رابط التأكيد ثم سجل الدخول.");
      setMode("in");
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="card" style={{ maxWidth: 440, marginInline: "auto" }}>
      <img className="logo-full" src={logo} alt="Adspace" />
      <h1>{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
      <p className="lead">
        {mode === "in" ? "سجل دخولك لإرسال إعلاناتك ومتابعتها." : "أنشئ حسابا لتبدأ بإرسال إعلاناتك."}
      </p>
      <form className="f" onSubmit={onSubmit} style={{ marginTop: 18 }} noValidate>
        {mode === "up" && (
          <label className="l" htmlFor="name">
            الاسم أو اسم النشاط
            <input id="name" type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="l" htmlFor="email">
          البريد الإلكتروني
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="l" htmlFor="password">
          كلمة المرور
          <input
            id="password"
            type="password"
            dir="ltr"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="err" role="alert">
          {error}
        </div>
        {info && <div className="notice">{info}</div>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>
            {mode === "in" ? "دخول" : "إنشاء الحساب"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError("");
            }}
          >
            {mode === "in" ? "ليس لدي حساب" : "لدي حساب"}
          </button>
        </div>
      </form>
    </div>
  );
}
