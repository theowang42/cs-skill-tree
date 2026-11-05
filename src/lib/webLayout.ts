// 技能树的布局：一个圆。圆心是“起点”，三个基础技能（编程入门、Linux、微积分）在第一圈 120° 一个，
// 技能一圈一圈往外长，越往外越深；17 个职业徽章在最外圈平均分布。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个）。画出来是一条条往外的链，只在关键节点分叉。
//     其余前置不画线，选中时只让那些节点保持清楚，面板里列出来。
//   - 先紧凑地排：子树按每一圈的左右轮廓紧挨着（宽度换算成弧度 = 像素宽 / 半径），父节点在孩子正中间，
//     一个孩子时同一个角度，链是直的。
//   - 再往均匀拉：按职业分段拉伸，徽章完全等距，技能只拉过去 SPREAD 那么多；
//     然后松弛：同一圈挨得太近的，连同子树（整条直链）往两边转开。
//   - 每一圈的半径：同一圈相邻两个排得下、和里面一圈斜着也不叠，相邻两圈至少隔 RING。
//   - 枝条：从父节点往外到两圈中间，沿圆弧转过去，再往外停在孩子前面。线绕开名字。
//     职业的线沿技能那一列出到最外一圈技能外面，在环道上沿圆弧转到徽章；重叠的弧放在不同的环道上。
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

/** 一圈一圈往外：相邻两圈至少隔 RING；一圈排不下时这一圈再往外推 */
export const RING = 136
/** 第一圈至少多大；圆心“起点”的半径 */
const FIRST_RING = 200
export const START_R = 26
/** 技能往均匀拉过去多少：0 是最紧凑，1 是和职业一样完全均匀 */
const SPREAD = 0.3
/** 职业连线的环道之间隔多远 */
const CHANNEL = 14

/** 极坐标 → 屏幕坐标。角度 0 在正上方，顺时针 */
const pt = (r: number, a: number) => ({ x: r * Math.sin(a), y: -r * Math.cos(a) })

