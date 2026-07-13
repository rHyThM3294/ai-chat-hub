# AI Chat Hub

一個以 Vue 3 + TypeScript 打造的多模型 AI 聊天介面，目前串接 [Groq](https://groq.com/) API，並預留了可抽換不同 LLM 供應商的架構。

## 功能特色

- **多輪對話管理**：可建立、切換、重新命名、刪除多組對話，內容自動存於 `localStorage`。
- **串流回覆 + 逐字顯示**：透過 SSE 接收 token，並用自製的節流佇列（display queue）模擬逐字輸出效果，可隨時中止生成（Abort）。
- **多 Provider 抽象層**：`ChatProvider` 介面統一 `send` / `stream` 兩種呼叫方式，目前實作了 `mock`（離線示範用）與 `groq`（透過後端代理），`openai` 也已實作但因未設定金鑰暫時停用。
- **Markdown 渲染 + 程式碼高亮**：使用 `markdown-it` 解析、`DOMPurify` 消毒 XSS、`highlight.js` 上色，程式碼區塊可一鍵複製。
- **對話重新生成 / 編輯重送**：可針對某則使用者訊息修改後重新生成、或直接重新生成某則 AI 回覆。
- **Token 估算**：粗略估算每則訊息與整個對話的 token 數。
- **API Key 不外洩**：金鑰只存在 Vercel 環境變數，前端一律透過 `/api/*` serverless function 代理呼叫，不會出現在瀏覽器端。

## 技術棧

| 分類            | 使用技術                                     |
| --------------- | -------------------------------------------- |
| 框架            | Vue 3（`<script setup>`）、Vue Router、Pinia |
| 語言            | TypeScript（`strict` 模式）                  |
| 建置工具        | Vite                                         |
| Markdown / 高亮 | markdown-it、highlight.js、DOMPurify         |
| 動效            | GSAP                                         |
| 圖示            | Font Awesome                                 |
| 部署            | Vercel（Serverless Functions + 靜態網站）    |

## 專案架構

```
src/
├─ views/ChatView.vue           # 唯一頁面，整體版面配置
├─ components/chat/             # 聊天室 UI（側欄、輸入框、訊息列表、訊息氣泡...）
├─ stores/chat.store.ts         # 核心狀態管理：對話 CRUD、串流節流佇列、localStorage 持久化
├─ providers/                   # LLM 供應商抽象層
│  ├─ base.ts                   #   ChatProvider 介面定義
│  ├─ groq.ts / openai.ts       #   實際串接（呼叫對應 /api/* 代理）
│  └─ mock.ts                   #   離線假回覆，方便開發/展示不消耗額度
├─ types/chat.ts                # 共用型別定義
└─ utils/                       # markdown 渲染、token 估算等工具

api/
├─ groq.ts    # Vercel Function：代理 Groq Chat Completions（SSE 轉發）
├─ chat.ts    # Vercel Function：代理 OpenAI Chat Completions（SSE 轉發）
└─ ping.ts    # 健康檢查端點
```

## 本地開發

需求：Node.js 18+（開發時使用 v22）。

```bash
# 安裝依賴
npm install

# 設定環境變數（金鑰只在 serverless function 端讀取，不會打包進前端）
cp .env.local.example .env.local
# 編輯 .env.local，填入你自己的 GROQ_API_KEY

# 啟動開發伺服器
npm run dev
```

> 若沒有設定 `GROQ_API_KEY`，仍可選擇 `Mock` 供應商離線試用整個聊天流程（含逐字顯示效果）。

## 建置

```bash
npm run build    # 型別檢查 (vue-tsc) + Vite production build
npm run preview  # 預覽 build 結果
```

## 部署

專案設定為部署到 [Vercel](https://vercel.com/)：

- `vercel.json` 將 `/api/*` 導向對應的 Serverless Function，其餘路徑導向 SPA 的 `index.html`。
- 需在 Vercel 專案的環境變數設定 `GROQ_API_KEY`（若要啟用 OpenAI 供應商則另外設定 `OPENAI_API_KEY`）。
