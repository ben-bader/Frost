import { defineConfig } from "@frost.js/vite";

export default defineConfig({
  appDirectory: "src/app",
  publicDirectory: "public",
  server: {
    port: 3000,
    host: "localhost",
  },
  seo: {
    sitemap: true,
    robots: true,
    baseUrl: "https://frostjs.dev",
  },
});
