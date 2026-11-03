// 进度存在哪：静态站点存浏览器（LocalStore），跑着 API 时存数据库（ApiStore）。
// 两者接口一样，界面不用关心。界面先乐观更新，再调用这里；失败了界面会重新 load。
import type { Learner, Progress, ProgressEntry, ProgressFile, Status } from '../types.ts'

export type Changes = Record<string, Status | null>

export interface ProgressStore {
  readonly kind: 'local' | 'api'
  /** 给用户看的一句话：进度存在哪 */
  readonly where: string
  load(): Promise<Progress>
  apply(changes: Changes): Promise<void>
  setGoal(subId: string | null): Promise<void>
  /** 整体替换（导入）。返回被丢掉的、已不存在的技能 */
  replace(progress: Progress, known: Set<string>): Promise<string[]>
  reset(): Promise<void>
  /** 别的标签页改了进度时通知（只有浏览器存储需要），返回取消订阅的函数 */
  subscribe?(onChange: () => void): () => void
}

/**
 * 去掉内容里已经不存在的技能和方向。内容更新后（技能删了或改了 id），
 * 浏览器里存的旧进度、导入的文件、分享链接都可能带着它们，不清掉页面会出错。
 */
export function sanitize(progress: Progress, skills: Set<string>, subs: Set<string>): { progress: Progress; dropped: string[] } {
  const dropped = Object.keys(progress.skills).filter((id) => !skills.has(id))
  const goalSubId = progress.goalSubId && subs.has(progress.goalSubId) ? progress.goalSubId : null
  if (!dropped.length && goalSubId === progress.goalSubId) return { progress, dropped }
  const kept = Object.fromEntries(Object.entries(progress.skills).filter(([id]) => skills.has(id)))
  return { progress: { goalSubId, skills: kept }, dropped }
}

export const emptyProgress = (): Progress => ({ goalSubId: null, skills: {} })

/** 把一批改动应用到进度上，返回新对象 */
export function applyChanges(progress: Progress, changes: Changes, at = new Date().toISOString()): Progress {
  const skills = { ...progress.skills }
  for (const [id, status] of Object.entries(changes)) {
    if (status === null) delete skills[id]
    else if (skills[id]?.status !== status) skills[id] = { status, updatedAt: at }
  }
  return { ...progress, skills }
}

export function toFile(progress: Progress): ProgressFile {
  return { format: 'cs-skill-tree-progress', version: 1, exportedAt: new Date().toISOString(), ...progress }
}

/** 解析导入的文件；格式不对抛出带中文说明的错误 */
export function parseFile(text: string): Progress {
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    throw new Error('文件不是 JSON')
  }
  const f = v as Partial<ProgressFile>
  if (!f || f.format !== 'cs-skill-tree-progress') throw new Error('这不是 cs-skill-tree 导出的进度文件')
  if (f.version !== 1) throw new Error(`不认识的进度文件版本：${String(f.version)}`)
  if (!f.skills || typeof f.skills !== 'object') throw new Error('文件里没有技能数据')
  const skills: Record<string, ProgressEntry> = {}
  for (const [id, e] of Object.entries(f.skills)) {
    if (e && (e.status === 'done' || e.status === 'learning')) {
      skills[id] = { status: e.status, updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString() }
    }
  }
  return { goalSubId: typeof f.goalSubId === 'string' ? f.goalSubId : null, skills }
}

// ───────────── 浏览器 ─────────────

const LOCAL_KEY = 'cs-skill-tree:progress:v1'

// localStorage 在隐私模式等情况下可能不可用，读写都要兜底
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // 存不了就只在这次访问里生效
  }
}

export class LocalStore implements ProgressStore {
  readonly kind = 'local'
  readonly where = '进度保存在这台设备的浏览器里。换设备前记得导出。'
  private progress: Progress = emptyProgress()

