import { afterEach, describe, expect, it, vi } from "vitest";
import { groqProvider } from "./groq";
import type { ChatMessage, ChatSendInput } from "@/types/chat";

const input: ChatSendInput = {
  conversationId: "c1",
  provider: "groq",
  userText: "hi",
};

function sseStream(lines: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("groqProvider.send", () => {
  it("returns the assistant text from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ assistantText: "hello there" }),
      })
    );
    const result = await groqProvider.send(input, []);
    expect(result.assistantText).toBe("hello there");
  });

  it("throws with the response status when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "boom",
      })
    );
    await expect(groqProvider.send(input, [])).rejects.toThrow("Groq API error (500)");
  });
});

describe("groqProvider.stream", () => {
  it("parses SSE token/done events and invokes the handlers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseStream([
          `data: ${JSON.stringify({ token: "he" })}\n\n`,
          `data: ${JSON.stringify({ token: "llo" })}\n\n`,
          `data: ${JSON.stringify({ done: true })}\n\n`,
        ]),
      })
    );

    const tokens: string[] = [];
    let done = false;
    await groqProvider.stream?.(input, [], {
      onToken: (token) => tokens.push(token),
      onDone: () => {
        done = true;
      },
    });

    expect(tokens.join("")).toBe("hello");
    expect(done).toBe(true);
  });

  it("throws when the server sends an error event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseStream([`data: ${JSON.stringify({ error: "rate limited" })}\n\n`]),
      })
    );

    await expect(
      groqProvider.stream?.(input, [], {
        onToken: () => {},
      })
    ).rejects.toThrow("rate limited");
  });
});

describe("groqProvider model selection and image attachments", () => {
  it("uses the text model and plain string content when no images are attached", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assistantText: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const history: ChatMessage[] = [{ id: "u1", role: "user", content: "hello", createdAt: 0 }];
    await groqProvider.send(input, history);

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("switches to the vision model and builds multi-part content when images are attached", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assistantText: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "what is this?",
        createdAt: 0,
        images: [{ id: "img1", name: "photo.png", dataUrl: "data:image/png;base64,AAA" }],
      },
    ];
    await groqProvider.send(input, history);

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
    expect(body.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "what is this?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAA" } },
        ],
      },
    ]);
  });
});
