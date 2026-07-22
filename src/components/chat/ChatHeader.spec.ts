import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatHeader from "./ChatHeader.vue";
import { useChatStore } from "@/stores/chat.store";

const exportConversationMock = vi.fn();
vi.mock("@/utils/exportConversation", () => ({
  exportConversation: (...args: unknown[]) => exportConversationMock(...args),
}));

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  exportConversationMock.mockClear();
});

describe("ChatHeader", () => {
  it("shows the current provider and token count", () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push({
      id: "u1",
      role: "user",
      content: "哈囉",
      createdAt: Date.now(),
      tokenCount: 12,
    });
    const wrapper = mount(ChatHeader);
    expect(wrapper.text()).toContain("mock");
    expect(wrapper.text()).toContain("12");
  });

  it("changes the active conversation's provider via the select", async () => {
    const chat = useChatStore();
    const wrapper = mount(ChatHeader);
    await wrapper.find("select.model").setValue("groq");
    expect(chat.provider).toBe("groq");
  });

  it("disables the export button when the conversation has no messages", () => {
    const wrapper = mount(ChatHeader);
    expect(wrapper.find(".exportButton").attributes("disabled")).toBeDefined();
  });

  it("enables export once there are messages, and exports the active conversation on click", async () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push({
      id: "u1",
      role: "user",
      content: "哈囉",
      createdAt: Date.now(),
    });
    const wrapper = mount(ChatHeader);
    const exportButton = wrapper.find(".exportButton");
    expect(exportButton.attributes("disabled")).toBeUndefined();

    await exportButton.trigger("click");
    expect(wrapper.find(".exportMenu").exists()).toBe(true);

    await wrapper.findAll(".exportMenuItem")[0]!.trigger("click");
    expect(exportConversationMock).toHaveBeenCalledWith(chat.activeConversation, "markdown");
    expect(wrapper.find(".exportMenu").exists()).toBe(false);
  });

  it("toggles the theme when the theme button is clicked", async () => {
    const wrapper = mount(ChatHeader);
    const before = document.documentElement.getAttribute("data-theme");
    await wrapper.find(".themeToggle").trigger("click");
    const after = document.documentElement.getAttribute("data-theme");
    expect(after).not.toBe(before);
    // toggle back so this test doesn't leak state into other tests in this file
    await wrapper.find(".themeToggle").trigger("click");
  });

  it("creates a new conversation when '新對話' is clicked", async () => {
    const chat = useChatStore();
    const wrapper = mount(ChatHeader);
    const before = chat.conversations.length;
    await wrapper.find(".newChat").trigger("click");
    expect(chat.conversations.length).toBe(before + 1);
  });
});
