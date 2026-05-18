import { expect } from "@playwright/test";
import {
    initialize_algorithm_client,
    initialize_request,
    send_move,
    WebSocketWrapper,
} from "../../test/utils.ts";
import { ACMessageType } from "../../connect/algo_client_connect.ts";
import { test } from "../fixtures.ts";

/*
test("the dashboard displays algorithm clients correctly", async ({
    page,
    token,
}) => {
    await page.goto("/dashboard/");

    const client = await WebSocketWrapper.connect(7071);

    const custom_scenario = initialize_request.custom_scenarios![0];
    const request = {
        ...initialize_request,
        custom_scenarios: [custom_scenario, custom_scenario],
        token,
    };

    const id = await initialize_algorithm_client(client, request);

    const client_summary = page.locator(`client-summary[client-id="${id}"]`);

    await expect(client_summary).toBeAttached();

    await send_move(client, { id: 1, dx: 1, dy: 0, dz: 0 });
    await send_move(client, { id: 1, dx: 0, dy: 0, dz: 1 });
    await client.receive();

    await expect(client_summary.locator("[slot=completed]")).toContainText("1");

    await client.receive();

    client.send({
        type: ACMessageType.OK,
        data: {},
    });

    client.send({
        type: ACMessageType.SKIP,
        data: {},
    });

    await client.receive();

    await expect(client_summary.locator("[slot=skipped]")).toContainText("1");

    await client.shutdown();
});
*/

async function waitForClientSummary(page: any, id: string) {
    const summary = page.locator(`client-summary[client-id="${id}"]`);
    await expect(summary).toBeAttached({ timeout: 10000 });
    return summary;
}

test("the dashboard displays algorithm clients correctly", async ({
    page,
    token,
}) => {
    await page.goto("/dashboard/?type=all");
    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    const client = await WebSocketWrapper.connect(7071);

    const custom_scenario = initialize_request.custom_scenarios![0];
    const request = {
        ...initialize_request,
        custom_scenarios: [custom_scenario, custom_scenario],
        token,
    };

    const id = await initialize_algorithm_client(client, request);

    // wait for dashboard render first element
    const client_summary = await waitForClientSummary(page, id);

    await send_move(client, { id: 1, dx: 1, dy: 0, dz: 0 });
    await send_move(client, { id: 1, dx: 0, dy: 0, dz: 1 });
    await client.receive();

    await expect(client_summary.locator("[slot=completed]")).toContainText("1");

    await client.receive();

    client.send({
        type: ACMessageType.OK,
        data: {},
    });

    client.send({
        type: ACMessageType.SKIP,
        data: {},
    });

    await client.receive();

    await expect(client_summary.locator("[slot=skipped]")).toContainText("1");

    await client.shutdown();
});

test("the dashboard works with multiple algorithms", async ({
    page,
    token,
}) => {
    await page.goto("/dashboard/?type=all");
    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    const client_summary = await waitForClientSummary(page, id);

    // We need to wait for a second
    await page.waitForTimeout(1000);

    const second_client = await WebSocketWrapper.connect(7071);

    const second_id = await initialize_algorithm_client(second_client, request);

    const second_summary = await waitForClientSummary(page, second_id);

    await send_move(client, { id: 1, dx: 1, dy: 0, dz: 0 });
    await send_move(client, { id: 1, dx: 0, dy: 0, dz: 1 });
    await client.receive();

    await expect(client_summary.locator("[slot=completed]")).toContainText("1");
    await expect(second_summary.locator("[slot=completed]")).toContainText("0");

    await client.shutdown();
});

test("your algorithms/all algorithms views work", async ({ page, token }) => {
    await page.goto("/dashboard/?type=all");


    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    const client_summary = await waitForClientSummary(page, id);
    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    await page.getByRole("button", { name: "All Algorithms" }).click();

    await expect(page).toHaveURL("/dashboard/?type=all");

    await page.getByRole("button", { name: "Your Algorithms" }).click();

    await expect(page).toHaveURL("/dashboard/?type=user");

    await expect(client_summary).toBeAttached();

    await client.shutdown();
});

test("infinite scroll works", async ({ page, token }) => {
    const request = { ...initialize_request, token };

    const clients: WebSocketWrapper[] = [];
    for (let i = 0; i < 30; i++) {
        const client = await WebSocketWrapper.connect(7071);

        await initialize_algorithm_client(client, request);

        clients.push(client);
    }

    await page.goto("/dashboard/");

    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    await expect(page.locator("client-summary")).toHaveCount(20);

    await page.locator("client-summary").last().scrollIntoViewIfNeeded();

    await expect(page.locator("client-summary")).toHaveCount(30);

    for (const client of clients) {
        await client.shutdown();
    }
});

test("the dashboard links to the correct summary page", async ({
    page,
    token,
}) => {
    await page.goto("/dashboard/?type=all");

    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    const client_summary = await waitForClientSummary(page, id);

    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    await expect(client_summary).toBeVisible();

    await expect(client_summary.locator("a.summary-link.title")).toHaveAttribute(
        "href",
        `/summary/${id}`,
    );

    await client.shutdown();
});

test("the dropdown menu works", async ({ page, token }) => {
    await page.goto("/dashboard/?type=all");


    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    const client_summary = await waitForClientSummary(page, id);

    await page.getByRole("button", { name: "Show Algorithm Runs" }).click();

    await expect(client_summary).toBeVisible();

    const dropdown = client_summary.getByTestId("dropdown");

    await dropdown.locator("#menu-button").click();

    const summary_link = dropdown.locator("a.summary-link");
    const follow_link = dropdown.locator("a.follow-link");

    await expect(summary_link).toHaveAttribute("href", `/summary/${id}`);
    await expect(follow_link).toHaveAttribute("href", `/follow/${id}`);

    await expect(summary_link).toBeVisible();
    await expect(follow_link).toBeVisible();

    client.send({
        type: ACMessageType.SKIP,
        data: {},
    });

    await expect(follow_link).not.toBeVisible();
    await expect(summary_link).toBeVisible();

    await client.shutdown();
});
