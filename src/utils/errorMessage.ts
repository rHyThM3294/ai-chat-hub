export function humanizeError(raw: string | null | undefined): string {
  if (!raw) return "發生未知錯誤，請稍後再試一次。";

  if (raw.includes("Missing GROQ_API_KEY") || raw.includes("Missing OPENAI_API_KEY")) {
    return "伺服器尚未設定 API 金鑰，請聯絡網站管理者。";
  }
  if (raw === "Provider not found") {
    return "找不到對應的 AI 供應商設定。";
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("network")) {
    return "網路連線異常，請檢查網路狀態後再試一次。";
  }

  const statusMatch = raw.match(/API error \((\d+)\)/);
  const status = statusMatch?.[1] ? Number(statusMatch[1]) : null;

  if (status === 401 || status === 403) {
    return "API 金鑰無效或權限不足，請確認伺服器端的金鑰設定。";
  }
  if (status === 404) {
    return "找不到對應的 API 端點，請確認伺服器設定。";
  }
  if (status === 429) {
    return "已達到 API 使用量上限，請稍後再試一次。";
  }
  if (status && status >= 500) {
    return "AI 服務暫時發生問題，請稍後再試一次。";
  }
  if (status) {
    return `AI 服務發生錯誤（狀態碼 ${status}），請稍後再試一次。`;
  }

  return "發生未知錯誤，請稍後再試一次。";
}
