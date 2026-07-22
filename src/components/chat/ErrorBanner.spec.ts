import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBanner from "./ErrorBanner.vue";
import { useChatStore } from "@/stores/chat.store";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

function mountBanner() {
  return mount(ErrorBanner);
}

describe("ErrorBanner", () => {
  it("renders nothing when there is no error", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".errorBanner").exists()).toBe(false);
  });

  it("shows a humanized error message instead of the raw error string", () => {
    const chat = useChatStore();
    chat.error = "Groq API error (429): rate limited";
    const wrapper = mountBanner();
    expect(wrapper.find(".errorBanner").exists()).toBe(true);
    expect(wrapper.text()).toContain("使用量上限");
    expect(wrapper.text()).not.toContain("Groq API error");
  });

  it("hides the retry button when there is no assistant reply to retry", () => {
    const chat = useChatStore();
    chat.error = "boom";
    const wrapper = mountBanner();
    expect(wrapper.find(".errorRetryButton").exists()).toBe(false);
  });

  it("shows retry when the last message is a failed assistant reply, and retries it on click", async () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push({
      id: "a1",
      role: "assistant",
      content: "發生錯誤，請稍後再試一次。",
      createdAt: Date.now(),
      isStreaming: false,
    });
    chat.error = "boom";
    const wrapper = mountBanner();

    const retryButton = wrapper.find(".errorRetryButton");
    expect(retryButton.exists()).toBe(true);

    const regenerateSpy = vi.spyOn(chat, "regenerateAssistantMessage").mockResolvedValue(undefined);
    await retryButton.trigger("click");
    expect(regenerateSpy).toHaveBeenCalledWith("a1");
  });

  it("hides retry while a request is already in flight", () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push({
      id: "a1",
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      isStreaming: false,
    });
    chat.error = "boom";
    chat.sending = true;
    const wrapper = mountBanner();
    expect(wrapper.find(".errorRetryButton").exists()).toBe(false);
  });

  it("dismisses the error when the close button is clicked", async () => {
    const chat = useChatStore();
    chat.error = "boom";
    const wrapper = mountBanner();
    await wrapper.find(".errorDismissButton").trigger("click");
    expect(chat.error).toBeNull();
  });
});
