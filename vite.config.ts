import { defineConfig } from 'vite'

// VITE_API=1 时前端用 /api（进度存数据库），否则读 public/data/roadmap.json（进度存浏览器）。
// 开发时 /api 代理到 npm run api 起的服务。
export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
