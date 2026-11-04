// 一个分支的技能树布局：五个等级是五行（全图一致），同一行的技能横着排开，线只在分支内部。
// 纯函数，坐标单位是像素，原点在左上。同一份数据结果总是一样。
import type { Tree } from './tree.ts'

export const LEVEL_NAMES = ['', '入门', '基础', '进阶', '专精', '前沿']
export const CELL = 64
export const COL = 132
export const ROW = 138
export const LEFT = 84

export interface BranchNode {
  id: string
  x: number
  y: number
  level: number
}

export interface BranchEdge {
  from: string
  to: string
  d: string
}

export interface BranchLayout {
  nodes: BranchNode[]
  edges: BranchEdge[]
  /** 这个分支依赖的、别的分支里的技能 */
  external: string[]
  width: number
  height: number
}

export function layoutBranch(tree: Tree, areaId: string): BranchLayout {
  const area = tree.areas.get(areaId)!
  const ids = area.skillIds
  const inBranch = new Set(ids)
  const byLevel = new Map<number, string[]>()
  for (const id of ids) {
    const lv = tree.skill(id).level
    byLevel.set(lv, [...(byLevel.get(lv) ?? []), id])
  }
  const widest = Math.max(1, ...[...byLevel.values()].map((l) => l.length))
  const width = LEFT + widest * COL
  const x = new Map<string, number>()
  const nodes: BranchNode[] = []
  for (let lv = 1; lv <= 5; lv++) {
    const row = byLevel.get(lv) ?? []
    // 按分支内前置的平均横坐标排，线就不交叉；没有前置的保持种子里的顺序
    const keyed = row.map((id, i) => {
      const pre = tree.skill(id).prerequisites.filter((p) => x.has(p))
      const pull = pre.length ? pre.reduce((n, p) => n + x.get(p)!, 0) / pre.length : null
      return { id, pull, i }
    })
    keyed.sort((a, b) => (a.pull ?? a.i * 1000) - (b.pull ?? b.i * 1000) || a.i - b.i)
    const start = LEFT + ((widest - keyed.length) * COL) / 2
    keyed.forEach((k, i) => {
      const cx = start + i * COL + (COL - CELL) / 2
      x.set(k.id, cx + CELL / 2)
      nodes.push({ id: k.id, x: cx, y: (lv - 1) * ROW, level: lv })
    })
  }
  const pos = new Map(nodes.map((n) => [n.id, n]))

  // 线：从前置的底边往下，到两行之间拐弯，再往下到后继的顶边。圆角拐弯，像电路图。
  const edges: BranchEdge[] = []
  for (const n of nodes) {
    for (const p of tree.skill(n.id).prerequisites) {
      if (!inBranch.has(p)) continue
      const a = pos.get(p)!
      const x1 = a.x + CELL / 2
      const y1 = a.y + CELL + 22
      const x2 = n.x + CELL / 2
      const y2 = n.y - 8
      // 拐弯放在目标行的上方一点，同一个目标的线在同一个高度汇合
      const ym = y2 - 26
      const r = Math.min(8, Math.abs(x2 - x1) / 2)
      let d: string
      if (Math.abs(x1 - x2) < 1) d = `M${x1},${y1} V${y2}`
      else {
        const dir = x2 > x1 ? 1 : -1
        d = `M${x1},${y1} V${ym - r} Q${x1},${ym} ${x1 + dir * r},${ym} H${x2 - dir * r} Q${x2},${ym} ${x2},${ym + r} V${y2}`
      }
      edges.push({ from: p, to: n.id, d })
    }
  }

  const external = [...new Set(ids.flatMap((id) => tree.skill(id).prerequisites.filter((p) => !inBranch.has(p))))]
  return { nodes, edges, external, width, height: 4 * ROW + CELL + 30 }
}
