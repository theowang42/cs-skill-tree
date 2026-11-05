// 技能树的布局：一个圆。编程入门在正中心，技能一圈一圈往外长，越往外越深；职业徽章在最外圈。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个）。画出来是一条条往外的链，只在关键节点分叉。
//     其余前置不画线，选中时只让那些节点保持清楚，面板里列出来。
//   - 第 d 圈是深度 d。另外几个起点（Linux、微积分）没有前置，放在第一圈，和编程入门的孩子一起。
//   - 角度：子树按轮廓紧挨着排（每一圈左右边界不重叠就行，宽度换算成弧度 = 像素宽 / 半径），
//     父节点在第一个和最后一个孩子的正中间；只有一个孩子时和它同一个角度，链是直的。
//     第一圈多大，二分找到刚好一圈排得下的那个；排完有剩的角度整体摊开。PyTorch 朝正上方。
//   - 职业是最外圈的终极节点（大徽章），从它挂的技能连出去。
//   - 枝条：从父节点往外到两圈中间，沿圆弧转过去，再往外停在孩子前面。线绕开名字。
//
// 纯函数，坐标单位是像素，圆心是 (0, 0)。
import type { Tree } from './tree.ts'

export const NODE_R = 31
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
  /** 第几圈，圆心是 0；职业在最外圈 */
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
  /** 每一圈的半径（不含圆心），画成很淡的同心圆，缩小时看得出一圈一圈 */
  rings: number[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export const subNodeId = (subId: string) => `sub:${subId}`

/** 名字的显示宽度：中文 14px，英文数字约 8px */
export function labelWidth(name: string): number {
  return [...name].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 14 : 8), 0)
}

const f = (n: number) => Math.round(n * 10) / 10

/** 一圈一圈往外：圆心到第一圈多远由排得下来定，之后每圈隔 RING */
export const RING = 136

/** 极坐标 → 屏幕坐标。角度 0 在正上方，顺时针 */
const pt = (r: number, a: number) => ({ x: r * Math.sin(a), y: -r * Math.cos(a) })

/** 圆形的枝：从父节点往外到两圈中间，沿着圆弧转过去，再往外到孩子 */
function radialElbow(a1: number, r1: number, a2: number, r2: number, mid: number): string {
  const p1 = pt(r1, a1)
  const p4 = pt(r2, a2)
  if (Math.abs(a2 - a1) < 1e-4) return `M${f(p1.x)},${f(p1.y)} L${f(p4.x)},${f(p4.y)}`
  const p2 = pt(mid, a1)
  const p3 = pt(mid, a2)
  const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0
  const sweep = a2 > a1 ? 1 : 0
  return `M${f(p1.x)},${f(p1.y)} L${f(p2.x)},${f(p2.y)} A${f(mid)},${f(mid)} 0 ${large} ${sweep} ${f(p3.x)},${f(p3.y)} L${f(p4.x)},${f(p4.y)}`
}

/** 从节点中心朝圆心走多远，线才不压到节点下面的名字 */
function clearOfLabel(a: number, name: string): number {
  const ux = -Math.sin(a)
  const uy = Math.cos(a) // 朝圆心的方向（屏幕 y 向下）
  let d = NODE_R + 4
  if (uy > 0.05) {
    // 名字在节点正下方：线要么从名字底下出去，要么从侧面出去
    const bottom = (LABEL_BOTTOM + 4) / uy
    const side = Math.abs(ux) > 1e-3 ? (labelWidth(name) / 2 + 4) / Math.abs(ux) : Infinity
    d = Math.max(d, Math.min(bottom, side))
  }
  return d
}

