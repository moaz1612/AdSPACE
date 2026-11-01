import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface AuthResult {
  error?: string;
  needsConfirm?: boolean;
}

interface AuthValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

function arabicError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("already registered")) return "هذا البريد مسجل من قبل. سجل الدخول بدلا من ذلك.";
  if (m.includes("password") && m.includes("6")) return "كلمة المرور يجب ألا تقل عن ٦ أحرف.";
  if (m.includes("email not confirmed")) return "أكد بريدك الإلكتروني من الرسالة التي وصلتك ثم سجل الدخول.";
  if (m.includes("rate limit")) return "محاولات كثيرة. انتظر قليلا ثم حاول مرة أخرى.";
  return "حدث خطأ. حاول مرة أخرى.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, display_name, role")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: arabicError(error.message) } : {};
      },
      async signUp(email, password, name) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } }
        });
        if (error) return { error: arabicError(error.message) };
        return { needsConfirm: !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
      }
    }),
    [session, profile, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
