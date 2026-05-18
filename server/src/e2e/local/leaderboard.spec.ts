import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("leaderboard graph works correctly", async ({ page, account: _ }) => {
    await page.goto("/leaderboard/");

    await page.getByRole("button", { name: "Generate Graph" }).click();

    await page.waitForURL("/leaderboard/graph/");
});

test("live algorithm panel displays default await state", async ({ page, account: _ }) => {
    await page.goto("/leaderboard/");
    // check default 'Awaiting connection' message is being shown
    const livePanel = page.locator('#live-status-content');
    await expect(livePanel).toContainText('Awaiting connection...');
});

test("benchmarking toggle buttons update state correctly", async ({ page, account: _ }) => {
    await page.goto("/leaderboard/");
    
    const myButton = page.locator('button[data-value="my"]');
    const allButton = page.locator('button[data-value="all"]');
    
    // clicks 'all' and verify the 'active' class swaps over
    await allButton.click();
    await expect(allButton).toHaveClass(/active/);
    await expect(myButton).not.toHaveClass(/active/);
});

test("benchmarking table renders data from API", async ({ page, account: _ }) => {
    // mocking api
    await page.route('**/api/leaderboard/benchmarks**', async route => {
        const fakeData = {
            currentUserId: "1",
            runs: [
                {
                    run_id: "test-run",
                    alg_id: "alg",
                    alg_name: "Mock Playwright Algorithm",
                    author: "Test",
                    author_id: "1",
                    date_time: "2026-04-05T16:04:00.000Z",
                    scenario_name: "Scenario 1 - Type 1",
                    move_count: 42,
                    energy_used: 15,
                    time_taken: 1000,
                    finish_state: 1
                }
            ]
        };
        await route.fulfill({ json: fakeData });
    });

    // loading page
    await page.goto("/leaderboard/");

    // checking fake row has been rendered correctly
    const firstRow = page.locator('.benchmarking-row').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText("Mock Playwright Algorithm");
    await expect(firstRow).toContainText("Test");

    // checking action buttons exist on row
    await expect(firstRow.locator('.play-btn')).toBeVisible();
    await expect(firstRow.locator('.delete-btn')).toBeVisible();
});