// 技能树的布局：一个圆，像竖着的技能树卷起来。圆心是“你”，三个基础技能（编程入门、Linux、微积分）
// 在第一圈；技能一圈一圈往外长，链尽量沿半径笔直往外；职业在它那一列的最末端，最外一圈。
//
//   - 每个技能只挂在它的“主前置”上（种子里前置的第一个）。画出来是一条条往外的链，只在关键节点分叉。
//     其余前置不画线，选中时只让那些节点保持清楚，面板里列出来。
//   - 先紧凑地排，定下每一圈的先后顺序：子树按每一圈的左右轮廓紧挨着（宽度换算成弧度 = 像素宽 / 半径），
//     父节点在孩子正中间，一个孩子时同一个角度。职业那一列从挂的技能一直占到最外圈。
//   - 再摊开：圈与圈等距，第一圈在 FIRST_RING。节点被父亲拉着，同一圈挨得太近的按顺序推开（挪得最少），
//     最深最密的那几支就往两边空着的地方铺开，链只在挤的地方稍微拐一下。找排得下的最小圈距。
//   - 枝条：从父节点沿半径往外，到两圈中间沿一小段圆弧转过去，再沿半径停在孩子前面。线绕开名字。
//
// 纯函数，坐标单位是像素，圆心是 (0, 0)。
import type { Tree } from './tree.ts'

export const NODE_R = 31
/** 名字在节点下面多远（基线），和名字的底 */
export const LABEL_Y = NODE_R + 21
export const LABEL_BOTTOM = NODE_R + 28
/** 同一排相邻两个节点的名字之间至少空多少 */
export const GAP = 26
/** 职业（终极节点）徽章的外半径，和它在一排里占多宽的一半（名字比徽章宽） */
export const TIP_R = 46
export const TIP_HALF = 78

/** 左右的顺序：AI 产品在左，AI Infra 在中间，底层系统和安全在右 */
export const AREA_ORDER: Record<string, number> = {
  dev: 0, product: 1, quant: 2, llm: 2.6, infra: 3, base: 5, systems: 6, security: 7,
}

