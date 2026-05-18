import { expect } from "@playwright/test";
import {
    initialize_algorithm_client,
    initialize_request,
    WebSocketWrapper,
} from "../../test/utils.ts";
import { test } from "../fixtures.ts";
import { ACMessageType } from "../../connect/algo_client_connect.ts";

test("summary page updates correctly", async ({ page, token }) => {
    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    await page.goto(`/summary/${id}`);

    await expect(page.locator("[slot=state]")).toHaveText("Running");

    const row = page.locator("tr").nth(1);

    await expect(row.getByText("Pending")).toBeVisible();

    await expect(row.getByRole("link", { name: "Follow run" })).toHaveAttribute(
        "href",
        `/follow/${id}`,
    );

    client.send({
        type: ACMessageType.SKIP,
        data: {},
    });

    await expect(page.locator("[slot=state]")).toHaveText("Completed");

    await expect(row.getByText("Skipped")).toBeVisible();

    await expect(row.getByRole("link", { name: "View replay" })).toBeVisible();

    await client.shutdown();
});

test("summary graph works", async ({ page, token }) => {
    const client = await WebSocketWrapper.connect(7071);

    const request = { ...initialize_request, token };

    const id = await initialize_algorithm_client(client, request);

    await page.goto(`/summary/${id}`);

    await page.getByRole("button", { name: "Generate Graph" }).click();

    await page.waitForURL(`/summary/graph/${id}`);

    await page.getByRole("button", { name: "Switch View" }).click();

    const yAxisButton = page.getByRole("button", { name: "Change Y-Axis" });

    await expect(yAxisButton).toBeVisible();

    await yAxisButton.click();
});
