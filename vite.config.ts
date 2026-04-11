import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
export default defineConfig({
  plugins:[vue()],
  resolve:{
    alias:{
      '@':fileURLToPath(new URL('./src',import.meta.url))
    }
  },
  server:{
    proxy:{
      '/api/groq':{
        target:'https://api.groq.con',
        changeOrigin:true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1/chat/completions'),
        selfHandleResponse:true,
        configure(proxy){
          proxy.on('proxyRes',(proxyRes,req,res) => {
            res.writeHead(proxyRes.statusCode ?? 200,proxyRes.headers)
            proxyRes.pipe(res)
          })
        },
      }
    }
  }
})