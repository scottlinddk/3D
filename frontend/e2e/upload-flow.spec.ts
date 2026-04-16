import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Upload → Download flow", () => {
  test("shows upload page on root route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Photo to/i)).toBeVisible();
    await expect(page.getByText(/Drag & drop/i)).toBeVisible();
  });

  test("upload button is disabled before file selection", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: /Upload & Continue/i });
    await expect(btn).toBeDisabled();
  });

  test("navigates to calibration after upload (mocked API)", async ({ page }) => {
    // Mock the upload API to avoid needing a live backend
    await page.route("**/api/upload", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "abc123def456abc123def456abc12345" }),
      }),
    );

    await page.goto("/");
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /Browse files/i }).click(),
    ]);
    // Use a small 1×1 pixel JPEG for the test
    await fileChooser.setFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
        "base64",
      ),
    });

    const btn = page.getByRole("button", { name: /Upload & Continue/i });
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(page).toHaveURL(/\/calibrate\//);
  });
});
