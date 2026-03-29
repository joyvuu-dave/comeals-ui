import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // React 16 uses the classic JSX runtime (React.createElement)
      // not the automatic runtime (react/jsx-runtime) added in React 17
      jsxRuntime: "classic",
    }),
  ],
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "build",
    manifest: true,
    chunkSizeWarningLimit: 700,
  },
});
