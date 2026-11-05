// 技能树的布局：像游戏的技能树一样从下往上长，一列一列。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个）。画出来是一条条往上的链，只在关键节点分叉。
//     其余前置不画线（会横穿整张图），选中时只让那些节点保持清楚，面板里列出来。
//   - 最下面一排是起点（没有前置的技能），都在同一排，往上一排深一层。最大的那棵子树放中间，几棵子树按轮廓紧挨着，中间不留大空白。
//   - 列：子树按轮廓紧挨着排（每一层左右边界不重叠就行），父节点在第一个和最后一个孩子的正中间；
//     只有一个孩子时和它对齐，链是直的。兄弟按领域排，AI 产品在左，AI Infra 在中间，底层系统和安全在右。
//   - 职业是最上面一排的终极节点（大徽章），从它挂的技能一根实线直直连上去。
//   - 枝条是直角折线：从父节点顶上出发，往上到两排中间，横过去，再往上停在孩子名字的下面。线不穿过字。
//
// 纯函数，坐标单位是像素。最下面一排 y = 0，往上 y 变小。
import type { Tree } from './tree.ts'

export const NODE_R = 31
/** 两排之间多远 */
export const ROW = 132
/** 名字在节点下面多远（基线），和名字的底 */
export const LABEL_Y = NODE_R + 21
const LABEL_BOTTOM = NODE_R + 28
/** 同一排相邻两个节点的名字之间至少空多少 */
const GAP = 26
/** 职业（终极节点）徽章的外半径，和它在一排里占多宽的一半（名字比徽章宽） */
export const TIP_R = 46
const TIP_HALF = 78

/** 左右的顺序：AI 产品在左，AI Infra 在中间，底层系统和安全在右 */
const AREA_ORDER: Record<string, number> = {
  dev: 0, product: 1, quant: 2, llm: 2.6, infra: 3, base: 5, systems: 6, security: 7,
}

export interface WebNode {
  /** 技能 id，或方向的 'sub:<id>' */
  id: string
  x: number
  y: number
  /** 第几排，最下面是 1；方向在最上面一排 */
  depth: number
  kind: 'skill' | 'sub'
}

export interface WebEdge {
  from: string
  to: string
  d: string
}

export interface WebLayout {
  nodes: Map<string, WebNode>
  /** 树上画出来的枝：每个节点一根（起点没有） */
  edges: WebEdge[]
  /** 主线的位置，打开时从这里看起 */
  home: { x: number; y: number }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export const subNodeId = (subId: string) => `sub:${subId}`

/** 名字的显示宽度：中文 14px，英文数字约 8px */
export function labelWidth(name: string): number {
  return [...name].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 14 : 8), 0)
}

const f = (n: number) => Math.round(n * 10) / 10

/** 从父节点顶上往上，到两排中间横过去，再往上到孩子名字的下面。拐角是圆的 */
function elbow(x1: number, y1: number, x2: number, y2: number, midY: number): string {
  if (Math.abs(x2 - x1) < 0.5) return `M${f(x1)},${f(y1)} V${f(y2)}`
  const r = Math.min(10, Math.abs(x2 - x1) / 2, Math.abs(y1 - midY), Math.abs(midY - y2))
  const s = Math.sign(x2 - x1)
  return `M${f(x1)},${f(y1)} V${f(midY + r)} Q${f(x1)},${f(midY)} ${f(x1 + s * r)},${f(midY)} H${f(x2 - s * r)} Q${f(x2)},${f(midY)} ${f(x2)},${f(midY - r)} V${f(y2)}`
}

