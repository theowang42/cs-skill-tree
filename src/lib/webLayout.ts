// 技能树的布局：一棵从中心往四周长的树。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个），方向挂在它最主要的必学技能后面。
//     这样画出来的是一条条链，只在关键节点分叉；其余前置平时不画，选中时才显示。
//   - 径向树：每棵子树分到的角度和它的枝头数成正比，深度越大离中心越远。
//     兄弟按领域排，让 AI Infra、底层系统、AI 产品各自聚在一边；整棵树再转一下，让主线 AI Infra 朝上。
//   - 每一圈的半径够大，保证同一圈相邻两个节点之间放得下名字；再加一点确定性的抖动，不像排出来的。
//   - 枝条是径向的三次贝塞尔：从父节点沿径向出去，再弯到子节点，像树枝，互相不交叉。
//
// 纯函数，坐标单位是像素，原点在中心。
import type { Tree } from './tree.ts'

export const NODE_R = 27
/** 相邻两圈至少隔多远 */
const STEP = 90
/** 同一圈相邻两个节点至少隔多远（要放得下名字） */
const SPACING = 96
/** 第一圈离中心多远 */
const R1 = 110
/** 方向离它挂的技能多远 */
const TIP_GAP = 66

/** 兄弟怎么排：绕圆一圈的领域顺序。AI Infra 和底层系统挨着，产品在另一边 */
const AREA_ORDER: Record<string, number> = {
  infra: 0, systems: 1, robotics: 1.6, security: 2, quant: 3, product: 4, chain: 5, base: 6,
}

export interface WebNode {
  /** 技能 id，或方向的 'sub:<id>' */
  id: string
  x: number
  y: number
  /** 树上第几圈，根是 1 */
  depth: number
  /** 朝外的方向（弧度），画方向名时用 */
  angle: number
  kind: 'skill' | 'sub'
}

export interface WebEdge {
  /** 'root' 表示中心 */
  from: string
  to: string
  d: string
}

export interface WebLayout {
  nodes: Map<string, WebNode>
  /** 树上画出来的枝：每个节点一根 */
  edges: WebEdge[]
  /** 其余前置：只在选中时画 */
  extra: WebEdge[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export const subNodeId = (subId: string) => `sub:${subId}`

/** 稳定的伪随机：同一个 id 永远得到同一个 0~1 的数 */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const polar = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r })
const f = (n: number) => n.toFixed(1)

/** 径向的三次贝塞尔，两端各让出节点的半径 */
function branch(a1: number, r1: number, a2: number, r2: number, trimStart: number, trimEnd: number): string {
  const rm = (r1 + r2) / 2
  const p1 = polar(a1, r1)
  const p2 = polar(a2, r2)
  const c1 = polar(a1, rm)
  const c2 = polar(a2, rm)
  const toward = (p: { x: number; y: number }, q: { x: number; y: number }, t: number) => {
    const dx = q.x - p.x
    const dy = q.y - p.y
    const d = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / d) * t, y: p.y + (dy / d) * t }
  }
  const s = trimStart > 0 ? toward(p1, c1, trimStart) : p1
  const e = toward(p2, c2, trimEnd)
  return `M${f(s.x)},${f(s.y)} C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(e.x)},${f(e.y)}`
}

