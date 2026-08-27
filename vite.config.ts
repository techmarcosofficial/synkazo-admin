import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Synkazo dashboard frontend (React + Vite) — serves app.synkazo.com.
// The app talks directly to the NestJS backend via VITE_API_BASE_URL
// (see src/api/apiClient.ts), so no dev proxy is required.
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5182,
  },

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
})
