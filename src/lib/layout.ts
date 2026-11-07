// 技能树的布局：竖着长。最下面是“你”，往上一行一行，最上面一行是职业徽章。
// 两种树都用它：一个领域的树（技能树页的一个页签：这个领域的技能，加上挂在它们上面的职业徽章），
// 和一个职业的天赋树（这个职业要学的技能，含全部前置，加上它自己的徽章）。
// 主前置不在这棵树里的技能（别的领域的），就从“你”直接连出来，记在 outside 里，页面上写明来自哪里。
//
//   - 每个技能挂在它的主前置上（前置里的第一个），所以画出来是一条条往上的链，只在关键节点分叉。
//     其余前置不画线，选中时只让那些节点保持清楚，面板里列出来。
//   - 子树按每一行的左右轮廓紧挨着排，父节点在孩子正中间；只有一个孩子时在同一列，链是直的。
//     兄弟的左右顺序按子树的领域重心（AREA_ORDER），同一个领域的挨在一起。
//   - 徽章都在最上面一行，挂的技能往上到徽章是一条单独的竖道，别的节点不压上去。
//   - 枝条：从父节点往上到两行中间，横着走过去，再往上停在孩子的名字下面。
//
// 纯函数，坐标单位是像素，“你”在 (0, 0)，往上是 y 变小。
import type { Tree } from './tree.ts'

export const NODE_R = 31
/** 名字在节点下面多远（基线），和名字的底 */
export const LABEL_Y = NODE_R + 21
export const LABEL_BOTTOM = NODE_R + 28
/** 同一排相邻两个节点的名字之间至少空多少 */
const GAP = 26
/** 职业徽章的外半径，和它在一排里占多宽的一半（名字比徽章宽） */
export const TIP_R = 46
const TIP_HALF = 78
/** 最下面的“你” */
export const START_R = 44
/** 相邻两行隔多远；第一行离“你”多远 */
const ROW = 160
const FIRST = 190
/** 徽章那根竖线占多宽的一半：别的节点离它至少这么远 */
const LANE_HALF = 12

/** 左右的顺序：做产品的（Web、客户端、数据）在左，AI 在中间，地基、底层系统和安全在右 */
const AREA_ORDER: Record<string, number> = {
  web: 0, client: 1, data: 2, learning: 3, llm: 4, infra: 5, base: 6, systems: 7, security: 8,
}

/** 往上长，或者往右长 */
export type Orient = 'up' | 'right'

/** 画一棵树要的全部位置 */
export interface Layout {
  orient: Orient
  /** 技能 id，或职业的 'sub:<id>' → 位置 */
  nodes: Map<string, { x: number; y: number }>
  /** 树上画出来的枝：每个节点一根，没有前置的技能从“你”（'root'）连出来 */
  edges: { from: string; to: string; d: string }[]
  /** 主前置在别的领域的技能 → 那个主前置（领域的树里才有） */
  outside: Map<string, string>
  /** 整张图（含徽章上面的名字）都在这个框里 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export const subNodeId = (subId: string) => `sub:${subId}`

/** 六边形（编程语言）：尖朝上，外接圆半径 r，中心在原点 */
export const hexPath = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ') + 'Z'

/** 往右长时名字离节点中心多远：让开点亮后外圈的光芒 */
export const SIDE_X = NODE_R + 20

/** 主前置在别的领域时，名字下面那行小字（11px） */
export const fromText = (name: string) => `先会 ${name}`

/** 名字的显示宽度：中文 14px，英文数字约 8px */
export function labelWidth(name: string): number {
  return [...name].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 14 : 8), 0)
}

const rowY = (d: number) => -(FIRST + (d - 1) * ROW)
const f = (n: number) => Math.round(n * 10) / 10

/** 往上长：从 (x1, y1) 往上到 ym，横着到 x2，再往上到 y2 */
function elbowUp(x1: number, y1: number, x2: number, y2: number, ym: number): string {
  if (x1 === x2) return `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}`
  return `M${f(x1)},${f(y1)} L${f(x1)},${f(ym)} L${f(x2)},${f(ym)} L${f(x2)},${f(y2)}`
}

/** 往右长：从 (x1, y1) 往右到 xm，竖着到 y2，再往右到 x2 */
function elbowRight(x1: number, y1: number, x2: number, y2: number, xm: number): string {
  if (y1 === y2) return `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}`
  return `M${f(x1)},${f(y1)} L${f(xm)},${f(y1)} L${f(xm)},${f(y2)} L${f(x2)},${f(y2)}`
}

