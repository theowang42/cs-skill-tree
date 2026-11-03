// API 服务：node server/index.ts，默认监听 3000。
// 没有任何依赖，用 node:http 和 node:sqlite。构建过 dist/ 的话也顺带当静态服务器用。
//
//   GET  /api/roadmap                      整棵树（和 public/data/roadmap.json 一样）
//   GET  /api/categories/:id | /api/subs/:id | /api/tools/:id | /api/blocks/:id
//   GET  /api/search?q=关键词
//   GET  /api/stats                        表行数 + 社区统计
//   POST /api/learners                     新建学习者，返回 id
//   GET  /api/learners/:id
//   PUT  /api/learners/:id/goal            { "subId": "backend" | null }
//   PUT  /api/learners/:id/progress/:block { "status": "learning" | "done" | null }
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseSync } from 'node:sqlite'
import { DEFAULT_DB_PATH, migrate, openDatabase, tableCounts } from './db.ts'
import { findBlock, findCategory, findSub, findTool, getRoadmap, search } from './roadmap.ts'
import { communityStats, createLearner, getLearner, setGoal, setProgress, STATUSES } from './learners.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2',
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try {
    const v = JSON.parse(text)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  } catch {
    // 落到下面
  }
  throw new HttpError(400, '请求体必须是 JSON 对象')
}

const ID = /^[a-z0-9-]+$/
const LEARNER_ID = /^[0-9a-f]{32}$/
const notFound = (what: string) => new HttpError(404, `${what}不存在`)

/** 路由。返回 undefined 表示这个路径不是 API。 */
export async function handleApi(db: DatabaseSync, req: IncomingMessage, url: URL, res: ServerResponse): Promise<boolean> {
  const parts = url.pathname.split('/').filter(Boolean) // ['api', ...]
  if (parts[0] !== 'api') return false
  const method = req.method ?? 'GET'
  const [, a, b, c, d] = parts

  if (method === 'GET' && a === 'roadmap' && !b) return json(res, 200, getRoadmap(db)), true
  if (method === 'GET' && a === 'search' && !b) return json(res, 200, search(db, url.searchParams.get('q') ?? '')), true
  if (method === 'GET' && a === 'stats' && !b) return json(res, 200, { tables: tableCounts(db), community: communityStats(db) }), true

  const finders = { categories: findCategory, subs: findSub, tools: findTool, blocks: findBlock } as const
  if (method === 'GET' && a in finders && b && !c) {
    if (!ID.test(b)) throw notFound('这个 id')
    const found = finders[a as keyof typeof finders](db, b)
    if (!found) throw notFound(`${a} 里的 ${b}`)
    return json(res, 200, found), true
  }

  if (a === 'learners') {
    if (method === 'POST' && !b) return json(res, 201, createLearner(db)), true
    if (!b || !LEARNER_ID.test(b)) throw notFound('学习者')
    if (method === 'GET' && !c) {
      const l = getLearner(db, b)
      if (!l) throw notFound('学习者')
      return json(res, 200, l), true
    }
    if (method === 'PUT' && c === 'goal' && !d) {
      if (!getLearner(db, b)) throw notFound('学习者')
      const body = await readJson(req)
      const subId = body.subId
      if (subId !== null && (typeof subId !== 'string' || !ID.test(subId))) throw new HttpError(400, 'subId 要么是方向 id，要么是 null')
      if (!setGoal(db, b, subId)) throw notFound('方向')
      return json(res, 200, getLearner(db, b)), true
    }
    if (method === 'PUT' && c === 'progress' && d && parts.length === 5) {
      if (!getLearner(db, b)) throw notFound('学习者')
      if (!ID.test(d)) throw notFound('能力块')
      const body = await readJson(req)
      const status = body.status
      if (status !== null && !STATUSES.includes(status as never)) throw new HttpError(400, `status 只能是 ${STATUSES.join(' / ')} 或 null`)
      if (!setProgress(db, b, d, status as never)) throw notFound('能力块')
      return json(res, 200, getLearner(db, b)), true
    }
  }
  throw notFound('这个接口')
}

function serveStatic(url: URL, res: ServerResponse): boolean {
  if (!existsSync(DIST)) return false
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)))
  if (!file.startsWith(DIST)) return false
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) file = join(DIST, 'index.html')
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
  return true
}

export function createApp(db: DatabaseSync) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    try {
      if (await handleApi(db, req, url, res)) return
      if (serveStatic(url, res)) return
      json(res, 404, { error: '没有构建过前端，只有 /api 可用' })
    } catch (e) {
      if (e instanceof HttpError) return json(res, e.status, { error: e.message })
      console.error(e)
      json(res, 500, { error: '服务器出错了' })
    }
  })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const db = openDatabase()
  const m = migrate(db)
  if (m.applied.length) console.log(`应用了迁移：${m.applied.join('、')}`)
  const port = Number(process.env.PORT ?? 3000)
  createApp(db).listen(port, () => {
    console.log(`API 已启动：http://localhost:${port}/api/roadmap（数据库 ${DEFAULT_DB_PATH}）`)
  })
}
