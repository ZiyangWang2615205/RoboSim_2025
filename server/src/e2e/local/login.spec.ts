import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("register page rejects invalid passwords", async ({ page }) => {
    await page.goto("/auth/register/");

    await page.getByLabel("Username").fill("username");
    await page.getByLabel(/^Name/).fill("name");
    await page.getByLabel(/^Password/).fill("password");
    await page.getByLabel("Confirm Password").fill("password");

    await page.getByRole("button", { name: "Register" }).click();

    await expect(page).toHaveURL("/auth/register/");
    await expect(page.getByText("Password must contain")).toBeVisible();

    await page.getByLabel(/^Password/).fill("password1");
    await page.getByLabel("Confirm Password").fill("password2");

    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
});

test("can't register with an existing username", async ({ page }) => {
    await page.goto("/auth/register/");

    await page.getByLabel("Username").fill("admin");
    await page.getByLabel(/^Name/).fill("name");
    await page.getByLabel(/^Password/).fill("Password123");
    await page.getByLabel("Confirm Password").fill("Password123");

    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByText("already exists")).toBeVisible();
});

test("can't login with invalid credentials", async ({ page }) => {
    await page.goto("/auth/login/");

    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("password");

    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Invalid")).toBeVisible();
});
