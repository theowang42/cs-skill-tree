// CS 能力树的全部内容。改内容只需要改这个文件。

export interface Block {
  id: string
  name: string
  /** 直接前置能力块 */
  requires: string[]
}

export interface Category {
  id: string
  name: string
  /** 需要的能力块（只写最高层的，前置会自动带上） */
  requires: string[]
}

export const CATEGORIES: Category[] = [
  { id: 'hardware', name: '硬件', requires: ['architecture', 'os'] },
  { id: 'systems', name: '系统', requires: ['os', 'plc', 'architecture', 'distributed', 'swe'] },
  { id: 'infra', name: '基础设施与数据', requires: ['distributed', 'math'] },
  { id: 'ai', name: 'AI', requires: ['ml', 'hpc', 'swe', 'network'] },
  { id: 'apps', name: '应用', requires: ['swe', 'database', 'network', 'os', 'graphics', 'hpc'] },
  { id: 'security', name: '安全', requires: ['security'] },
  { id: 'other', name: '其他方向', requires: ['theory', 'plc', 'distributed', 'security', 'graphics'] },
]

// 从上往下显示
export const LAYERS: { name: string; blocks: Block[] }[] = [
  {
    name: '进阶层',
    blocks: [
      { id: 'theory', name: '计算理论', requires: ['math', 'dsa'] },
      { id: 'ml', name: '机器学习', requires: ['math', 'dsa'] },
      { id: 'graphics', name: '图形学', requires: ['math', 'organization'] },
      { id: 'architecture', name: '体系结构', requires: ['organization'] },
      { id: 'hpc', name: '高性能计算', requires: ['organization', 'os'] },
      { id: 'security', name: '安全', requires: ['organization', 'os', 'network'] },
      { id: 'distributed', name: '分布式系统', requires: ['os', 'network', 'database'] },
    ],
  },
  {
    name: '核心层',
    blocks: [
      { id: 'dsa', name: '数据结构与算法', requires: ['math', 'programming'] },
      { id: 'organization', name: '计算机组成', requires: ['programming'] },
      { id: 'os', name: '操作系统', requires: ['organization'] },
      { id: 'network', name: '计算机网络', requires: ['os'] },
      { id: 'database', name: '数据库', requires: ['dsa', 'os'] },
      { id: 'plc', name: '编程语言与编译', requires: ['dsa', 'organization'] },
      { id: 'swe', name: '软件工程', requires: ['programming', 'tooling'] },
    ],
  },
  {
    name: '基础层',
    blocks: [
      { id: 'math', name: '数学基础', requires: [] },
      { id: 'programming', name: '编程基础', requires: [] },
      { id: 'tooling', name: '工具链', requires: [] },
    ],
  },
]

const BLOCK_BY_ID = new Map(LAYERS.flatMap((l) => l.blocks).map((b) => [b.id, b]))

/** 一组能力块连同它们所有的前置块 */
export function closure(ids: string[]): Set<string> {
  const seen = new Set<string>()
  const stack = [...ids]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(BLOCK_BY_ID.get(id)?.requires ?? []))
  }
  return seen
}
