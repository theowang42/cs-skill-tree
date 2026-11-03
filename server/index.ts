// API 服务：npm run api（默认端口 3000）。零依赖：node:http + node:sqlite。
// 如果构建过前端（dist/），也顺带把它当静态站点发出去，这样一条命令就能跑起完整的带后端版本。
//
// 内容（只读）
//   GET    /api/health
//   GET    /api/roadmap                        整棵树，和 public/data/roadmap.json 一样
//   GET    /api/skills/:id | /api/areas/:id | /api/subs/:id | /api/categories/:id
//   GET    /api/search?q=关键词&limit=20
//   GET    /api/stats                          表行数 + 社区统计
// 学习者
//   POST   /api/learners                       新建，返回 { id, goalSubId, skills }
//   GET    /api/learners/:id
//   DELETE /api/learners/:id                   删除这个学习者和全部记录
//   PUT    /api/learners/:id/goal              { "subId": "backend" | null }
//   PUT    /api/learners/:id/skills/:skill     { "status": "learning" | "done" | null }
//   PATCH  /api/learners/:id/skills            { "changes": { "<技能>": "done" | "learning" | null, … } }
//   GET    /api/learners/:id/summary           状态计数、能力边界、目标就绪度、离得最近的方向
//   GET    /api/learners/:id/readiness         所有方向的就绪度
//   GET    /api/learners/:id/events?limit=50   最近的操作记录
//   GET    /api/learners/:id/export            进度文件
//   POST   /api/learners/:id/import            用进度文件整体替换
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseSync } from 'node:sqlite'
import type { ProgressEntry, ProgressFile, Status } from '../src/types.ts'
import { DEFAULT_DB_PATH, migrate, openDatabase, tableCounts } from './db.ts'
import { getRoadmap, search } from './roadmap.ts'
import {
  communityStats, createLearner, deleteLearner, events, getLearner, isStatus, learnerExists, readinessAll,
  replaceProgress, setGoal, setStatuses, summary, unknownSkills,
} from './learners.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const MAX_BODY = 1 << 20
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const ID = /^[a-z0-9][a-z0-9-]*$/
const LEARNER_ID = /^[0-9a-f]{32}$/
const notFound = (what: string) => new HttpError(404, `${what}不存在`)
const badRequest = (msg: string) => new HttpError(400, msg)

