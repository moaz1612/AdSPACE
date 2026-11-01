import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** false عندما لا يكون ملف .env.local مضبوطا بعد */
export const isConfigured = Boolean(url && key);

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-key"
);

export const IMAGE_BUCKET = "ad-images";

export function imageUrl(path: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
