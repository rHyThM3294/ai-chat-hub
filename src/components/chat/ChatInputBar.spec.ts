import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatInputBar from "./ChatInputBar.vue";
import { useChatStore } from "@/stores/chat.store";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

function createFile(name: string, type: string, sizeBytes: number) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

async function selectFile(wrapper: ReturnType<typeof mount>, file: File) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
  // handleFileChange awaits FileReader, which resolves via a macrotask in jsdom,
  // so a few flushPromises() ticks are needed for the DOM to catch up
  await flushPromises();
  await flushPromises();
  await flushPromises();
}

describe("ChatInputBar", () => {
  it("disables send until there is text, and enables it once typed", async () => {
    const wrapper = mount(ChatInputBar);
    expect(wrapper.find(".sendButton").attributes("disabled")).toBeDefined();

    await wrapper.find(".userText").setValue("哈囉");
    expect(wrapper.find(".sendButton").attributes("disabled")).toBeUndefined();
  });

  it("sends the trimmed text and clears the input on click", async () => {
    const chat = useChatStore();
    const sendSpy = vi.spyOn(chat, "sendUserText").mockResolvedValue(undefined);
    const wrapper = mount(ChatInputBar);

    await wrapper.find(".userText").setValue("  哈囉  ");
    await wrapper.find(".sendButton").trigger("click");

    expect(sendSpy).toHaveBeenCalledWith("哈囉", []);
    expect((wrapper.find(".userText").element as HTMLTextAreaElement).value).toBe("");
  });

  it("sends on Enter but not on Shift+Enter", async () => {
    const chat = useChatStore();
    const sendSpy = vi.spyOn(chat, "sendUserText").mockResolvedValue(undefined);
    const wrapper = mount(ChatInputBar);
    const textarea = wrapper.find(".userText");

    await textarea.setValue("换行測試");
    await textarea.trigger("keydown", { key: "Enter", shiftKey: true });
    expect(sendSpy).not.toHaveBeenCalled();

    await textarea.trigger("keydown", { key: "Enter" });
    expect(sendSpy).toHaveBeenCalledWith("换行測試", []);
  });

  it("shows a stop button and calls stopGenerating while a reply is in progress", async () => {
    const chat = useChatStore();
    chat.sending = true;
    const stopSpy = vi.spyOn(chat, "stopGenerating");
    const wrapper = mount(ChatInputBar);

    expect(wrapper.find(".sendButton").text()).toBe("停止生成");
    await wrapper.find(".sendButton").trigger("click");
    expect(stopSpy).toHaveBeenCalled();
  });

  it("rejects an oversized image with a clear error message", async () => {
    const wrapper = mount(ChatInputBar);
    const bigFile = createFile("big.png", "image/png", 4 * 1024 * 1024);
    await selectFile(wrapper, bigFile);
    expect(wrapper.find(".errorMessage").text()).toContain("超過 3MB 上限");
    expect(wrapper.find(".pendingImageItem").exists()).toBe(false);
  });

  it("previews a valid image and can remove it before sending", async () => {
    const wrapper = mount(ChatInputBar);
    const smallFile = createFile("cat.png", "image/png", 10);
    await selectFile(wrapper, smallFile);

    expect(wrapper.find(".pendingImageItem").exists()).toBe(true);
    await wrapper.find(".removeImageButton").trigger("click");
    expect(wrapper.find(".pendingImageItem").exists()).toBe(false);
  });
});
