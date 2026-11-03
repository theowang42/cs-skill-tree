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

  async load() {
    const raw = readStorage(LOCAL_KEY)
    if (raw) {
      try {
        this.progress = parseFile(raw)
      } catch {
        this.progress = emptyProgress()
      }
    }
    return this.progress
  }

  private persist() {
    writeStorage(LOCAL_KEY, JSON.stringify(toFile(this.progress)))
  }

  async apply(changes: Changes) {
    this.progress = applyChanges(this.progress, changes)
    this.persist()
  }

  async setGoal(subId: string | null) {
    this.progress = { ...this.progress, goalSubId: subId }
    this.persist()
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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `请求失败（${res.status}）`)
  }
  return (res.status === 204 ? null : await res.json()) as T
}

export class ApiStore implements ProgressStore {
  readonly kind = 'api'
  readonly where = '进度保存在服务器的数据库里，用同一个浏览器打开就能看到。'
  private id: string | null = readStorage(LEARNER_KEY)

  private async ensure(): Promise<Learner> {
    if (this.id) {
      try {
        return await request<Learner>('GET', `/learners/${this.id}`)
      } catch {
        // 服务器上没有了（比如数据库重建过），重新建一个
      }
    }
    const l = await request<Learner>('POST', '/learners')
    this.id = l.id
    writeStorage(LEARNER_KEY, l.id)
    return l
  }

  async load(): Promise<Progress> {
    const l = await this.ensure()
    return { goalSubId: l.goalSubId, skills: l.skills }
  }

  async apply(changes: Changes) {
    await request('PATCH', `/learners/${this.id}/skills`, { changes })
  }

  async setGoal(subId: string | null) {
    await request('PUT', `/learners/${this.id}/goal`, { subId })
  }

  async replace(progress: Progress) {
    const r = await request<{ dropped: string[] }>('POST', `/learners/${this.id}/import`, toFile(progress))
    return r.dropped
  }

  async reset() {
    if (this.id) await request('DELETE', `/learners/${this.id}`).catch(() => undefined)
    this.id = null
    writeStorage(LEARNER_KEY, null)
    await this.ensure()
  }
}

export const USE_API = import.meta.env?.VITE_API === '1'
export const createStore = (): ProgressStore => (USE_API ? new ApiStore() : new LocalStore())
export const roadmapUrl = () => (USE_API ? '/api/roadmap' : `${import.meta.env.BASE_URL}data/roadmap.json`)
