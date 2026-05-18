import { test as base, expect } from "@playwright/test";

type Account = {
    username: string;
    password: string;
};

export const test = base.extend<{
    /**
     * Create a unique account and login using that account.
     */
    account: Account;
    /**
     * Create a unique account, and generate an Algorithm Client token using
     * that account.
     */
    token: string;
}>({
    account: async ({ page }, use) => {
        const username = createUniqueUsername();
        const password = "Password123";

        await page.goto("/auth/register/");

        await page.getByLabel("Username").fill(username);
        await page.getByLabel(/^Name/).fill("Name");
        await page.getByLabel(/^Password/).fill(password);
        await page.getByLabel("Confirm Password").fill(password);

        await page.getByRole("button", { name: "Register" }).click();

        await page.waitForURL("/auth/login/index.html?register=successful");

        await page.getByLabel("Username").fill(username);
        await page.getByLabel(/^Password/).fill(password);

        await page.getByRole("button", { name: "Login" }).click();

        await page.waitForURL("/dashboard/");

        // For some reason `waitForURL()` is flaky on its own here, so we use
        // this to make sure the dashboard page is fully loaded.
        await page.waitForTimeout(500);

        await use({ username, password });
    },
    token: async ({ account: _, page }, use) => {
        await page.goto("/account/");

        await page.getByText(/^Token/).click();

        await expect(page.getByTestId("token")).not.toBeEmpty();

        const token = await page.getByTestId("token").textContent();

        if (token === null) {
            throw new Error("Failed to generate token");
        }

        await use(token);
    },
});

/**
 * Create a unique username for each test. Usernames must be betwen 4 and 20
 * characters.
 */
function createUniqueUsername() {
    return "user" + Math.floor(Math.random() * 1000000);
}
