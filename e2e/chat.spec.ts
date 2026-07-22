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

  test("shows a friendly error banner with retry/dismiss when a request fails", async ({
    page,
  }) => {
    await page.goto("/");
    // the Groq provider hits /api/groq, which doesn't exist under `vite preview`,
    // so this reliably reproduces a real failed-request scenario
    await page.selectOption(".model", "groq");
    await page.fill(".userText", "哈囉");
    await page.click(".sendButton");

    const banner = page.locator(".errorBanner");
    await expect(banner).toBeVisible();
    await expect(banner).not.toContainText("API error");

    await page.click(".errorDismissButton");
    await expect(banner).toBeHidden();
  });

  test("exports the active conversation as Markdown and JSON", async ({ page }) => {
    await page.goto("/");
    await page.fill(".userText", "你好");
    await page.click(".sendButton");
    await expect(page.locator(".messageRow.isAssistant")).toContainText("你說的是");

    await page.click(".exportButton");
    await expect(page.locator(".exportMenu")).toBeVisible();

    const [mdDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.click(".exportMenuItem >> text=匯出 Markdown"),
    ]);
    expect(mdDownload.suggestedFilename()).toMatch(/\.md$/);
    await expect(page.locator(".exportMenu")).toBeHidden();

    await page.click(".exportButton");
    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.click(".exportMenuItem >> text=匯出 JSON"),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
  });

  test("conversation list is keyboard operable and Escape closes overlays", async ({ page }) => {
    await page.goto("/");
    await page.click(".newChat");
    await page.click(".sidebarToggle");
    await expect(page.locator(".sidebarPanel.isOpen")).toBeVisible();

    const selectButtons = page.locator(".conversationSelectButton");
    const secondButton = selectButtons.nth(1);
    await secondButton.focus();
    await page.keyboard.press(" ");
    await expect(secondButton).toHaveAttribute("aria-current", "true");

    const deleteButton = page.locator(".conversationItem").first().locator(".deleteButton");
    await expect(deleteButton).toHaveJSProperty("tagName", "BUTTON");

    await page.keyboard.press("Escape");
    await expect(page.locator(".sidebarPanel.isOpen")).toBeHidden();
  });
});
