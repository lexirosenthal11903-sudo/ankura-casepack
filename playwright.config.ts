import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3123" },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npx next start -p 3123", url: "http://localhost:3123", reuseExistingServer: true, timeout: 60_000 },
});
