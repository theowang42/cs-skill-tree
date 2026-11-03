// 同时启动 API（3000）和 Vite（5173，/api 代理到 3000），前端走带数据库的模式。
// 用法：npm run dev:api
import { spawn } from 'node:child_process'

const children = [
  spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server/index.ts'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit', env: { ...process.env, VITE_API: '1' }, shell: process.platform === 'win32' }),
]
const stop = () => children.forEach((c) => c.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const c of children) c.on('exit', (code) => { stop(); process.exitCode = code ?? 0 })
