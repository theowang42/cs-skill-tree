// 进度：点亮了哪些技能。存在这台设备的浏览器里，可以导出成文件、再导入。
// 文件和浏览器里存的是同一个格式。旧版本每条还记了时间和目标职业，读的时候忽略。

const KEY = 'cs-skill-tree:progress:v1'

export function toFile(lit: ReadonlySet<string>): string {
  const skills = Object.fromEntries([...lit].map((id) => [id, { status: 'done' }]))
  return JSON.stringify({ format: 'cs-skill-tree-progress', version: 1, skills }, null, 2)
}

/** 解析导入的文件；格式不对抛出带中文说明的错误 */
export function parseFile(text: string): Set<string> {
  let f: { format?: unknown; version?: unknown; skills?: Record<string, { status?: unknown }> }
  try {
    f = JSON.parse(text)
  } catch {
    throw new Error('文件不是 JSON')
  }
  if (f?.format !== 'cs-skill-tree-progress') throw new Error('这不是 cs-skill-tree 导出的进度文件')
  if (f.version !== 1) throw new Error(`不认识的进度文件版本：${String(f.version)}`)
  if (!f.skills || typeof f.skills !== 'object') throw new Error('文件里没有技能数据')
  // 旧版本还有“在学”，现在只认点亮
  return new Set(Object.keys(f.skills).filter((id) => f.skills![id]?.status === 'done'))
}

// localStorage 在隐私模式等情况下可能不可用：读不到当作没有进度，存不了就只在这次访问里生效
export function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? parseFile(raw) : new Set()
  } catch {
    return new Set()
  }
}

export function save(lit: ReadonlySet<string>) {
  try {
    localStorage.setItem(KEY, toFile(lit))
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
