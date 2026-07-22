import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import MessageList from "./MessageList.vue";
import { useChatStore } from "@/stores/chat.store";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  // jsdom doesn't implement scrollTo; the component calls it reactively on every message update
  Element.prototype.scrollTo = vi.fn();
});

describe("MessageList", () => {
  it("shows an empty-state hint naming the active provider when there are no messages", () => {
    const wrapper = mount(MessageList);
    expect(wrapper.find(".hint").text()).toContain("mock");
  });

  it("renders each message with the correct role label and content", () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push(
      { id: "u1", role: "user", content: "哈囉", createdAt: Date.now() },
      { id: "a1", role: "assistant", content: "你好", createdAt: Date.now(), isStreaming: false }
    );
    const wrapper = mount(MessageList);
    const rows = wrapper.findAll(".messageRow");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.classes()).toContain("isUser");
    expect(rows[0]!.text()).toContain("你");
    expect(rows[0]!.text()).toContain("哈囉");
    expect(rows[1]!.classes()).toContain("isAssistant");
    expect(rows[1]!.text()).toContain("機器人");
    expect(rows[1]!.text()).toContain("你好");
  });

  it("regenerates the right message when its regenerate button is clicked", async () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push(
      { id: "u1", role: "user", content: "哈囉", createdAt: Date.now() },
      { id: "a1", role: "assistant", content: "你好", createdAt: Date.now(), isStreaming: false }
    );
    const wrapper = mount(MessageList);
    const regenerateSpy = vi.spyOn(chat, "regenerateAssistantMessage").mockResolvedValue(undefined);

    await wrapper.find('.iconButton[title="重新生成"]').trigger("click");
    expect(regenerateSpy).toHaveBeenCalledWith("a1");
  });

  it("announces the assistant reply via the aria-live region only once it finishes streaming", async () => {
    const chat = useChatStore();
    chat.activeConversation!.messages.push({
      id: "a1",
      role: "assistant",
      content: "打字中...",
      createdAt: Date.now(),
      isStreaming: true,
    });
    const wrapper = mount(MessageList);
    expect(wrapper.find('[role="status"]').text()).toBe("");

    chat.activeConversation!.messages[0]!.isStreaming = false;
    await nextTick();
    expect(wrapper.find('[role="status"]').text()).toBe("打字中...");
  });
});