  /** 从 localStorage 读最新的（可能被别的标签页改过）；读不到就用内存里的 */
  private fresh(): Progress {
    const raw = readStorage(LOCAL_KEY)
    if (raw) {
      try {
        this.progress = parseFile(raw)
      } catch {
        // 存的东西坏了，保留内存里的
      }
    }
    return this.progress
  }

  async load() {
    return this.fresh()
  }

  private persist() {
    writeStorage(LOCAL_KEY, JSON.stringify(toFile(this.progress)))
  }

  // 每次写之前先读一遍，两个标签页各改各的技能时不会互相覆盖
  async apply(changes: Changes) {
    this.progress = applyChanges(this.fresh(), changes)
    this.persist()
  }

  async setGoal(subId: string | null) {
    this.progress = { ...this.fresh(), goalSubId: subId }
    this.persist()
  }

  subscribe(onChange: () => void) {
    const handler = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY) onChange()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  async replace(progress: Progress, known: Set<string>) {
    const dropped = Object.keys(progress.skills).filter((id) => !known.has(id))
    const skills = Object.fromEntries(Object.entries(progress.skills).filter(([id]) => known.has(id)))
    this.progress = { goalSubId: progress.goalSubId, skills }
    this.persist()
    return dropped
  }

  async reset() {
    this.progress = emptyProgress()
    writeStorage(LOCAL_KEY, null)
  }
}

// ───────────── API ─────────────

const LEARNER_KEY = 'cs-skill-tree:learner'

export class RequestError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new RequestError(res.status, err?.error ?? `请求失败（${res.status}）`)
  }
  return (res.status === 204 ? null : await res.json()) as T
}

export class ApiStore implements ProgressStore {
  readonly kind = 'api'
  readonly where = '进度保存在服务器的数据库里，用同一个浏览器打开就能看到。'
  private id: string | null = readStorage(LEARNER_KEY)
  /** 写请求排队发，保证同一个技能连续改两次时服务器上的顺序和界面一致 */
  private queue: Promise<unknown> = Promise.resolve()

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn)
    this.queue = next.catch(() => undefined)
    return next
  }

  private async ensure(): Promise<Learner> {
    if (this.id) {
      try {
        return await request<Learner>('GET', `/learners/${this.id}`)
      } catch (e) {
        // 只有服务器明确说“没有这个学习者”（比如数据库重建过）才新建；
        // 网络断了、服务器重启中这类错误要往上抛，不能把用户换成一个空的新身份
        if (!(e instanceof RequestError && e.status === 404)) throw e
      }
    }
    const l = await request<Learner>('POST', '/learners')
    this.id = l.id
    writeStorage(LEARNER_KEY, l.id)
    return l
  }

  // 读也排队：等前面的写都落地了再读，界面和数据库才一致
  async load(): Promise<Progress> {
    const l = await this.enqueue(() => this.ensure())
    return { goalSubId: l.goalSubId, skills: l.skills }
  }

  async apply(changes: Changes) {
    await this.enqueue(() => request('PATCH', `/learners/${this.id}/skills`, { changes }))
  }

  async setGoal(subId: string | null) {
    await this.enqueue(() => request('PUT', `/learners/${this.id}/goal`, { subId }))
  }

  async replace(progress: Progress) {
    const r = await this.enqueue(() => request<{ dropped: string[] }>('POST', `/learners/${this.id}/import`, toFile(progress)))
    return r.dropped
  }

  async reset() {
    await this.enqueue(async () => {
      if (this.id) await request('DELETE', `/learners/${this.id}`).catch(() => undefined)
      this.id = null
      writeStorage(LEARNER_KEY, null)
      await this.ensure()
    })
  }
}

export const USE_API = import.meta.env?.VITE_API === '1'
export const createStore = (): ProgressStore => (USE_API ? new ApiStore() : new LocalStore())
export const roadmapUrl = () => (USE_API ? '/api/roadmap' : `${import.meta.env.BASE_URL}data/roadmap.json`)
