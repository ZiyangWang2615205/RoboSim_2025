import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("can navigate to account page", async ({ page, account: _ }) => {
    await page.goto("/dashboard/");

    await page.getByTestId("settings-button").hover();

    await page.getByRole("link", { name: "Account" }).click();

    await page.waitForURL("/account/");
});

test("can logout", async ({ page, account: _ }) => {
    await page.goto("/dashboard/");

    await page.getByTestId("settings-button").hover();

    await page.getByRole("link", { name: "Log Out" }).click();

    await page.waitForURL("/auth/login/index.html");
});