/** 画一棵树要的全部位置：大图和单个职业的天赋树都是这个形状 */
export interface Layout {
  /** 技能 id，或职业的 'sub:<id>' → 位置 */
  nodes: Map<string, { x: number; y: number }>
  /** 树上画出来的枝：每个节点一根，没有前置的技能从圆心（'root'）连出来 */
  edges: { from: string; to: string; d: string }[]
  /** 每一圈的半径（不含圆心），画成很淡的同心圆，缩小时看得出一圈一圈 */
  rings: number[]
  /** 整张图（含徽章上面的名字）都在这个框里 */
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

export function layoutWeb(tree: Tree): Layout {
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
  const { angle: packed } = solved

  const TAU = Math.PI * 2
  const norm = (a: number) => ((a % TAU) + TAU) % TAU
  /** 两个角度差多少，落在 (-π, π] */
  const wrap = (a: number) => a - TAU * Math.round(a / TAU)

  // ── 摊开：圈与圈等距，每个节点在自己那一圈上找位置 ──
  // 紧凑排法让每条链笔直往外，但最深最密的几支（AI）挤在一片，整个圆只好放大，别的方向的外圈却是空的。
  // 这里放开一点：节点被父亲拉着（链尽量直），同一圈挨得太近的互相推开，外圈密的那片就往两边的空地铺开。
  // 每一圈的先后顺序就是紧凑排出来的顺序，推的时候不会越过邻居，线不会交叉。
  // 职业在最外圈，挂的技能外面到最外圈之间是一条窄道，别的节点不能压上去。
  const tipIds = [...tipOf.values()]
  const anchorOf = new Map([...tipOf].map(([anchor, tip]) => [tip, anchor]))
  const parentOf = new Map(skills.map((s) => [s.id, s.parent]))
  const start = new Map(packed)
  // 大模型算法工程师朝正上方
  const up = start.get(subNodeId('llm-algo')) ?? 0
  for (const [id, a] of start) start.set(id, norm(a - up))
  const rings: string[][] = Array.from({ length: top + 1 }, () => [])
  for (const s of skills) rings[depth.get(s.id)!].push(s.id)
  for (const [anchor, tip] of tipOf) for (let d = depth.get(anchor)! + 1; d <= top; d++) rings[d].push(tip)
  for (const ring of rings) ring.sort((x, y) => start.get(x)! - start.get(y)!)
  // 最外圈的职业：徽章上面还有名字和星级，在上下两边占得比左右高
  const tipHalfAt = (id: string, a: number) => {
    const w = Math.max((labelWidth(subName.get(id)!) * 15) / 14, 2 * (TIP_R + 8)) / 2 + 3
    const h = TIP_R + 36
    return Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h + GAP / 2
  }
  const halfIn = (id: string, d: number, a: number) => (id.startsWith('sub:') ? (d === top ? tipHalfAt(id, a) : LANE_HALF) : halfAt(id, a))

  const settle = (radii: number[]) => {
    const a = new Map(start)
    const pulls: [child: string, parent: string][] = [
      ...skills.filter((s) => s.parent).map((s) => [s.id, s.parent!] as [string, string]),
      ...tipIds.map((t) => [t, anchorOf.get(t)!] as [string, string]),
    ]
    // 推开一圈：保持先后顺序，相邻两个至少隔 need，挪动尽量少（保序回归）。从最宽松的那个空隙处剪开，摊成一条线来算
    const spread = (d: number) => {
      const ring = rings[d]
      const n = ring.length
      if (n < 2) return 0
      const x = ring.map((id) => a.get(id)!)
      const need = ring.map((id, i) => (halfIn(id, d, x[i]) + halfIn(ring[(i + 1) % n], d, x[(i + 1) % n])) / radii[d])
      const gap = (i: number) => x[(i + 1) % n] - x[i] + (i === n - 1 ? TAU : 0)
      let cut = 0
      for (let i = 1; i < n; i++) if (gap(i) - need[i] > gap(cut) - need[cut]) cut = i
      const order = Array.from({ length: n }, (_, k) => (cut + 1 + k) % n)
      // 展开：每个接着前一个，差多少就是多少（被拉得越过了邻居也照实算，回归会把它推回顺序里）
      const line = [x[order[0]]]
      for (let k = 1; k < n; k++) line.push(line[k - 1] + wrap(x[order[k]] - x[order[k - 1]]))
      // y = x - 累计的 need，要求 y 不减
      const offs: number[] = [0]
      for (let k = 1; k < n; k++) offs.push(offs[k - 1] + need[order[k - 1]])
      const blocks: { sum: number; cnt: number }[] = []
      for (let k = 0; k < n; k++) {
        blocks.push({ sum: line[k] - offs[k], cnt: 1 })
        while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].cnt > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].cnt) {
          const top = blocks.pop()!
          blocks[blocks.length - 1].sum += top.sum
          blocks[blocks.length - 1].cnt += top.cnt
        }
      }
      let k = 0
      let moved = 0
      for (const blk of blocks) for (let j = 0; j < blk.cnt; j++, k++) {
        const v = blk.sum / blk.cnt + offs[k]
        moved = Math.max(moved, Math.abs(v - line[k]))
        a.set(ring[order[k]], v)
      }
      return moved
    }
    let worst = 0
    // 先边拉边推，拉力越来越弱；最后只推
    for (let it = 0; it < 300; it++) {
      const k = Math.max(0, 1 - it / 200)
      // 拉：孩子朝父亲，父亲也朝孩子挪一点（停在孩子们中间）
      for (const [c, p] of pulls) {
        const diff = wrap(a.get(p)! - a.get(c)!)
        a.set(c, a.get(c)! + diff * 0.3 * k)
        a.set(p, a.get(p)! - diff * 0.08 * k)
      }
      worst = 0
      for (let d = 1; d <= top; d++) worst = Math.max(worst, spread(d))
      if (k === 0 && worst < 1e-5) break
    }
    // 再从里往外过一遍：单线链上的孩子先放回父亲的角度，再推开这一圈。推开挪得最少，所以只在挤的地方才歪
    const single = (id: string) => {
      const p = parentOf.get(id)
      return p && children.get(p)!.length === 1 && !tipOf.has(p) ? p : null
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let d = 2; d <= top; d++) {
        for (const id of rings[d]) {
          const p = single(id)
          if (p) a.set(id, a.get(id)! + wrap(a.get(p)! - a.get(id)!))
        }
        spread(d)
      }
      for (let it = 0; it < 100; it++) {
        let m = 0
        for (let d = 1; d <= top; d++) m = Math.max(m, spread(d))
        if (m < 1e-5) break
      }
    }
    // 拉直：只有一个孩子的节点，孩子摆回父亲的角度上，只要不碰到这一圈的左右邻居。从里往外，链能直就直
    const fits = (d: number, id: string, v: number) => {
      const ring = rings[d]
      const i = ring.indexOf(id)
      if (ring.length < 2) return true
      const prev = ring[(i - 1 + ring.length) % ring.length]
      const next = ring[(i + 1) % ring.length]
      const h = halfIn(id, d, v)
      return wrap(v - a.get(prev)!) >= (h + halfIn(prev, d, a.get(prev)!)) / radii[d] && wrap(a.get(next)! - v) >= (h + halfIn(next, d, a.get(next)!)) / radii[d]
    }
    // 孩子挪不过去，就试试把父亲挪到孩子那边（父亲那一圈有空的话）；来回几遍
    for (let pass = 0; pass < 6; pass++) for (let d = 2; d < top; d++) for (const id of rings[d]) {
      const p = parentOf.get(id)
      if (!p || children.get(p)!.length !== 1 || tipOf.has(p) || a.get(p) === a.get(id)) continue
      if (fits(d, id, a.get(p)!)) a.set(id, a.get(p)!)
      else if (fits(d - 1, p, a.get(id)!)) a.set(p, a.get(id)!)
    }
    // 每一圈都还要真的排得下：相邻两个（包括首尾）不挨着
    const tight = rings.some((ring, d) => ring.length > 1 && ring.some((id, i) => {
      const next = ring[(i + 1) % ring.length]
      const gap = norm(a.get(next)! - a.get(id)!)
      return gap < (halfIn(id, d, a.get(id)!) + halfIn(next, d, a.get(next)!)) / radii[d] - 1e-4
    }))
    // 摊开的时候整体会转一点：转回去，大模型算法工程师还是朝正上方
    const drift = a.get(subNodeId('llm-algo')) ?? 0
    for (const [id, v] of a) a.set(id, norm(v - drift))
    return tight ? null : a
  }

  // 斜着看，名字长的节点会和里面一圈的叠在一起
  const boxAt = (id: string, rr: number, a: number) => {
    const p = pt(rr, a)
    const w = Math.max(NODE_R, labelWidth(nameOf.get(id)!) / 2) + 4
    return { l: p.x - w, r: p.x + w, t: p.y - NODE_R - 4, b: p.y + LABEL_BOTTOM + 4 }
  }
  const overlaps = (radii: number[], a: Map<string, number>) => {
    for (let d = 2; d < top; d++) {
      const outer = rings[d].filter((id) => !id.startsWith('sub:')).map((id) => boxAt(id, radii[d], a.get(id)!))
      const inner = rings[d - 1].filter((id) => !id.startsWith('sub:')).map((id) => boxAt(id, radii[d - 1], a.get(id)!))
      if (outer.some((o) => inner.some((i) => o.l < i.r && i.l < o.r && o.t < i.b && i.t < o.b))) return true
    }
    return false
  }

  // 第一圈只有三个起点，放在 FIRST_RING；往外每圈隔 step。找排得下的最小 step
  let step = RING
  let radii: number[] = []
  let angle = start
  for (; step < RING * 6; step += 4) {
    radii = [0, ...Array.from({ length: top - 1 }, (_, i) => FIRST_RING + step * i)]
    radii.push(radii[top - 1] + Math.max(step, RING + 40))
    // 一圈加起来都放不下，就不用试了
    if (rings.some((ring, d) => d > 0 && ring.reduce((n, id) => n + 2 * halfIn(id, d, start.get(id)!), 0) > TAU * radii[d] * 0.97)) continue
    const a = settle(radii)
    if (a && !overlaps(radii, a)) {
      angle = a
      break
    }
  }
  const radius = (d: number) => radii[d]
  const tipR = radii[top]

  const nodes: Layout['nodes'] = new Map()
  const place = (id: string, r: number) => {
    const p = pt(r, angle.get(id)!)
    nodes.set(id, { x: f(p.x), y: f(p.y) })
  }
  for (const [id, d] of depth) place(id, radius(d))
  for (const tip of tipOf.values()) place(tip, tipR)

  // ── 枝条：从父节点往外，到两圈中间沿圆弧转过去，再往外停在孩子前面；起点从圆心发出直的辐条 ──
  const edges: Layout['edges'] = []
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
  const R = tipR + TIP_R + 90
  return { nodes, edges, rings: radii.slice(1, top).map(f), bounds: { minX: -R, minY: -R, maxX: R, maxY: R } }
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
