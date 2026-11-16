import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // npm run dev: chuyển /api sang Worker chạy bằng `npx wrangler dev` (cổng 8787)
  server: { proxy: { '/api': 'http://localhost:8787', '/sitemap.xml': 'http://localhost:8787' } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
