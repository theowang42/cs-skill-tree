// 技能树布局：一张从上往下长的图。
//
//   行 = 等级（1 入门 … 5 前沿），同一行的技能在同一个高度，全图一个尺度。
//   列 = 分支（知识领域）。每个分支在每一级上有一簇技能，簇里按需要折成几行。
//   工具没有领域，跟着它最深的前置走（React 跟着“组件与状态管理”进界面开发分支）。
//
// 纯函数，坐标单位是像素，原点在左上。只依赖导出的 Roadmap，同一份数据结果总是一样。
import type { Tree } from './tree.ts'

export const NODE = 52
export const GAP_X = 30
export const GAP_Y = 46
/** 一簇最多几列 */
const MAX_COLS = 4
const BRANCH_GAP = 72
const BAND_GAP = 60
export const LEVEL_NAMES = ['', '入门', '基础', '进阶', '专精', '前沿']

/** 分支顺序：相关的领域挨着，跨分支的线就短 */
const BRANCH_ORDER = [
  'math', 'theory', 'dsa', 'programming', 'compiler', 'swe', 'tooling', 'ui', 'llm-apps', 'ml',
  'graphics', 'hpc', 'architecture', 'embedded', 'organization', 'os', 'security', 'network', 'database', 'distributed',
]

export interface NodePos {
  x: number
  y: number
  level: number
  branch: string
}

export interface Branch {
  id: string
  name: string
  x: number
  width: number
  /** 这个分支里的技能，按等级再按位置 */
  skillIds: string[]
}

export interface Band {
  level: number
  y: number
  height: number
}

export interface TreeLayout {
  nodes: Map<string, NodePos>
  branches: Branch[]
  bands: Band[]
  width: number
  height: number
}

export function layoutTree(tree: Tree): TreeLayout {
  const skills = tree.roadmap.skills

  // 1. 每个技能属于哪个分支
  const branchOf = new Map<string, string>()
  const branchFor = (id: string): string => {
    const known = branchOf.get(id)
    if (known) return known
    const s = tree.skill(id)
    let b: string
    if (s.areaId) b = s.areaId
    else {
      const pre = [...s.prerequisites].sort((a, c) => tree.skill(c).depth - tree.skill(a).depth || (tree.skill(a).kind === 'concept' ? -1 : 1))
      b = pre.length ? branchFor(pre[0]) : 'tooling'
    }
    branchOf.set(id, b)
    return b
  }
  skills.forEach((s) => branchFor(s.id))

  const order = [...BRANCH_ORDER, ...tree.roadmap.areas.map((a) => a.id).filter((id) => !BRANCH_ORDER.includes(id))]

  // 2. 每个分支每一级的簇：几列几行
  const cols = (n: number) => Math.max(1, Math.min(MAX_COLS, Math.ceil(Math.sqrt(n))))
  const clusters = new Map<string, { ids: string[]; cols: number; rows: number }>()
  for (const b of order) {
    for (let lv = 1; lv <= 5; lv++) {
      const ids = skills.filter((s) => branchOf.get(s.id) === b && s.level === lv).map((s) => s.id)
      if (!ids.length) continue
      const c = cols(ids.length)
      clusters.set(`${b}/${lv}`, { ids, cols: c, rows: Math.ceil(ids.length / c) })
    }
  }

  // 3. 每一级的行高 = 这一级最高的簇
  const bands: Band[] = []
  let y = 0
  for (let lv = 1; lv <= 5; lv++) {
    let rows = 1
    for (const b of order) rows = Math.max(rows, clusters.get(`${b}/${lv}`)?.rows ?? 1)
    const height = rows * NODE + (rows - 1) * GAP_Y
    bands.push({ level: lv, y, height })
    y += height + BAND_GAP
  }
  const height = y - BAND_GAP

  // 4. 每个分支的宽度 = 它最宽的簇
  const branches: Branch[] = []
  const nodes = new Map<string, NodePos>()
  let x = 0
  for (const b of order) {
    let widest = 1
    for (let lv = 1; lv <= 5; lv++) widest = Math.max(widest, clusters.get(`${b}/${lv}`)?.cols ?? 0)
    const width = widest * NODE + (widest - 1) * GAP_X
    const area = tree.areas.get(b)!
    const ids: string[] = []
    for (let lv = 1; lv <= 5; lv++) {
      const cl = clusters.get(`${b}/${lv}`)
      if (!cl) continue
      // 簇内顺序：前置在同一分支上一级的位置的平均 x，近的放近
      const keyed = cl.ids.map((id) => {
        const pre = tree.skill(id).prerequisites.map((p) => nodes.get(p)).filter((p): p is NodePos => !!p && p.branch === b)
        const pull = pre.length ? pre.reduce((n, p) => n + p.x, 0) / pre.length : x + width / 2
        return { id, pull }
      }).sort((a, c) => a.pull - c.pull)
      const band = bands[lv - 1]
      const clusterW = cl.cols * NODE + (cl.cols - 1) * GAP_X
      const x0 = x + (width - clusterW) / 2
      // 簇在带里垂直居中
      const clusterH = cl.rows * NODE + (cl.rows - 1) * GAP_Y
      const y0 = band.y + (band.height - clusterH) / 2
      keyed.forEach((k, i) => {
        const r = Math.floor(i / cl.cols)
        const c = i % cl.cols
        // 最后一行不满时居中
        const inRow = r === cl.rows - 1 ? keyed.length - r * cl.cols : cl.cols
        const rowW = inRow * NODE + (inRow - 1) * GAP_X
        const rx = x0 + (clusterW - rowW) / 2
        nodes.set(k.id, { x: rx + c * (NODE + GAP_X), y: y0 + r * (NODE + GAP_Y), level: lv, branch: b })
        ids.push(k.id)
      })
    }
    branches.push({ id: b, name: area.name, x, width, skillIds: ids })
    x += width + BRANCH_GAP
  }
  return { nodes, branches, bands, width: x - BRANCH_GAP, height }
}
