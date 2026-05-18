import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("instructions page loads Getting Started by default", async ({ page, account: _ }) => {
    await page.goto("/instructions/");

    //check heading
    await expect(
        page.getByRole("heading", { name: "Algorithm Client Instructions" })
    ).toBeVisible();

    //gain botton info
    const gettingStartedTab = page.getByRole("button", { name: "Getting Started" });
    const submissionFormatTab = page.getByRole("button", { name: "Submission Format" });
    const faqTab = page.getByRole("button", { name: "FAQ" });
    const downloadLink = page.locator("#download-link");
    const docContent = page.locator("#doc-content");

    //check botton exist
    await expect(gettingStartedTab).toBeVisible();
    await expect(submissionFormatTab).toBeVisible();
    await expect(faqTab).toBeVisible();

    //check default status of botton
    await expect(gettingStartedTab).toHaveClass(/active/);
    await expect(submissionFormatTab).not.toHaveClass(/active/);
    await expect(faqTab).not.toHaveClass(/active/);

    //check url correct for default page
    await expect(page).toHaveURL(/\/instructions\/?\?doc=getting-started$/);

    //check download file is default
    await expect(downloadLink).toHaveAttribute("href", "/docs/getting-started.md");

    //check current content is not part of the placeholder
    await expect(docContent).not.toContainText("Select a document to view its contents here.");
    await expect(docContent).not.toContainText("Loading documentation...");
});

test("can switch from Getting Started to Submission Format", async ({ page, account: _ }) => {
    await page.goto("/instructions/");

    const gettingStartedTab = page.getByRole("button", { name: "Getting Started" });
    const submissionFormatTab = page.getByRole("button", { name: "Submission Format" });
    const faqTab = page.getByRole("button", { name: "FAQ" });
    const downloadLink = page.locator("#download-link");
    const docContent = page.locator("#doc-content");

    //check status after click submission
    await submissionFormatTab.click();
    await expect(submissionFormatTab).toHaveClass(/active/);
    await expect(gettingStartedTab).not.toHaveClass(/active/);
    await expect(faqTab).not.toHaveClass(/active/);

    await expect(page).toHaveURL(/\/instructions\/?\?doc=submission-format$/);

    //check download file change
    await expect(downloadLink).toHaveAttribute("href", "/docs/submission-format.md");

    await expect(docContent).not.toContainText("Select a document to view its contents here.");
    await expect(docContent).not.toContainText("Loading documentation...");
});

test("can switch from Getting Started to FAQ", async ({ page, account: _ }) => {
    await page.goto("/instructions/");

    const gettingStartedTab = page.getByRole("button", { name: "Getting Started" });
    const submissionFormatTab = page.getByRole("button", { name: "Submission Format" });
    const faqTab = page.getByRole("button", { name: "FAQ" });
    const downloadLink = page.locator("#download-link");
    const docContent = page.locator("#doc-content");

    //check status after click faq
    await faqTab.click();
    await expect(submissionFormatTab).not.toHaveClass(/active/);
    await expect(gettingStartedTab).not.toHaveClass(/active/);
    await expect(faqTab).toHaveClass(/active/);

    await expect(page).toHaveURL(/\/instructions\/?\?doc=faq$/);
    //check download file change
    await expect(downloadLink).toHaveAttribute("href", "/docs/FAQ.md");

    await expect(docContent).not.toContainText("Select a document to view its contents here.");
    await expect(docContent).not.toContainText("Loading documentation...");
});

test("can load page directly from url query", async ({ page, account: _ }) => {
    await page.goto("/instructions/?doc=submission-format");

    //check heading
    await expect(
        page.getByRole("heading", { name: "Algorithm Client Instructions" })
    ).toBeVisible();

    const gettingStartedTab = page.getByRole("button", { name: "Getting Started" });
    const submissionFormatTab = page.getByRole("button", { name: "Submission Format" });
    const faqTab = page.getByRole("button", { name: "FAQ" });
    const downloadLink = page.locator("#download-link");
    const docContent = page.locator("#doc-content");

    //check botton exist
    await expect(gettingStartedTab).toBeVisible();
    await expect(submissionFormatTab).toBeVisible();
    await expect(faqTab).toBeVisible();

    //check default status of botton
    await expect(gettingStartedTab).not.toHaveClass(/active/);
    await expect(submissionFormatTab).toHaveClass(/active/);
    await expect(faqTab).not.toHaveClass(/active/);

    //check url correct
    await expect(page).toHaveURL(/\/instructions\/?\?doc=submission-format$/);

    //check download file
    await expect(downloadLink).toHaveAttribute("href", "/docs/submission-format.md");
    await expect(docContent).not.toContainText("Select a document to view its contents here.");
    await expect(docContent).not.toContainText("Loading documentation...");
});
