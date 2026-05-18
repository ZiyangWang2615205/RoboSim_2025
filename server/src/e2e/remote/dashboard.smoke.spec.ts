import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("dashboard page is reachable", async ({ page,account: _ }) => {
    //check if dashboard could be accessed by response 200
    const response = await page.goto("/dashboard/");
    expect(response).not.toBeNull();
    //if response return 200, then it could be accessed
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
});

test("dashboard does not display an error page", async ({ page, account: _ }) => {
    await page.goto("/dashboard/");

    //Gateway 502 is common issue occur in AWS server during our works
    await expect(page.locator("body")).not.toContainText(
        /Cannot GET|404|502|Error/i,
    );
});

test("dashboard renders content", async ({ page, account: _ }) => {
    await page.goto("/dashboard/");

    await expect(page.getByRole("heading", {name:"RoboSim"})).toBeVisible();

    await expect(page.getByText("Develop & Test Algorithms")).toBeVisible();
    await expect(page.getByText("Live Replay/Simulation")).toBeVisible();
    await expect(page.getByText("Compete & Compare")).toBeVisible();
});

test("dashboard exist Show Algorithm Runs", async ({ page, account: _ }) => {
    await page.goto("/dashboard/");
    //make sure Show Algorithm Run exist
    await expect(
        page.getByRole("button", { name: "Show Algorithm Runs" }),
    ).toBeVisible();
});

test("the get started button links to the getting started page", async ({
    page, account: _
}) => {
    await page.goto("/dashboard/");
    //test could not find Get Started by getByRole button
    //therefore find by getByText directly
    await page.getByText("Get Started").click();
    await expect(page).toHaveURL("/instructions/");
});