function send(res: ServerResponse, status: number, body: unknown) {
  if (status === 204) {
    res.writeHead(204).end()
    return
  }
  res.writeHead(status, { 'content-type': MIME['.json'], 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > MAX_BODY) throw new HttpError(413, '请求体太大')
    chunks.push(c as Buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    throw badRequest('请求体不是合法的 JSON')
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw badRequest('请求体必须是 JSON 对象')
  return v as Record<string, unknown>
}

/** 校验一份进度文件，返回清洗过的内容；不认识的技能直接丢掉，并告诉调用方丢了哪些 */
export function parseProgressFile(db: DatabaseSync, body: Record<string, unknown>) {
  if (body.format !== 'cs-skill-tree-progress') throw badRequest('不是 cs-skill-tree 的进度文件')
  if (body.version !== 1) throw badRequest(`不支持的进度文件版本 ${String(body.version)}`)
  const raw = body.skills
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('skills 必须是对象')
  const entries = Object.entries(raw as Record<string, unknown>)
  const unknown = new Set(unknownSkills(db, entries.map(([k]) => k)))
  const skills: Record<string, ProgressEntry> = {}
  for (const [id, e] of entries) {
    if (unknown.has(id)) continue
    const entry = e as Partial<ProgressEntry> | null
    if (!entry || !isStatus(entry.status)) throw badRequest(`技能 ${id} 的状态不对`)
    const at = typeof entry.updatedAt === 'string' && !Number.isNaN(Date.parse(entry.updatedAt)) ? new Date(entry.updatedAt).toISOString() : new Date().toISOString()
    skills[id] = { status: entry.status, updatedAt: at }
  }
  let goal = body.goalSubId ?? null
  if (goal !== null && (typeof goal !== 'string' || !db.prepare('SELECT 1 FROM subs WHERE id = ?').get(goal))) goal = null
  return { goalSubId: goal as string | null, skills, dropped: [...unknown] }
}

function requireLearner(db: DatabaseSync, id: string | undefined): string {
  if (!id || !LEARNER_ID.test(id) || !learnerExists(db, id)) throw notFound('学习者')
  return id
}

/** API 路由。返回 false 表示这个路径不归 API 管。 */
export async function handleApi(db: DatabaseSync, req: IncomingMessage, url: URL, res: ServerResponse): Promise<boolean> {
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] !== 'api') return false
  const method = req.method ?? 'GET'
  const [, a, b, c, d, ...rest] = parts
  if (rest.length) throw notFound('这个接口')
  const route = `${method} /${[a, b && ':b', c, d && ':d'].filter(Boolean).join('/')}`

  switch (route) {
    case 'GET /health':
      send(res, 200, { ok: true, skills: (db.prepare('SELECT COUNT(*) AS n FROM skills').get() as { n: number }).n })
      return true
    case 'GET /roadmap':
      send(res, 200, getRoadmap(db))
      return true
    case 'GET /search': {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20) || 20, 1), 100)
      send(res, 200, search(db, url.searchParams.get('q') ?? '', limit))
      return true
    }
    case 'GET /stats':
      send(res, 200, { tables: tableCounts(db), community: communityStats(db) })
      return true
    case 'GET /skills/:b':
    case 'GET /areas/:b':
    case 'GET /subs/:b':
    case 'GET /categories/:b': {
      if (!ID.test(b)) throw notFound(b)
      const roadmap = getRoadmap(db)
      const list = { skills: roadmap.skills, areas: roadmap.areas, subs: roadmap.subs, categories: roadmap.categories }[a as 'skills']
      const found = (list as { id: string }[]).find((x) => x.id === b)
      if (!found) throw notFound(`${a} 里的 ${b}`)
      send(res, 200, found)
      return true
    }
    case 'POST /learners':
      send(res, 201, createLearner(db))
      return true
    case 'GET /learners/:b':
      send(res, 200, getLearner(db, requireLearner(db, b)))
      return true
    case 'DELETE /learners/:b':
      deleteLearner(db, requireLearner(db, b))
      send(res, 204, null)
      return true
    case 'PUT /learners/:b/goal': {
      const id = requireLearner(db, b)
      const { subId } = await readJson(req)
      if (subId !== null && (typeof subId !== 'string' || !ID.test(subId))) throw badRequest('subId 要么是方向 id，要么是 null')
      if (!setGoal(db, id, subId)) throw notFound(`方向 ${subId}`)
      send(res, 200, getLearner(db, id))
      return true
    }
    case 'PUT /learners/:b/skills/:d': {
      const id = requireLearner(db, b)
      const { status } = await readJson(req)
      if (status !== null && !isStatus(status)) throw badRequest('status 只能是 learning、done 或 null')
      if (unknownSkills(db, [d]).length) throw notFound(`技能 ${d}`)
      setStatuses(db, id, { [d]: status as Status | null })
      send(res, 200, getLearner(db, id))
      return true
    }
    case 'PATCH /learners/:b/skills': {
      const id = requireLearner(db, b)
      const { changes } = await readJson(req)
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw badRequest('changes 必须是 { 技能: 状态 } 对象')
      const entries = Object.entries(changes as Record<string, unknown>)
      if (entries.length > 1000) throw badRequest('一次最多改 1000 个技能')
      for (const [k, v] of entries) if (v !== null && !isStatus(v)) throw badRequest(`技能 ${k} 的状态只能是 learning、done 或 null`)
      const unknown = unknownSkills(db, entries.map(([k]) => k))
      if (unknown.length) throw badRequest(`没有这些技能：${unknown.join('、')}`)
      setStatuses(db, id, changes as Record<string, Status | null>)
      send(res, 200, getLearner(db, id))
      return true
    }
    case 'GET /learners/:b/summary':
      send(res, 200, summary(db, requireLearner(db, b)))
      return true
    case 'GET /learners/:b/readiness':
      send(res, 200, readinessAll(db, requireLearner(db, b)))
      return true
    case 'GET /learners/:b/events': {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 500)
      send(res, 200, events(db, requireLearner(db, b), limit))
      return true
    }
    case 'GET /learners/:b/export': {
      const l = getLearner(db, requireLearner(db, b))!
      const file: ProgressFile = { format: 'cs-skill-tree-progress', version: 1, exportedAt: new Date().toISOString(), goalSubId: l.goalSubId, skills: l.skills }
      send(res, 200, file)
      return true
    }
    case 'POST /learners/:b/import': {
      const id = requireLearner(db, b)
      const parsed = parseProgressFile(db, await readJson(req))
      replaceProgress(db, id, parsed.goalSubId, parsed.skills)
      send(res, 200, { learner: getLearner(db, id), dropped: parsed.dropped })
      return true
    }
  }
  throw notFound('这个接口')
}

function serveStatic(url: URL, res: ServerResponse): boolean {
  if (!existsSync(DIST)) return false
  let file: string
  try {
    file = normalize(join(DIST, decodeURIComponent(url.pathname)))
  } catch {
    return false
  }
  if (file !== DIST && !file.startsWith(DIST + sep)) return false
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
      if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(url, res)) return
      send(res, 404, { error: '没找到。前端没构建过的话只有 /api 可用' })
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message })
      console.error(e)
      send(res, 500, { error: '服务器出错了' })
    }
  })
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const db = openDatabase()
  const m = migrate(db)
  if (m.applied.length) console.log(`应用了迁移：${m.applied.join('、')}`)
  if ((db.prepare('SELECT COUNT(*) AS n FROM skills').get() as { n: number }).n === 0) {
    console.error('数据库里还没有内容，先跑 npm run db:build')
    process.exit(1)
  }
  const port = Number(process.env.PORT ?? 3000)
  createApp(db).listen(port, () => {
    console.log(`API 已启动：http://localhost:${port}/api/roadmap（数据库 ${DEFAULT_DB_PATH}）`)
    if (existsSync(DIST)) console.log(`页面：http://localhost:${port}/`)
  })
}
