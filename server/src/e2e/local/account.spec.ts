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

test("can change username", async ({ page, account }) => {
    await page.goto("/account/");

    await expect(page.locator("span", { hasText: /^Username/ })).toContainText(
        account.username,
    );

    const new_username = account.username + "1";

    await page.getByText(/^Username/).click();

    await page.getByPlaceholder("New Username").fill(new_username);

    await page.getByRole("button", { name: "Update Username" }).click();

    await expect(page.locator("span", { hasText: /^Username/ })).toContainText(
        new_username,
    );
});

test("can change name", async ({ page, account: _ }) => {
    await page.goto("/account/");

    const new_name = "New Name";

    await page.getByText(/^Name:/).click();

    await page.getByPlaceholder("New Name").fill(new_name);

    await page.getByRole("button", { name: "Update Name" }).click();

    await expect(page.locator("span", { hasText: /^Name:/ })).toContainText(
        new_name,
    );
});

test("can change password correctly", async ({ page, account }) => {
    await page.goto("/account/");

    const new_password = "NewPassword123";

    await page.getByText("Change Password").click();

    await page.getByPlaceholder("Old Password").fill(account.password);

    await page.getByPlaceholder("New Password").fill(new_password);

    await page.getByPlaceholder("Confirm Password").fill(new_password);

    const popup_promise = new Promise<void>((resolve) => {
        page.once("dialog", async (dialog) => {
            expect(dialog.message()).toContain("Successfully changed password");

            await dialog.accept();

            resolve();
        })
    })

    await page.getByRole("button", { name: "Update Password" }).click();

    await popup_promise;

    await page.goto("/auth/login/");

    await page.getByLabel("Username").fill(account.username);
    await page.getByLabel(/^Password/).fill(new_password);

    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL("/dashboard/");
});

test('clicking copy token does not show permission error', async ({ page,account:_ }) => {
    await page.goto("/account/");
    await page.locator('.section-header', { hasText: 'Token' }).click();
    await page.locator('#copy-token').click();

    await expect(page.getByText(/permission denied|notallowederror|failed to copy/i)).not.toBeVisible();
});
