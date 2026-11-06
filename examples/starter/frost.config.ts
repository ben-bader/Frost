import { defineConfig } from "@frostjs/core";

export default defineConfig({
  appDirectory: "src/app",
  apiDirectory: "src/api",
  publicDirectory: "public",
  server: {
    port: 3000,
    host: "localhost",
  },
});