export function layoutWeb(tree: Tree): WebLayout {
  const skills = tree.roadmap.skills
  const children = new Map<string, string[]>([['root', []]])
  const area = new Map<string, string>()
  const half = new Map<string, number>()
  for (const s of skills) {
    children.set(s.id, [])
    area.set(s.id, s.areaId ?? 'base')
    half.set(s.id, Math.max(NODE_R, labelWidth(s.name) / 2) + GAP / 2)
  }
  for (const s of skills) children.get(s.parent ?? 'root')!.push(s.id)

  // ── 每排：起点是 1 ──
  const depth = new Map<string, number>()
  const setDepth = (id: string, d: number) => {
    depth.set(id, d)
    for (const k of children.get(id)!) setDepth(k, d + 1)
  }
  for (const r of children.get('root')!) setDepth(r, 1)
  const top = Math.max(...depth.values()) + 1

  // 方向：挂在技能上，占住从它往上直到最上面一排的那一列
  const tipOf = new Map<string, string>()
  for (const sub of tree.roadmap.subs) tipOf.set(sub.anchor, subNodeId(sub.id))

  // ── 兄弟的顺序：按子树的领域重心 ──
  const rankSum = new Map<string, number>()
  const count = new Map<string, number>()
  const tally = (id: string) => {
    let rs = AREA_ORDER[area.get(id)!] ?? 5
    let c = 1
    for (const k of children.get(id)!) {
      tally(k)
      rs += rankSum.get(k)!
      c += count.get(k)!
    }
    rankSum.set(id, rs)
    count.set(id, c)
  }
  for (const r of children.get('root')!) tally(r)
  const rank = (id: string) => rankSum.get(id)! / count.get(id)!
  for (const kids of children.values()) kids.sort((a, b) => rank(a) - rank(b) || count.get(b)! - count.get(a)! || a.localeCompare(b))

  // ── 列：按轮廓把子树紧挨着排 ──
  // 每棵子树算出相对它的根的 x，以及每一排的左右边界
  type Contour = Map<number, [number, number]>
  const rel = new Map<string, number>()
  const merge = (into: Contour, c: Contour, dx: number) => {
    for (const [d, [l, r]] of c) {
      const cur = into.get(d)
      into.set(d, cur ? [Math.min(cur[0], l + dx), Math.max(cur[1], r + dx)] : [l + dx, r + dx])
    }
  }
  const build = (id: string): Contour => {
    const d = depth.get(id)!
    const kids = children.get(id)!
    const own: Contour = new Map([[d, [-half.get(id)!, half.get(id)!]]])
    // 职业那一列：中间只有一根线，最上面一排要放下徽章和名字
    const tipColumn = (from: number): Contour => {
      const c: Contour = new Map()
      for (let k = from; k < top; k++) c.set(k, [-6, 6])
      c.set(top, [-TIP_HALF, TIP_HALF])
      return c
    }
    const tip = tipOf.get(id)
    // 没有孩子：职业就在它正上方那一列
    if (tip && !kids.length) for (const [k, lr] of tipColumn(d + 1)) own.set(k, lr)
    if (!kids.length) return own
    // 有孩子：职业当成最右边的一个“孩子”，单独占一列，不会和孩子那一列叠在一起
    const lanes = tip ? [...kids, tip] : kids
    const placed: { id: string; x: number }[] = []
    const acc: Contour = new Map()
    for (const k of lanes) {
      const c = k === tip ? tipColumn(d + 1) : build(k)
      let x = 0
      if (placed.length) {
        x = -Infinity
        for (const [dd, [l]] of c) {
          const a = acc.get(dd)
          if (a) x = Math.max(x, a[1] - l)
        }
        if (x === -Infinity) x = placed[placed.length - 1].x + 2 * NODE_R + GAP
      }
      placed.push({ id: k, x })
      merge(acc, c, x)
    }
    const mid = (placed[0].x + placed[placed.length - 1].x) / 2
    for (const p of placed) rel.set(p.id, p.x - mid)
    const out: Contour = new Map()
    merge(out, acc, -mid)
    // 自己这一排和方向那一列也要算进去
    for (const [dd, lr] of own) {
      const cur = out.get(dd)
      out.set(dd, cur ? [Math.min(cur[0], lr[0]), Math.max(cur[1], lr[1])] : lr)
    }
    return out
  }
  // 几个起点也按轮廓排开
  // 起点：最大的子树放中间，其余按原来的顺序左右交替放
  const bySize = [...children.get('root')!].sort((a, b) => count.get(b)! - count.get(a)!)
  const roots: string[] = []
  bySize.forEach((r, i) => (i % 2 === 1 ? roots.unshift(r) : roots.push(r)))
  const rootX = new Map<string, number>()
  const all: Contour = new Map()
  for (const r of roots) {
    const c = build(r)
    let x = 0
    if (rootX.size) {
      x = -Infinity
      for (const [dd, [l]] of c) {
        const a = all.get(dd)
        if (a) x = Math.max(x, a[1] - l + GAP * 2)
      }
    }
    rootX.set(r, x)
    merge(all, c, x)
  }

  // ── 绝对坐标 ──
  const xs = new Map<string, number>()
  const absolute = (id: string, x: number) => {
    xs.set(id, x)
    for (const k of children.get(id)!) absolute(k, x + rel.get(k)!)
  }
  for (const r of roots) absolute(r, rootX.get(r)!)
  // 职业：挂在有孩子的技能上时单独占了一列（rel 里有它），否则就在技能正上方
  for (const [anchor, tip] of tipOf) xs.set(tip, xs.get(anchor)! + (rel.get(tip) ?? 0))
  const yOf = (d: number) => (1 - d) * ROW

  const nodes = new Map<string, WebNode>()
  for (const [id, d] of depth) nodes.set(id, { id, x: xs.get(id)!, y: yOf(d), depth: d, kind: 'skill' })
  for (const tip of tipOf.values()) nodes.set(tip, { id: tip, x: xs.get(tip)!, y: yOf(top) - 50, depth: top, kind: 'sub' })

  // ── 枝条 ──
  const edges: WebEdge[] = []
  const up = (id: string) => nodes.get(id)!.y - NODE_R - 3
  const below = (id: string) => nodes.get(id)!.y + LABEL_BOTTOM + 4
  for (const s of skills) {
    if (!s.parent) continue
    const p = nodes.get(s.parent)!
    const c = nodes.get(s.id)!
    edges.push({ from: s.parent, to: s.id, d: elbow(p.x, up(s.parent), c.x, below(s.id), p.y - ROW / 2 + 4) })
  }
  for (const [anchor, tip] of tipOf) {
    const a = nodes.get(anchor)!
    const t = nodes.get(tip)!
    edges.push({ from: anchor, to: tip, d: elbow(a.x, up(anchor), t.x, t.y + TIP_R + 8, a.y - ROW / 2 + 4) })
  }
  // ── 边界 ──
  const ns = [...nodes.values()]
  const bounds = {
    minX: Math.min(...ns.map((n) => n.x)) - 90,
    maxX: Math.max(...ns.map((n) => n.x)) + 90,
    // 最上面一排的职业：徽章上面还有名字
    minY: Math.min(...ns.map((n) => n.y)) - TIP_R - 90,
    maxY: LABEL_BOTTOM + 30,
  }
  const main = nodes.get('pytorch') ?? ns[0]
  return { nodes, edges, home: { x: main.x, y: 0 }, bounds }
}
