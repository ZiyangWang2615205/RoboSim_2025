import { defineConfig, devices } from "@playwright/test";

const crossBrowser = process.env.CROSS_BROWSER === "1";

export default defineConfig({
  testDir: "../server/src/e2e/remote",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://13.49.70.251",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    ...(crossBrowser
      ? [
          {
            name: "firefox",
            use: {
              ...devices["Desktop Firefox"],
            },
          },
          {
            name: "webkit",
            use: {
              ...devices["Desktop Safari"],
            },
          },
        ]
      : []),
  ],
});
