import { defineConfig } from "@frostjs/vite";

export default defineConfig({
  appDirectory: "src/app",
  publicDirectory: "public",
  server: {
    port: 3000,
    host: "localhost",
  },
});
