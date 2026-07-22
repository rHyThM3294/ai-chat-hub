# AI Chat Hub

一個以 Vue 3 + TypeScript 打造的多模型 AI 聊天介面，目前串接 [Groq](https://groq.com/) API，並預留了可抽換不同 LLM 供應商的架構。

## 功能特色

- **多輪對話管理**：可建立、切換、重新命名、刪除多組對話，內容自動存於 `localStorage`。
- **串流回覆 + 逐字顯示**：透過 SSE 接收 token，並用自製的節流佇列（display queue）模擬逐字輸出效果，可隨時中止生成（Abort）。
- **多 Provider 抽象層**：`ChatProvider` 介面統一 `send` / `stream` 兩種呼叫方式，目前實作了 `mock`（離線示範用）與 `groq`（透過後端代理），`openai` 也已實作但因未設定金鑰暫時停用。
- **Markdown 渲染 + 程式碼高亮**：使用 `markdown-it` 解析、`DOMPurify` 消毒 XSS、`highlight.js` 上色，程式碼區塊可一鍵複製。
- **對話重新生成 / 編輯重送**：可針對某則使用者訊息修改後重新生成、或直接重新生成某則 AI 回覆。
- **Token 估算**：粗略估算每則訊息與整個對話的 token 數。
- **圖片上傳（視覺理解）**：輸入框可附加圖片（最多 3 張、單張 3MB），送出後 Groq provider 會自動切換為視覺模型 `meta-llama/llama-4-scout-17b-16e-instruct` 進行圖片理解；`Mock` 模式僅會提示收到的圖片數量，不做實際分析。
- **錯誤處理 UI**：API 失敗（金鑰缺失、rate limit、伺服器錯誤、網路異常等）會轉換成友善的中文提示，並提供「重試」與「關閉」按鈕，而不是直接顯示原始錯誤字串。
- **匯出對話**：可將目前對話匯出成 Markdown 或 JSON 檔案下載，Markdown 版本會保留附加的圖片。
- **無障礙支援**：對話清單項目用獨立按鈕（選取/刪除各自可鍵盤操作，不巢狀互動元素）、輸入框皆有 `aria-label`、Escape 可關閉側欄與匯出選單、AI 回覆完成時會透過 `aria-live` 廣播給螢幕閱讀器。以 Lighthouse 與 axe-core 實際跑過多種頁面狀態（含訊息、暗色模式、行動裝置側欄）驗證：Accessibility 100、SEO 100、Best Practices 100、Performance 95。
- **API Key 不外洩**：金鑰只存在 Vercel 環境變數，前端一律透過 `/api/*` serverless function 代理呼叫，不會出現在瀏覽器端。
- **限流防護**：`/api/groq`、`/api/chat` 依 IP 做簡易限流（每分鐘 20 次請求），避免有人略過前端直接打 API 消耗額度。實作是 serverless function 記憶體內計數（`api/_lib/rateLimit.ts`），優點是不需額外服務，缺點是不同執行實體間不共用計數，高流量時防護效果會打折扣；若流量成長，可換成 [Upstash](https://upstash.com/) Redis 等跨實體共享的方案。

## 技術棧

| 分類            | 使用技術                                                |
| --------------- | ------------------------------------------------------- |
| 框架            | Vue 3（`<script setup>`）、Vue Router、Pinia            |
| 語言            | TypeScript（`strict` 模式）                             |
| 建置工具        | Vite                                                    |
| Markdown / 高亮 | markdown-it、highlight.js（core + 精選語言）、DOMPurify |
| 圖示            | Font Awesome                                            |
| 部署            | Vercel（Serverless Functions + 靜態網站）               |

## 專案架構

```
src/
├─ views/ChatView.vue           # 唯一頁面，只負責整體版面外殼（側欄開合、layout）
├─ components/chat/             # 聊天室 UI，依職責拆成獨立元件
│  ├─ ChatHeader.vue            #   標題列、供應商選單、主題切換、匯出選單
│  ├─ ErrorBanner.vue           #   錯誤提示（友善訊息、重試、關閉）
│  ├─ MessageList.vue           #   訊息列表、自動捲動、aria-live 廣播
│  ├─ ChatInputBar.vue          #   輸入框、圖片上傳、送出/停止
│  ├─ ConversationSidebar.vue   #   對話清單側欄
│  └─ MessageContent.vue        #   單則訊息內容（markdown、程式碼高亮、圖片）
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

## 測試

```bash
npm run test       # Vitest 單元測試（store / provider / utils）+ 元件測試（@vue/test-utils）
npm run test:e2e   # Playwright e2e 測試（會先自動 build，再對 production build 跑瀏覽器測試）
npm run test:e2e:ui # 以互動式 UI 模式執行 e2e 測試，方便除錯
```

e2e 測試涵蓋首頁載入、傳送訊息與 Mock 回覆、暗色模式切換與持久化、圖片上傳與顯示。CI 會在每次 push/PR 時自動執行 lint、format check、單元測試、build 與 e2e 測試。

## 部署

專案設定為部署到 [Vercel](https://vercel.com/)：

- `vercel.json` 將 `/api/*` 導向對應的 Serverless Function，其餘路徑導向 SPA 的 `index.html`。
- 需在 Vercel 專案的環境變數設定 `GROQ_API_KEY`（若要啟用 OpenAI 供應商則另外設定 `OPENAI_API_KEY`）。