export function layoutWeb(tree: Tree): WebLayout {
  const skills = tree.roadmap.skills
  // ── 树：每个节点的孩子 ──
  const children = new Map<string, string[]>([['root', []]])
  const area = new Map<string, string>()
  for (const s of skills) {
    children.set(s.id, [])
    area.set(s.id, s.areaId ?? 'base')
  }
  for (const s of skills) children.get(s.parent ?? 'root')!.push(s.id)
  for (const sub of tree.roadmap.subs) {
    const id = subNodeId(sub.id)
    children.set(id, [])
    area.set(id, area.get(sub.anchor) ?? 'base')
    children.get(sub.anchor)!.push(id)
  }

  // 子树的枝头数和领域重心
  const leaves = new Map<string, number>()
  const rankSum = new Map<string, number>()
  const count = new Map<string, number>()
  const visit = (id: string): void => {
    const kids = children.get(id)!
    let l = 0
    let rs = id === 'root' ? 0 : AREA_ORDER[area.get(id)!] ?? 6
    let c = id === 'root' ? 0 : 1
    for (const k of kids) {
      visit(k)
      l += leaves.get(k)!
      rs += rankSum.get(k)!
      c += count.get(k)!
    }
    leaves.set(id, Math.max(1, l))
    rankSum.set(id, rs)
    count.set(id, c)
  }
  visit('root')
  const rank = (id: string) => rankSum.get(id)! / count.get(id)!
  for (const [id, kids] of children) {
    kids.sort((a, b) => rank(a) - rank(b) || leaves.get(b)! - leaves.get(a)! || a.localeCompare(b))
    children.set(id, kids)
  }

  // ── 角度：枝头等距排一圈，父节点在孩子们的中间（只有一个孩子时和它对齐，链是直的） ──
  const angle = new Map<string, number>()
  const depth = new Map<string, number>()
  const total = leaves.get('root')!
  const rootKids = children.get('root')!
  // 三棵主干之间多留一点空
  const slot = (Math.PI * 2) / (total + rootKids.length)
  let cursor = 0
  const place = (id: string, d: number): number => {
    const kids = children.get(id)!
    let a: number
    if (kids.length === 0) {
      a = cursor
      cursor += slot
    } else {
      const as = kids.map((k) => place(k, d + 1))
      a = (as[0] + as[as.length - 1]) / 2
    }
    if (id !== 'root') {
      angle.set(id, a)
      depth.set(id, d)
    }
    return a
  }
  for (const k of rootKids) {
    place(k, 1)
    cursor += slot
  }

  // ── 半径：每一圈够放下名字 ──
  const maxDepth = Math.max(...[...depth].filter(([id]) => !id.startsWith('sub:')).map(([, d]) => d))
  const ring: number[] = [0]
  for (let d = 1; d <= maxDepth; d++) {
    const on = [...depth].filter(([id, dd]) => dd === d && !id.startsWith('sub:')).map(([id]) => angle.get(id)!).sort((a, b) => a - b)
    let gap = Math.PI * 2
    for (let i = 0; i < on.length; i++) {
      const next = i + 1 < on.length ? on[i + 1] : on[0] + Math.PI * 2
      if (on.length > 1) gap = Math.min(gap, next - on[i])
    }
    const need = on.length > 1 ? SPACING / gap : 0
    ring[d] = Math.max(d === 1 ? R1 : ring[d - 1] + STEP, need)
  }
  // 只有一个孩子的父节点，孩子和它对齐，链才是直的；分叉的地方再散开。
  // 上面已经是对齐的（孩子分到父亲的全部角度，中点一样），这里加一点抖动，不像尺子画的
  for (const [id, a] of angle) {
    angle.set(id, a + (hash01(id, 1) - 0.5) * Math.min(slot * 0.35, 0.05))
  }
  // 整棵树转一下：AI Infra 的重心朝正上方
  const infra = [...angle].filter(([id]) => area.get(id) === 'infra')
  const mean = Math.atan2(infra.reduce((s, [, a]) => s + Math.sin(a), 0), infra.reduce((s, [, a]) => s + Math.cos(a), 0))
  const turn = -Math.PI / 2 - mean
  for (const [id, a] of angle) angle.set(id, a + turn)

  const radius = new Map<string, number>()
  for (const [id, d] of depth) if (!id.startsWith('sub:')) radius.set(id, ring[d] + (hash01(id, 2) - 0.5) * STEP * 0.22)
  for (const sub of tree.roadmap.subs) radius.set(subNodeId(sub.id), radius.get(sub.anchor)! + TIP_GAP)

  const nodes = new Map<string, WebNode>()
  for (const [id, d] of depth) {
    const p = polar(angle.get(id)!, radius.get(id)!)
    nodes.set(id, { id, x: p.x, y: p.y, depth: d, angle: angle.get(id)!, kind: id.startsWith('sub:') ? 'sub' : 'skill' })
  }

  // ── 枝条 ──
  const edges: WebEdge[] = []
  for (const [id] of depth) {
    const parent = [...children].find(([, kids]) => kids.includes(id))![0]
    const isSub = id.startsWith('sub:')
    if (parent === 'root') {
      edges.push({ from: 'root', to: id, d: branch(angle.get(id)!, 0, angle.get(id)!, radius.get(id)!, 6, NODE_R + 3) })
    } else {
      edges.push({ from: parent, to: id, d: branch(angle.get(parent)!, radius.get(parent)!, angle.get(id)!, radius.get(id)!, NODE_R + 3, isSub ? 9 : NODE_R + 3) })
    }
  }
  const extra: WebEdge[] = []
  for (const s of skills) {
    for (const p of s.prerequisites) {
      if (p === s.parent) continue
      extra.push({ from: p, to: s.id, d: branch(angle.get(p)!, radius.get(p)!, angle.get(s.id)!, radius.get(s.id)!, NODE_R + 3, NODE_R + 3) })
    }
  }

  // ── 边界：留出名字的位置 ──
  const xs = [...nodes.values()].map((n) => n.x)
  const ys = [...nodes.values()].map((n) => n.y)
  const pad = 80
  const bounds = { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad }
  return { nodes, edges, extra, bounds }
}
