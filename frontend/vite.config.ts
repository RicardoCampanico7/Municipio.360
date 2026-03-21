import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => {
          const swaggerPaths = [
            "/api",
            "/api/",
            "/api-json",
          ];

          const swaggerAssetPrefixes = [
            "/api/swagger-ui",
            "/api/favicon",
          ];

          if (
            swaggerPaths.includes(path) ||
            swaggerAssetPrefixes.some((prefix) => path.startsWith(prefix))
          ) {
            return path;
          }

          return path.replace(/^\/api/, "");
        },
      },
    },
  },
});
