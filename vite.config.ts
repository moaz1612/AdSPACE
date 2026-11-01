import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// على GitHub Pages يكون المسار /اسم-المستودع/ ويتم ضبطه من ملف الـ workflow
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Adspace",
        short_name: "Adspace",
        description: "منصة إعلانات بنظام البانر 9:16",
        lang: "ar",
        dir: "rtl",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#FFFFFF",
        theme_color: "#0B3B8C",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        navigateFallback: "index.html",
        // لا نحفظ طلبات Supabase في الكاش
        runtimeCaching: []
      }
    })
  ]
});
