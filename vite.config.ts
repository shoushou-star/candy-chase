import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        gameplay: "gameplay.html",
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
