// 技能树的布局：一个圆，像竖着的技能树卷起来。圆心是“你”，三个基础技能（编程入门、Linux、微积分）
// 在第一圈，各自正对着自己那一片；技能一圈一圈往外长，每条链沿半径笔直往外；职业在它那一列的最末端，最外一圈。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个）。画出来是一条条往外的直链，只在关键节点分叉。
//     其余前置不画线，选中时只让那些节点保持清楚，面板里列出来。
//   - 先紧凑地排：子树按每一圈的左右轮廓紧挨着（宽度换算成弧度 = 像素宽 / 半径），父节点在孩子正中间，
//     一个孩子时同一个角度，链是直的。职业那一列从挂的技能一直占到最外圈。
//   - 再松弛：同一圈挨得太近的，连同子树（整条直链）往两边转开，不让某一对把整圈撑大。
//   - 每一圈的半径：同一圈相邻两个排得下、和里面一圈斜着也不叠，相邻两圈至少隔 RING。
//   - 枝条：从父节点沿半径往外，到两圈中间沿一小段圆弧转过去，再沿半径停在孩子前面。线绕开名字。
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

interface WebLayout {
  /** 技能 id，或职业的 'sub:<id>' → 位置 */
  nodes: Map<string, { x: number; y: number }>
  /** 树上画出来的枝：每个节点一根，没有前置的技能从圆心（'root'）连出来 */
  edges: { from: string; to: string; d: string }[]
  /** 每一圈的半径（不含圆心），画成很淡的同心圆，缩小时看得出一圈一圈 */
  rings: number[]
  /** 整张图（含最外圈徽章上面的名字）都在这个半径里 */
  radius: number
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
export const START_R = 44
/** 职业连线在一圈里占多宽的一半：别的节点离它至少这么远 */
const LANE_HALF = 12

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

/**
 * 从某一点沿方向 (ux, uy) 走，走多远才完全出了这个框（框的坐标相对那一点）。射线碰不到框就是 0。
 * 用来让线从名字外面开始、在名字外面停下。
 */
function exitBox(ux: number, uy: number, l: number, r: number, t: number, b: number): number {
  let lo = -Infinity
  let hi = Infinity
  for (const [u, a, c] of [[ux, l, r], [uy, t, b]] as const) {
    if (Math.abs(u) < 1e-9) {
      if (a > 0 || c < 0) return 0
      continue
    }
    const t1 = a / u
    const t2 = c / u
    lo = Math.max(lo, Math.min(t1, t2))
    hi = Math.min(hi, Math.max(t1, t2))
  }
  return hi > Math.max(lo, 0) ? hi : 0
}

/** 职业徽章上面名字和星级的框，相对徽章中心 */
const tipLabelBox = (name: string) => {
  const w = Math.max((labelWidth(name) * 15) / 14, 100) / 2 + 3
  return { l: -w, r: w, t: -TIP_R - 63, b: -TIP_R - 27 }
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
  const half = new Map<string, number>()
  for (const s of skills) {
    children.set(s.id, [])
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

  // ── 没有前置的技能（编程入门、Linux、微积分）都在第一圈；圆心是“你”，不是技能 ──
  const roots = children.get('root')!

  const depth = new Map<string, number>()
  const setDepth = (id: string, d: number) => {
    depth.set(id, d)
    for (const k of children.get(id)!) setDepth(k, d + 1)
  }
  for (const k of roots) setDepth(k, 1)
  const top = Math.max(...depth.values()) + 1

  const tipOf = new Map<string, string>()
  for (const sub of tree.roadmap.subs) tipOf.set(sub.anchor, subNodeId(sub.id))
  const subName = new Map(tree.roadmap.subs.map((sub) => [subNodeId(sub.id), sub.name]))

  // ── 兄弟的顺序：按子树的领域重心 ──
  const rankSum = new Map<string, number>()
  const tally = (id: string): number => {
    let rs = AREA_ORDER[tree.skill(id).areaId]
    for (const k of children.get(id)!) rs += tally(k)
    rankSum.set(id, rs)
    return rs
  }
  for (const r of roots) tally(r)
  const rank = (id: string) => rankSum.get(id)! / count.get(id)!
  const byRank = (a: string, b: string) => rank(a) - rank(b) || count.get(b)! - count.get(a)! || a.localeCompare(b)
  for (const kids of children.values()) kids.sort(byRank)

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
    const all = lay(roots, build)
    let span = 0
    for (const [l, r] of all.values()) span = Math.max(span, r - l)
    return { rel, span, radius }
  }

  // 一个节点沿圆周方向占多宽的一半：名字是横着写的，在左右两边占名字的宽，在上下两边占节点加名字的高。
  // 职业连线只占一条窄道。先不知道角度，按名字宽排一次；再按排出来的角度重新算宽度，排几遍就稳了
  const BOX_H = (NODE_R + LABEL_BOTTOM) / 2 + 6
  const halfAt = (id: string, a: number) => {
    if (id.startsWith('sub:')) return LANE_HALF
    const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2)
    return Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * BOX_H + GAP / 2
  }
  const solve = () => {
    // 第一圈要多大才能一圈排得下：二分
    let lo = 10
    let hi = RING * 40
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2
      if (pack(m).span <= Math.PI * 2) hi = m
      else lo = m
    }
    const { rel, span, radius } = pack(Math.ceil(hi))
    // 排完有剩的角度：整体摊开，绕满一圈
    const stretch = (Math.PI * 2) / span
    const angle = new Map<string, number>()
    const absolute = (id: string, a: number) => {
      angle.set(id, a)
      for (const k of children.get(id)!) absolute(k, a + rel.get(k)! * stretch)
    }
    for (const k of roots) absolute(k, rel.get(k)! * stretch)
    for (const [anchor, tip] of tipOf) angle.set(tip, angle.get(anchor)! + (rel.get(tip) ?? 0) * stretch)
    // 下一遍按角度算每个节点占多宽，角度要先定朝向：PyTorch 朝正上方
    const turn = -(angle.get('pytorch') ?? 0)
    for (const [id, a] of angle) angle.set(id, a + turn)
    return { angle, radius }
  }
  let solved = solve()
  for (let pass = 0; pass < 4; pass++) {
    for (const s of skills) half.set(s.id, halfAt(s.id, solved.angle.get(s.id)!))
    solved = solve()
  }
  const lanes = (id: string): string[] => {
    const tip = tipOf.get(id)
    return tip ? [...children.get(id)!, tip] : children.get(id)!
  }

  const { angle: packed, radius: target } = solved

  // 职业就在它那一列的最末端：线从技能沿半径笔直连出去，不绕弧
  const TAU = Math.PI * 2
  const norm = (a: number) => ((a % TAU) + TAU) % TAU
  const tipIds = [...tipOf.values()]
  const angle = new Map(packed)
  const lane = new Map<string, number>()
  for (const tip of tipIds) lane.set(tip, angle.get(tip)!)
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
  // 职业那一列也算一个“占位”：从挂的技能外面一圈到最外圈，别的链不能转进来压在线上
  for (const [anchor, tip] of tipOf) for (let d = depth.get(anchor)! + 1; d < top; d++) byRing.get(d)!.push(tip)
  const isLane = (id: string) => id.startsWith('sub:')
  const angR = (id: string) => (isLane(id) ? lane.get(id)! : angle.get(id)!)
  const halfR = (id: string) => halfAt(id, angR(id))
  const turnR = (id: string, by: number) => (isLane(id) ? lane.set(id, lane.get(id)! + by) : turnTree(id, by))
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    for (let d = 2; d < top; d++) {
      const ring = byRing.get(d)!.slice().sort((a, b) => norm(angR(a)) - norm(angR(b)))
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i]
        const b = ring[i + 1]
        const gap = norm(angR(b)) - norm(angR(a))
        const need = (halfR(a) + halfR(b)) / target(d)
        if (gap < need - 1e-4) {
          const push = Math.min(need - gap, 0.05) / 2
          turnR(a, -push)
          turnR(b, push)
          moved = true
        }
      }
    }
    if (!moved) break
  }
  for (const tip of tipIds) angle.set(tip, lane.get(tip)!)
  // 松弛完再转一下：大模型算法工程师正好朝上
  const up2 = angle.get(subNodeId('llm-algo')) ?? 0
  for (const [id, a] of angle) angle.set(id, norm(a - up2))

  // ── 每一圈的半径：同一圈相邻两个节点之间排得下 ──
  const radii = [0]
  for (let d = 1; d < top; d++) {
    // 这一圈的技能，加上从这一圈穿过去的职业连线
    const ring = [
      ...skills.filter((s) => depth.get(s.id) === d).map((s) => s.id),
      ...[...tipOf].filter(([anchor]) => depth.get(anchor)! < d).map(([, tip]) => tip),
    ].sort((a, b) => norm(angle.get(a)!) - norm(angle.get(b)!))
    let r = d === 1 ? FIRST_RING : radii[d - 1] + RING
    for (let i = 0; i < ring.length && ring.length > 1; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      let gap = norm(angle.get(b)!) - norm(angle.get(a)!)
      if (gap <= 0) gap += Math.PI * 2
      r = Math.max(r, (halfAt(a, angle.get(a)!) + halfAt(b, angle.get(b)!)) / gap)
    }
    // 斜着看，名字长的节点会和里面一圈的叠在一起：叠了就再往外推
    const boxAt = (id: string, rr: number) => {
      const p = pt(rr, angle.get(id)!)
      const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2) + 4
      return { l: p.x - w, r: p.x + w, t: p.y - NODE_R - 4, b: p.y + LABEL_BOTTOM + 4 }
    }
    const inner = d > 1 ? skills.filter((s) => depth.get(s.id) === d - 1).map((s) => boxAt(s.id, radii[d - 1])) : []
    const hits = (rr: number) => ring.filter((id) => !id.startsWith('sub:')).some((id) => {
      const a = boxAt(id, rr)
      return inner.some((b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b)
    })
    while (hits(r)) r += 8
    radii.push(Math.ceil(r))
  }
  const radius = (d: number) => radii[d]
  const tipR = radius(top - 1) + RING + 40

  const nodes: WebLayout['nodes'] = new Map()
  const place = (id: string, r: number) => {
    const p = pt(r, angle.get(id)!)
    nodes.set(id, { x: f(p.x), y: f(p.y) })
  }
  for (const [id, d] of depth) place(id, radius(d))
  for (const tip of tipOf.values()) place(tip, tipR)

  // ── 枝条：从父节点往外，到两圈中间沿圆弧转过去，再往外停在孩子前面；起点从圆心发出直的辐条 ──
  const edges: WebLayout['edges'] = []
  for (const s of skills) {
    const d = depth.get(s.id)!
    const a2 = angle.get(s.id)!
    const end = radius(d) - clearOfLabel(a2, s.name)
    if (!s.parent) {
      // 从圆心外圈的光芒外面开始，三根一样齐
      const p1 = pt(START_R + 22, a2)
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
    const a2 = angle.get(tip)!
    const start = radius(d) + outClear(a1, nameOf.get(anchor)!)
    // 有孩子的技能，职业单独占一列：先转到那一列，再沿半径直直出去
    // 停在徽章外面；下半圈的线从上面进来，要停在徽章名字的外面
    const box = tipLabelBox(subName.get(tip)!)
    const back = Math.max(TIP_R + 10, exitBox(-Math.sin(a2), Math.cos(a2), box.l - 4, box.r + 4, box.t - 4, box.b + 4) + 4)
    edges.push({ from: anchor, to: tip, d: radialElbow(a1, start, a2, tipR - back, (radius(d) + radius(d + 1)) / 2) })
  }

  // 最外圈的徽章，上面还有名字
  return { nodes, edges, rings: radii.slice(1).map(f), radius: tipR + TIP_R + 90 }
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