export function layoutWeb(tree: Tree): WebLayout {
  const skills = tree.roadmap.skills
  const nameOf = new Map(skills.map((s) => [s.id, s.name]))
  const children = new Map<string, string[]>([['root', []]])
  const area = new Map<string, string>()
  const half = new Map<string, number>()
  for (const s of skills) {
    children.set(s.id, [])
    area.set(s.id, s.areaId ?? 'base')
    half.set(s.id, Math.max(NODE_R, labelWidth(s.name) / 2) + GAP / 2)
  }
  for (const s of skills) children.get(s.parent ?? 'root')!.push(s.id)

  // ── 子树大小 ──
  const count = new Map<string, number>()
  const size = (id: string): number => {
    const c = 1 + children.get(id)!.reduce((n, k) => n + size(k), 0)
    count.set(id, c)
    return c
  }
  for (const r of children.get('root')!) size(r)

  // ── 圆心：最大的那棵（编程入门）。其它起点放在第一圈，和它的孩子一起 ──
  const roots = [...children.get('root')!].sort((a, b) => count.get(b)! - count.get(a)! || a.localeCompare(b))
  const center = roots[0]
  const ring1 = [...children.get(center)!, ...roots.slice(1)]

  const depth = new Map<string, number>([[center, 0]])
  const setDepth = (id: string, d: number) => {
    depth.set(id, d)
    for (const k of children.get(id)!) setDepth(k, d + 1)
  }
  for (const k of ring1) setDepth(k, 1)
  const top = Math.max(...depth.values()) + 1

  const tipOf = new Map<string, string>()
  for (const sub of tree.roadmap.subs) tipOf.set(sub.anchor, subNodeId(sub.id))

  // ── 兄弟的顺序：按子树的领域重心 ──
  const rankSum = new Map<string, number>()
  const tally = (id: string): number => {
    let rs = AREA_ORDER[area.get(id)!] ?? 5
    for (const k of children.get(id)!) rs += tally(k)
    rankSum.set(id, rs)
    return rs
  }
  for (const r of roots) tally(r)
  const rank = (id: string) => rankSum.get(id)! / count.get(id)!
  const byRank = (a: string, b: string) => rank(a) - rank(b) || count.get(b)! - count.get(a)! || a.localeCompare(b)
  for (const kids of children.values()) kids.sort(byRank)
  ring1.sort(byRank)

  // ── 角度：子树按轮廓紧挨着排，单位是弧度；每一圈的宽度 = 像素宽 / 半径 ──
  type Contour = Map<number, [number, number]>
  const merge = (into: Contour, c: Contour, dx: number) => {
    for (const [d, [l, r]] of c) {
      const cur = into.get(d)
      into.set(d, cur ? [Math.min(cur[0], l + dx), Math.max(cur[1], r + dx)] : [l + dx, r + dx])
    }
  }
  const pack = (r1: number) => {
    // 里圈节点少，外圈多：半径按 d^0.8 长，相邻两圈至少隔 RING
    const radius = (d: number) => { let r = 0; for (let k = 1; k <= d; k++) r = Math.max(k === 1 ? 0 : r + RING, r1 * k ** 0.8); return r }
    const tipR = radius(top) + 40
    const rel = new Map<string, number>()
    const tipColumn = (from: number): Contour => {
      const c: Contour = new Map()
      for (let k = from; k < top; k++) c.set(k, [-6 / radius(k), 6 / radius(k)])
      c.set(top, [-TIP_HALF / tipR, TIP_HALF / tipR])
      return c
    }
    // 把一排孩子按轮廓排开，返回每个相对中间的角度和合起来的轮廓
    const lay = (lanes: string[], build: (id: string) => Contour): Contour => {
      const placed: { id: string; x: number }[] = []
      const acc: Contour = new Map()
      for (const k of lanes) {
        const c = build(k)
        let x = 0
        if (placed.length) {
          x = -Infinity
          for (const [dd, [l]] of c) {
            const a = acc.get(dd)
            if (a) x = Math.max(x, a[1] - l)
          }
          if (x === -Infinity) x = placed[placed.length - 1].x
        }
        placed.push({ id: k, x })
        merge(acc, c, x)
      }
      const mid = (placed[0].x + placed[placed.length - 1].x) / 2
      for (const p of placed) rel.set(p.id, p.x - mid)
      const out: Contour = new Map()
      merge(out, acc, -mid)
      return out
    }
    const build = (id: string): Contour => {
      const d = depth.get(id)!
      const h = half.get(id)! / radius(d)
      const own: Contour = new Map([[d, [-h, h]]])
      const kids = children.get(id)!
      const tip = tipOf.get(id)
      if (tip && !kids.length) for (const [k, lr] of tipColumn(d + 1)) own.set(k, lr)
      if (!kids.length) return own
      const out = lay(tip ? [...kids, tip] : kids, (k) => (k === tip ? tipColumn(d + 1) : build(k)))
      for (const [dd, lr] of own) {
        const cur = out.get(dd)
        out.set(dd, cur ? [Math.min(cur[0], lr[0]), Math.max(cur[1], lr[1])] : lr)
      }
      return out
    }
    const all = lay(ring1, build)
    let span = 0
    for (const [l, r] of all.values()) span = Math.max(span, r - l)
    return { rel, span, radius, tipR }
  }

  // 一个节点沿圆周方向占多宽：名字是横着写的，在左右两边占名字的宽，在上下两边占节点加名字的高。
  // 先不知道角度，按名字宽排一次；再按排出来的角度重新算宽度，排几遍就稳了
  const BOX_H = (NODE_R + LABEL_BOTTOM) / 2 + 6
  const solve = () => {
    // 第一圈要多大才能一圈排得下：二分
    let lo = 10
    let hi = RING * 40
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2
      if (pack(m).span <= Math.PI * 2) hi = m
      else lo = m
    }
    const { rel, span, radius, tipR } = pack(Math.ceil(hi))
    // 排完有剩的角度：整体摊开，绕满一圈
    const stretch = (Math.PI * 2) / span
    const angle = new Map<string, number>()
    const absolute = (id: string, a: number) => {
      angle.set(id, a)
      for (const k of children.get(id)!) absolute(k, a + rel.get(k)! * stretch)
    }
    for (const k of ring1) absolute(k, rel.get(k)! * stretch)
    for (const [anchor, tip] of tipOf) angle.set(tip, angle.get(anchor)! + (rel.get(tip) ?? 0) * stretch)
    // 转一下：AI（PyTorch）朝正上方
    const turn = -(angle.get('pytorch') ?? 0)
    for (const [id, a] of angle) angle.set(id, a + turn)
    angle.set(center, 0)
    return { angle, radius, tipR }
  }
  let solved = solve()
  for (let pass = 0; pass < 4; pass++) {
    for (const s of skills) {
      const a = solved.angle.get(s.id)!
      const w = Math.max(NODE_R, labelWidth(s.name) / 2)
      half.set(s.id, Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * BOX_H + GAP / 2)
    }
    solved = solve()
  }
  const { angle, radius, tipR } = solved

  const nodes = new Map<string, WebNode>()
  for (const [id, d] of depth) {
    const p = pt(radius(d), angle.get(id)!)
    nodes.set(id, { id, x: f(p.x), y: f(p.y), depth: d, kind: 'skill' })
  }
  for (const tip of tipOf.values()) {
    const p = pt(tipR, angle.get(tip)!)
    nodes.set(tip, { id: tip, x: f(p.x), y: f(p.y), depth: top, kind: 'sub' })
  }

  // ── 枝条：从父节点往外，到两圈中间沿圆弧转过去，再往外停在孩子前面 ──
  const edges: WebEdge[] = []
  for (const s of skills) {
    if (!s.parent) continue
    const d = depth.get(s.id)!
    const a1 = angle.get(s.parent)!
    const a2 = angle.get(s.id)!
    // 从父节点朝外出发；名字在节点下面，朝下走的线要绕开名字
    const start = d === 1 ? NODE_R + 8 : radius(d - 1) + outClear(a1, nameOf.get(s.parent)!)
    const end = radius(d) - clearOfLabel(a2, s.name)
    // 圆心发出的枝是直的辐条
    const d1 = d === 1 ? `M${f(pt(start, a2).x)},${f(pt(start, a2).y)} L${f(pt(end, a2).x)},${f(pt(end, a2).y)}` : radialElbow(a1, start, a2, end, (radius(d - 1) + radius(d)) / 2)
    edges.push({ from: s.parent, to: s.id, d: d1 })
  }
  for (const [anchor, tip] of tipOf) {
    const d = depth.get(anchor)!
    const a1 = angle.get(anchor)!
    const a2 = angle.get(tip)!
    const start = radius(d) + outClear(a1, nameOf.get(anchor)!)
    edges.push({ from: anchor, to: tip, d: radialElbow(a1, start, a2, tipR - TIP_R - 10, (radius(d) + radius(d + 1)) / 2) })
  }

  // ── 边界：最外圈的徽章，上面还有名字 ──
  const R = tipR + TIP_R + 90
  const bounds = { minX: -R, maxX: R, minY: -R, maxY: R }
  const rings = Array.from({ length: top - 1 }, (_, i) => f(radius(i + 1)))
  return { nodes, edges, home: { x: 0, y: 0 }, rings, bounds }
}

/** 从节点中心朝外走多远，线才不压到名字 */
function outClear(a: number, name: string): number {
  const ux = Math.sin(a)
  const uy = -Math.cos(a)
  if (uy <= 0.05) return NODE_R + 4
  const bottom = (LABEL_BOTTOM + 4) / uy
  const side = Math.abs(ux) > 1e-3 ? (labelWidth(name) / 2 + 4) / Math.abs(ux) : Infinity
  return Math.max(NODE_R + 4, Math.min(bottom, side))
}
