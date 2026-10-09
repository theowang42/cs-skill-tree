import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让构建产物在 GitHub Pages 的子路径下也能正常加载
export default defineConfig({
  base: './',
  plugins: [react()],
})
