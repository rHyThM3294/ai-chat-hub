import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' // 另一種現代的寫法

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 將 '@' 映射到 'src' 資料夾
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})