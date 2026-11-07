// 进度：点亮了哪些技能，以及还没点亮的技能里学完了学习流程的哪几步。
// 存在这台设备的浏览器里，可以导出成文件、再导入；文件和浏览器里存的是同一个格式：
//   skills: { docker: { status: 'done' }, sql: { steps: [1, 2] } }
// 点亮了的技能不记步骤：点亮就是每一步都完成了。旧版本每条还记了时间和目标职业，读的时候忽略。

const KEY = 'cs-skill-tree:progress:v1'

export interface Progress {
  lit: ReadonlySet<string>
  /** 没点亮的技能完成了第几步（从 1 开始） */
  steps: ReadonlyMap<string, readonly number[]>
}

export const EMPTY: Progress = { lit: new Set(), steps: new Map() }

export function toFile({ lit, steps }: Progress): string {
  const skills = Object.fromEntries([
    ...[...lit].map((id) => [id, { status: 'done' }]),
    ...[...steps].map(([id, s]) => [id, { steps: s }]),
  ])
  return JSON.stringify({ format: 'cs-skill-tree-progress', version: 1, skills }, null, 2)
}

/** 解析导入的文件；格式不对抛出带中文说明的错误 */
export function parseFile(text: string): Progress {
  let f: { format?: unknown; version?: unknown; skills?: Record<string, { status?: unknown; steps?: unknown }> }
  try {
    f = JSON.parse(text)
  } catch {
    throw new Error('文件不是 JSON')
  }
  if (f?.format !== 'cs-skill-tree-progress') throw new Error('这不是 cs-skill-tree 导出的进度文件')
  if (f.version !== 1) throw new Error(`不认识的进度文件版本：${String(f.version)}`)
  if (!f.skills || typeof f.skills !== 'object') throw new Error('文件里没有技能数据')
  const lit = new Set<string>()
  const steps = new Map<string, number[]>()
  for (const [id, v] of Object.entries(f.skills)) {
    // 旧版本还有“在学”，现在只认点亮
    if (v?.status === 'done') lit.add(id)
    else if (Array.isArray(v?.steps)) {
      const s = v.steps.filter((n): n is number => Number.isInteger(n) && n > 0)
      if (s.length) steps.set(id, s)
    }
  }
  return { lit, steps }
}

// localStorage 在隐私模式等情况下可能不可用：读不到当作没有进度，存不了就只在这次访问里生效
export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? parseFile(raw) : EMPTY
  } catch {
    return EMPTY
  }
}

export function save(p: Progress) {
  try {
    localStorage.setItem(KEY, toFile(p))
  } catch {
    // 见上
  }
}

/** 别的标签页改了进度时通知，返回取消订阅的函数 */
export function onOtherTab(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
