import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const erpUrl = env.VITE_DEV_ERPNEXT_URL;
  const apiToken = env.VITE_DEV_API_TOKEN;

  return {
    base: "./",
    plugins: [react(), tailwindcss()],
    server: {
      port: 5200,
      ...(erpUrl && apiToken
        ? {
            proxy: {
              "/api": {
                target: erpUrl,
                changeOrigin: true,
                secure: true,
                headers: { Authorization: `token ${apiToken}` },
              },
            },
          }
        : {}),
    },
  };
});