/** 圆形的枝：从父节点往外到两圈中间，沿着圆弧转过去，再往外到孩子 */
function radialElbow(a1: number, r1: number, a2: number, r2: number, mid: number): string {
  // 两个角度之差折到 (-π, π]：永远走短的那一边
  let da = a2 - a1
  while (da > Math.PI) da -= Math.PI * 2
  while (da <= -Math.PI) da += Math.PI * 2
  const p1 = pt(r1, a1)
  const p4 = pt(r2, a2)
  if (Math.abs(da) < 1e-4) return `M${f(p1.x)},${f(p1.y)} L${f(p4.x)},${f(p4.y)}`
  const p2 = pt(mid, a1)
  const p3 = pt(mid, a2)
  return `M${f(p1.x)},${f(p1.y)} L${f(p2.x)},${f(p2.y)} A${f(mid)},${f(mid)} 0 0 ${da > 0 ? 1 : 0} ${f(p3.x)},${f(p3.y)} L${f(p4.x)},${f(p4.y)}`
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

  // ── 起点（编程入门、Linux、微积分）都在第一圈；圆心是一个“起点”，不是技能 ──
  const roots = [...children.get('root')!]
  const ring1 = roots

  const depth = new Map<string, number>()
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
  const lanes = (id: string): string[] => {
    const tip = tipOf.get(id)
    return tip ? [...children.get(id)!, tip] : children.get(id)!
  }

  const { angle: packed, radius: target } = solved

  // ── 职业在最外圈平均分布，技能也往均匀靠 ──
  // 上面紧凑排出来的角度，职业之间疏密不一。按段拉伸到第 k 个职业正好隔 2π/17 的样子：
  //   - 职业徽章完全按拉伸后的角度放，最外圈等距；
  //   - 技能只拉过去一部分（SPREAD），往均匀靠，又不至于把密的地方压扁；
  //   - 从技能连到徽章的线，先沿着它那一列往外，出了最外一圈技能再沿圆弧转到徽章。
  const TAU = Math.PI * 2
  const norm = (a: number) => ((a % TAU) + TAU) % TAU
  const tipIds = [...tipOf.values()].sort((a, b) => norm(packed.get(a)!) - norm(packed.get(b)!))
  const T = tipIds.length
  const step = TAU / T
  const t = tipIds.map((id) => norm(packed.get(id)!))
  const warp = (raw: number) => {
    let a = norm(raw)
    if (a < t[0]) a += TAU
    let k = T - 1
    while (k > 0 && a < t[k]) k--
    const lo = t[k]
    const hi = k + 1 < T ? t[k + 1] : t[0] + TAU
    return t[0] + k * step + ((a - lo) / (hi - lo)) * step
  }
  const toward = (raw: number, frac: number) => {
    let d = warp(raw) - norm(raw)
    while (d > Math.PI) d -= TAU
    while (d < -Math.PI) d += TAU
    return raw + frac * d
  }
  const angle = new Map<string, number>()
  for (const [id, a] of packed) angle.set(id, toward(a, SPREAD))
  // 父节点重新放回孩子正中间，链保持笔直
  const place = (id: string): number => {
    const ls = lanes(id)
    if (!ls.length) return angle.get(id)!
    const as = ls.map((k) => (k.startsWith('sub:') ? angle.get(k)! : place(k)))
    for (let i = 1; i < as.length; i++) while (as[i] < as[i - 1] - Math.PI) as[i] += TAU
    const a = (as[0] + as[as.length - 1]) / 2
    angle.set(id, a)
    return a
  }
  for (const r of roots) place(r)
  // 徽章：完全等距。线从技能那一列（lane）出发，到外面再转过去
  const lane = new Map<string, number>()
  for (const tip of tipIds) {
    lane.set(tip, angle.get(tip)!)
    let a = toward(packed.get(tip)!, 1)
    const l = angle.get(tip)!
    while (a - l > Math.PI) a -= TAU
    while (a - l < -Math.PI) a += TAU
    angle.set(tip, a)
  }
  // 大模型算法工程师朝正上方
  const up = angle.get(subNodeId('llm-algo')) ?? 0
  for (const [id, a] of angle) angle.set(id, a - up)
  for (const [id, a] of lane) lane.set(id, a - up)
  for (const [id, a] of angle) angle.set(id, norm(a))
  for (const [id, a] of lane) lane.set(id, norm(a))

  // ── 松弛：同一圈挨得太近的两个节点，连同各自的子树往两边转开一点 ──
  // 目标是每一圈都排在紧凑排法算出来的半径上，不让某一对把整圈撑大。链还是直的
  const subtree = new Map<string, string[]>()
  const collect = (id: string): string[] => {
    const out = [id, ...children.get(id)!.flatMap(collect)]
    subtree.set(id, out)
    return out
  }
  for (const r of roots) collect(r)
  const halfOf = (id: string, a: number) => {
    const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2)
    return Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * BOX_H + GAP / 2
  }
  const parentOf = new Map(skills.map((s) => [s.id, s.parent]))
  const turnTree = (id: string, by: number) => {
    // 一条直链要整条一起转，不然会折
    let p = parentOf.get(id)
    while (p && lanes(p).length === 1 && depth.get(p)! >= 2) {
      id = p
      p = parentOf.get(id)
    }
    for (const k of subtree.get(id)!) {
      angle.set(k, angle.get(k)! + by)
      const tip = tipOf.get(k)
      if (tip) lane.set(tip, lane.get(tip)! + by)
    }
  }
  const byRing = new Map<number, string[]>()
  for (const s of skills) {
    const d = depth.get(s.id)!
    if (!byRing.has(d)) byRing.set(d, [])
    byRing.get(d)!.push(s.id)
  }
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    for (let d = 2; d < top; d++) {
      const ring = byRing.get(d)!.slice().sort((a, b) => norm(angle.get(a)!) - norm(angle.get(b)!))
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i]
        const b = ring[i + 1]
        const gap = norm(angle.get(b)!) - norm(angle.get(a)!)
        const need = (halfOf(a, angle.get(a)!) + halfOf(b, angle.get(b)!)) / target(d)
        if (gap < need - 1e-4) {
          const push = Math.min(need - gap, 0.05) / 2
          turnTree(a, -push)
          turnTree(b, push)
          moved = true
        }
      }
    }
    if (!moved) break
  }
  // 三个起点在第一圈平均摆开（120° 一个），按原来的先后顺序
  const rootOrder = [...roots].sort((a, b) => angle.get(a)! - angle.get(b)!)
  const main = rootOrder.reduce((m, r) => (subtree.get(r)!.length > subtree.get(m)!.length ? r : m))
  const base = angle.get(main)! - rootOrder.indexOf(main) * (TAU / roots.length)
  rootOrder.forEach((r, i) => angle.set(r, base + (i * TAU) / roots.length))

  // ── 每一圈的半径：同一圈相邻两个节点之间排得下（名字横着写：左右两边占名字宽，上下两边占节点加名字的高） ──
  const halfAt = (id: string) => {
    const a = angle.get(id)!
    const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2)
    return Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * BOX_H + GAP / 2
  }
  const radii = [0]
  for (let d = 1; d < top; d++) {
    const ring = skills.filter((s) => depth.get(s.id) === d).map((s) => s.id).sort((a, b) => norm(angle.get(a)!) - norm(angle.get(b)!))
    let r = d === 1 ? FIRST_RING : radii[d - 1] + RING
    for (let i = 0; i < ring.length && ring.length > 1; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      let gap = norm(angle.get(b)!) - norm(angle.get(a)!)
      if (gap <= 0) gap += Math.PI * 2
      r = Math.max(r, (halfAt(a) + halfAt(b)) / gap)
    }
    // 斜着看，名字长的节点会和里面一圈的叠在一起：叠了就再往外推
    const boxAt = (id: string, rr: number) => {
      const p = pt(rr, angle.get(id)!)
      const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2) + 4
      return { l: p.x - w, r: p.x + w, t: p.y - NODE_R - 4, b: p.y + LABEL_BOTTOM + 4 }
    }
    const inner = d > 1 ? skills.filter((s) => depth.get(s.id) === d - 1).map((s) => boxAt(s.id, radii[d - 1])) : []
    const hits = (rr: number) => ring.some((id) => {
      const a = boxAt(id, rr)
      return inner.some((b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b)
    })
    while (hits(r)) r += 8
    radii.push(Math.ceil(r))
  }
  const radius = (d: number) => radii[d]
  // 职业的线：沿技能那一列往外，出了最外一圈技能，在一条“环道”上沿圆弧转到徽章。
  // 转的弧有重叠的放在不同的环道上，一条比一条往外 CHANNEL 像素
  /** 徽章的角度，换算到离它那一列最近的那一圈（跨过 0 度时接上） */
  const near = (a: number, l: number) => {
    while (a - l > Math.PI) a -= TAU
    while (a - l < -Math.PI) a += TAU
    return a
  }
  const arcs = tipIds.map((tip) => {
    const l = lane.get(tip)!
    const a = near(angle.get(tip)!, l)
    return { tip, lo: Math.min(l, a), hi: Math.max(l, a) }
  }).sort((x, y) => x.lo - y.lo)
  const levelOf = new Map<string, number>()
  const ends: number[] = []
  for (const arc of arcs) {
    let k = ends.findIndex((e) => e < arc.lo - 0.01)
    if (k < 0) k = ends.length
    ends[k] = arc.hi
    levelOf.set(arc.tip, k)
  }
  const channel = (tip: string) => radius(top - 1) + 70 + levelOf.get(tip)! * CHANNEL
  const tipR = Math.max(radius(top - 1) + RING + 40 + ends.length * CHANNEL, (TIP_HALF * 2) / step)

  const nodes = new Map<string, WebNode>()
  for (const [id, d] of depth) {
    const p = pt(radius(d), angle.get(id)!)
    nodes.set(id, { id, x: f(p.x), y: f(p.y), depth: d, kind: 'skill' })
  }
  for (const tip of tipOf.values()) {
    const p = pt(tipR, angle.get(tip)!)
    nodes.set(tip, { id: tip, x: f(p.x), y: f(p.y), depth: top, kind: 'sub' })
  }

  // ── 枝条：从父节点往外，到两圈中间沿圆弧转过去，再往外停在孩子前面；起点从圆心发出直的辐条 ──
  const edges: WebEdge[] = []
  for (const s of skills) {
    const d = depth.get(s.id)!
    const a2 = angle.get(s.id)!
    const end = radius(d) - clearOfLabel(a2, s.name)
    if (!s.parent) {
      const p1 = pt(START_R + 6, a2)
      const p2 = pt(end, a2)
      edges.push({ from: 'root', to: s.id, d: `M${f(p1.x)},${f(p1.y)} L${f(p2.x)},${f(p2.y)}` })
      continue
    }
    const a1 = angle.get(s.parent)!
    const start = radius(d - 1) + outClear(a1, nameOf.get(s.parent)!)
    edges.push({ from: s.parent, to: s.id, d: radialElbow(a1, start, a2, end, (radius(d - 1) + radius(d)) / 2) })
  }
  for (const [anchor, tip] of tipOf) {
    const d = depth.get(anchor)!
    const a1 = angle.get(anchor)!
    const l = lane.get(tip)!
    const a = near(angle.get(tip)!, l)
    const rc = channel(tip)
    const start = radius(d) + outClear(a1, nameOf.get(anchor)!)
    // 先到自己那一列，再沿那一列一直往外到环道
    const first = Math.abs(l - a1) < 1e-4
      ? `M${f(pt(start, a1).x)},${f(pt(start, a1).y)} L${f(pt(rc, l).x)},${f(pt(rc, l).y)}`
      : radialElbow(a1, start, l, rc, (radius(d) + radius(d + 1)) / 2)
    const end = pt(tipR - TIP_R - 10, a)
    const turn = Math.abs(a - l) < 1e-4 ? '' : ` A${f(rc)},${f(rc)} 0 0 ${a > l ? 1 : 0} ${f(pt(rc, a).x)},${f(pt(rc, a).y)}`
    edges.push({ from: anchor, to: tip, d: `${first}${turn} L${f(end.x)},${f(end.y)}` })
  }

  // ── 边界：最外圈的徽章，上面还有名字 ──
  const R = tipR + TIP_R + 90
  const bounds = { minX: -R, maxX: R, minY: -R, maxY: R }
  const rings = radii.slice(1).map(f)
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
