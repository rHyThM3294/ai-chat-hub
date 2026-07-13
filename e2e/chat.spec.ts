import { test, expect } from "@playwright/test";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test.describe("AI Chat Hub", () => {
  test("loads with the mock provider selected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AI Chat Hub(MVP)")).toBeVisible();
    await expect(page.locator(".model")).toHaveValue("mock");
  });

  test("sends a text message and receives a mock reply", async ({ page }) => {
    await page.goto("/");
    await page.fill(".userText", "你好");
    await page.click(".sendButton");
    await expect(page.locator(".messageRow.isAssistant")).toContainText("你說的是");
  });

  test("toggles dark mode and persists it after reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.click(".themeToggle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("attaches an image and shows it in the sent message", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', {
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(PNG_BASE64, "base64"),
    });
    await expect(page.locator(".pendingImageItem img")).toBeVisible();

    await page.fill(".userText", "這是什麼？");
    await page.click(".sendButton");

    await expect(page.locator(".messageRow.isUser .messageImage")).toBeVisible();
    await expect(page.locator(".messageRow.isAssistant")).toContainText("收到 1 張圖片");
  });
});
