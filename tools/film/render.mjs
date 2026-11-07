// 逐帧渲染：在无头浏览器里打开 film.html，按 60 帧一帧帧调用 render(t) 截图，直接送进 ffmpeg 编码成 out/silent.mp4。
// 同时把音效时间表写到 out/cues.json，给 audio.py 用。需要 playwright（见 README）和 ffmpeg
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { extname } from 'node:path'
import { chromium } from 'playwright'

const FPS = 60
const DIR = new URL('./', import.meta.url)
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json' }

// 只给这一个目录开的静态服务器
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname.slice(1) || 'film.html'
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(await readFile(new URL(path, DIR)))
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((r) => server.listen(0, r))

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage()
page.on('pageerror', (e) => { console.error(e); process.exit(1) })
await page.goto(`http://localhost:${server.address().port}/film.html`)
await page.evaluate(() => window.ready)
const { cues, dur } = await page.evaluate(() => ({ cues: window.CUES, dur: window.DURATION }))
await writeFile(new URL('out/cues.json', DIR), JSON.stringify({ dur, cues }))

const n = Math.round(dur * FPS)
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'animation', new URL('out/silent.mp4', DIR).pathname], { stdio: ['pipe', 'inherit', 'inherit'] })
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.render(t), i / FPS)
  if (!ff.stdin.write(await page.screenshot({ type: 'png' }))) await new Promise((r) => ff.stdin.once('drain', r))
  if (i % 120 === 0) console.log(`第 ${i} / ${n} 帧`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
await browser.close()
server.close()
console.log('out/silent.mp4')