/**
 * 排一棵树：一个领域的，或者一个职业的。
 * orient：up 是往上长（名字在节点下面），right 是往右长（名字在节点右边，像科技树）。用哪个由页面看屏幕的形状挑
 */
export function layoutTree(tree: Tree, view: { area: string } | { career: string }, orient: Orient = 'up'): Layout {
  const right = orient === 'right'
  const ids = 'career' in view ? [...tree.closures.get(view.career)!] : tree.areas.get(view.area)!.skillIds
  const inTree = new Set(ids)
  const subs = 'career' in view ? [tree.subs.get(view.career)!] : tree.roadmap.subs.filter((s) => inTree.has(s.anchor))
  /** 树上画的那根枝连向谁：主前置在这棵树里就是它，否则从“你”连出来 */
  const parentOf = (id: string) => {
    const p = tree.skill(id).parent
    return p && inTree.has(p) ? p : 'root'
  }
  const outside = new Map(ids.filter((id) => tree.skill(id).parent && parentOf(id) === 'root').map((id) => [id, tree.skill(id).parent!]))
  /** 挂着徽章的技能 → 徽章 */
  const tipOf = new Map(subs.map((s) => [s.anchor, subNodeId(s.id)]))
  const children = new Map<string, string[]>([['root', []]])
  for (const id of ids) children.set(id, [])
  for (const id of ids) children.get(parentOf(id))!.push(id)
  /** 名字（和“先会 某某”那行小字）有多宽 */
  const nameW = (id: string) => labelWidth(tree.skill(id).name)
  const textW = (id: string) => Math.max(nameW(id), outside.has(id) ? (labelWidth(fromText(tree.skill(outside.get(id)!).name)) * 11) / 14 : 0)

  const depth = new Map<string, number>()
  const setDepth = (id: string, d: number) => {
    depth.set(id, d)
    for (const k of children.get(id)!) setDepth(k, d + 1)
  }
  for (const k of children.get('root')!) setDepth(k, 1)
  const top = Math.max(...depth.values()) + 1

  // 兄弟的先后：按子树的领域重心
  const rank = new Map<string, number>()
  const tally = (id: string): [sum: number, n: number] => {
    let sum = AREA_ORDER[tree.skill(id).areaId]
    let n = 1
    for (const k of children.get(id)!) {
      const [s, c] = tally(k)
      sum += s
      n += c
    }
    rank.set(id, sum / n)
    return [sum, n]
  }
  for (const r of children.get('root')!) tally(r)
  for (const kids of children.values()) kids.sort((a, b) => rank.get(a)! - rank.get(b)! || a.localeCompare(b))

  // ── 同一层里的位置（往上长是左右，往右长是上下）：子树按每一层的轮廓紧挨着排 ──
  type Contour = Map<number, [number, number]>
  const rel = new Map<string, number>()
  const merge = (into: Contour, c: Contour, dx: number) => {
    for (const [d, [l, r]] of c) {
      const cur = into.get(d)
      into.set(d, cur ? [Math.min(cur[0], l + dx), Math.max(cur[1], r + dx)] : [l + dx, r + dx])
    }
  }
  // 一个节点在同一层里占多宽的一半：往上长时名字在下面，按名字宽；往右长时名字在右边，只按节点高
  const half = (id: string) => (right ? NODE_R + 17 : Math.max(NODE_R, textW(id) / 2) + GAP / 2)
  const tipHalf = right ? TIP_R + 16 : TIP_HALF
  const tipColumn = (from: number): Contour => {
    const c: Contour = new Map()
    for (let d = from; d < top; d++) c.set(d, [-LANE_HALF, LANE_HALF])
    c.set(top, [-tipHalf, tipHalf])
    return c
  }
  /** 把一排孩子按轮廓挨着排开，记下每个相对中间的位置，返回合起来的轮廓 */
  const lay = (row: string[], build: (id: string) => Contour): Contour => {
    const placed: { id: string; x: number }[] = []
    const acc: Contour = new Map()
    for (const k of row) {
      const c = build(k)
      let x = 0
      if (placed.length) {
        x = -Infinity
        for (const [d, [l]] of c) {
          const a = acc.get(d)
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
    const tip = tipOf.get(id)
    const row = tip ? [...children.get(id)!, tip] : children.get(id)!
    const out = row.length ? lay(row, (k) => (k === tip ? tipColumn(d + 1) : build(k))) : new Map()
    merge(out, new Map([[d, [-half(id), half(id)]]]), 0)
    return out
  }
  lay(children.get('root')!, build)

  // ── 每一层在哪：往上长是等距的行；往右长是一列一列，每列宽到放得下这一列最长的名字 ──
  const textOf = new Map<number, number>()
  for (const id of ids) textOf.set(depth.get(id)!, Math.max(textOf.get(depth.get(id)!) ?? 0, textW(id)))
  /** 往右长：第 d 列名字的右边再往右多少是这一列的竖线 */
  const busX = (d: number) => colX(d) + SIDE_X + textOf.get(d)! + 32
  const colXs = [0, START_R + 110]
  for (let d = 1; d < top; d++) colXs.push(colXs[d] + SIDE_X + textOf.get(d)! + 64 + (d + 1 === top ? TIP_R : NODE_R))
  function colX(d: number) {
    return colXs[d]
  }
  const at = (d: number, b: number) => (right ? { x: f(colX(d)), y: f(b) } : { x: f(b), y: rowY(d) })

  const nodes: Layout['nodes'] = new Map()
  const place = (id: string, b: number) => {
    nodes.set(id, at(depth.get(id)!, b))
    for (const k of children.get(id)!) place(k, b + rel.get(k)!)
    const tip = tipOf.get(id)
    if (tip) nodes.set(tip, at(top, b + rel.get(tip)!))
  }
  for (const k of children.get('root')!) place(k, rel.get(k)!)

  // ── 枝条 ──
  // 往上长：父节点头顶往上，到两行中间横过去，停在孩子的名字下面。
  // 往右长：从父节点名字的右边出发，到这一列的竖线转下去，再往右停在孩子左边
  const edges: Layout['edges'] = []
  const link = (from: string, to: string, isTip: boolean) => {
    const a = from === 'root' ? { x: 0, y: 0 } : nodes.get(from)!
    const b = nodes.get(to)!
    if (right) {
      const x1 = from === 'root' ? START_R + 22 : a.x + SIDE_X + nameW(from) + 14
      const x2 = b.x - (isTip ? TIP_R + 10 : NODE_R + 18)
      const xm = from === 'root' ? (x1 + colX(1) - NODE_R - 18) / 2 : busX(depth.get(from)!)
      edges.push({ from, to, d: elbowRight(x1, a.y, x2, b.y, xm) })
      return
    }
    const y1 = a.y - (from === 'root' ? START_R + 22 : NODE_R + 4)
    const y2 = b.y + (isTip ? TIP_R + 10 : LABEL_BOTTOM + 4)
    // 徽章那根竖线在挂的技能上面那一行就转过去
    const ym = (y1 + (isTip ? rowY(depth.get(from)! + 1) + LABEL_BOTTOM + 4 : y2)) / 2
    edges.push({ from, to, d: elbowUp(a.x, y1, b.x, y2, ym) })
  }
  for (const id of ids) link(parentOf(id), id, false)
  for (const [anchor, tip] of tipOf) link(anchor, tip, true)

  // 整张图的框
  const tips = [...tipOf.entries()].map(([, t]) => ({ ...nodes.get(t)!, w: (labelWidth(tree.subs.get(t.slice(4))!.name) * 15) / 14 }))
  const skillPts = ids.map((id) => ({ ...nodes.get(id)!, w: textW(id) }))
  const bounds = right
    ? {
        minX: -START_R - 40,
        maxX: Math.max(...skillPts.map((p) => p.x + SIDE_X + p.w), ...tips.map((t) => t.x + TIP_R + 14 + t.w)) + 40,
        minY: Math.min(-START_R, ...skillPts.map((p) => p.y - NODE_R), ...tips.map((t) => t.y - TIP_R - 12)) - 40,
        maxY: Math.max(START_R, ...skillPts.map((p) => p.y + NODE_R + 12), ...tips.map((t) => t.y + TIP_R + 12)) + 40,
      }
    : {
        minX: Math.min(-START_R, ...skillPts.map((p) => p.x - Math.max(NODE_R, p.w / 2)), ...tips.map((t) => t.x - TIP_HALF)) - 40,
        maxX: Math.max(START_R, ...skillPts.map((p) => p.x + Math.max(NODE_R, p.w / 2)), ...tips.map((t) => t.x + TIP_HALF)) + 40,
        minY: rowY(top) - TIP_R - 90,
        maxY: START_R + 50,
      }
  return { orient, nodes, edges, outside, bounds }
}
