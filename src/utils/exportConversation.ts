import type { ChatConversation, ChatMessage } from "@/types/chat";

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString("zh-TW");
}

function roleLabel(role: ChatMessage["role"]) {
  if (role === "user") return "你";
  if (role === "assistant") return "機器人";
  return "系統";
}

export function conversationToMarkdown(conversation: ChatConversation): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title}`);
  lines.push("");
  lines.push(`**Provider：** ${conversation.provider}`);
  lines.push(`**建立時間：** ${formatTimestamp(conversation.createdAt)}`);
  lines.push("");
  lines.push("---");

  for (const message of conversation.messages) {
    lines.push("");
    lines.push(`## ${roleLabel(message.role)}（${formatTimestamp(message.createdAt)}）`);
    lines.push("");
    if (message.images?.length) {
      for (const img of message.images) {
        lines.push(`![${img.name}](${img.dataUrl})`);
      }
      lines.push("");
    }
    lines.push(message.content);
  }

  return lines.join("\n");
}

export function conversationToJson(conversation: ChatConversation): string {
  return JSON.stringify(conversation, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "conversation";
}

export type ExportFormat = "markdown" | "json";

export function exportConversation(conversation: ChatConversation, format: ExportFormat) {
  const baseName = sanitizeFilename(conversation.title);
  if (format === "markdown") {
    downloadTextFile(
      `${baseName}.md`,
      conversationToMarkdown(conversation),
      "text/markdown;charset=utf-8"
    );
  } else {
    downloadTextFile(
      `${baseName}.json`,
      conversationToJson(conversation),
      "application/json;charset=utf-8"
    );
  }
}
