// 一个职业自己的天赋树：竖着长。最下面是“你”，往上一行一行，最上面是职业徽章。
//
//   - 只画这个职业要学的技能（含全部前置）。每个技能挂在主前置上，和大图一样，所以也是一条条往上的链。
//   - 子树按每一行的左右轮廓紧挨着排，父节点在孩子正中间；只有一个孩子时在同一列，链是直的。
//   - 徽章在最上面一行，挂的技能往上到徽章是一条单独的竖道，别的节点不压上去。
//   - 枝条：从父节点往上到两行中间，横着走过去，再往上停在孩子的名字下面。
//
// 纯函数，坐标单位是像素，“你”在 (0, 0)，往上是 y 变小。
import type { Tree } from './tree.ts'
import { AREA_ORDER, GAP, LABEL_BOTTOM, labelWidth, NODE_R, START_R, subNodeId, TIP_HALF, TIP_R, type Layout } from './webLayout.ts'

/** 相邻两行隔多远；第一行离“你”多远 */
const ROW = 124
const FIRST = 170
/** 徽章那根竖线占多宽的一半：别的节点离它至少这么远 */
const LANE_HALF = 12

const rowY = (d: number) => -(FIRST + (d - 1) * ROW)
const f = (n: number) => Math.round(n * 10) / 10

/** 从 (x1, y1) 往上到 ym，横着到 x2，再往上到 y2 */
function elbow(x1: number, y1: number, x2: number, y2: number, ym: number): string {
  if (x1 === x2) return `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}`
  return `M${f(x1)},${f(y1)} L${f(x1)},${f(ym)} L${f(x2)},${f(ym)} L${f(x2)},${f(y2)}`
}

export function layoutCareer(tree: Tree, subId: string): Layout {
  const ids = [...tree.closures.get(subId)!]
  const tip = subNodeId(subId)
  const anchor = tree.subs.get(subId)!.anchor
  // 主前置一定也是要学的，所以每个技能的父亲都在这棵树里
  const children = new Map<string, string[]>([['root', []]])
  for (const id of ids) children.set(id, [])
  for (const id of ids) children.get(tree.skill(id).parent ?? 'root')!.push(id)

  const depth = new Map<string, number>()
  const setDepth = (id: string, d: number) => {
    depth.set(id, d)
    for (const k of children.get(id)!) setDepth(k, d + 1)
  }
  for (const k of children.get('root')!) setDepth(k, 1)
  const top = Math.max(...depth.values()) + 1

  // 兄弟的左右顺序和大图一样：按子树的领域重心
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

  // ── 横向位置：子树按每一行的左右轮廓紧挨着排 ──
  type Contour = Map<number, [number, number]>
  const rel = new Map<string, number>()
  const merge = (into: Contour, c: Contour, dx: number) => {
    for (const [d, [l, r]] of c) {
      const cur = into.get(d)
      into.set(d, cur ? [Math.min(cur[0], l + dx), Math.max(cur[1], r + dx)] : [l + dx, r + dx])
    }
  }
  const tipColumn = (from: number): Contour => {
    const c: Contour = new Map()
    for (let d = from; d < top; d++) c.set(d, [-LANE_HALF, LANE_HALF])
    c.set(top, [-TIP_HALF, TIP_HALF])
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
    const h = Math.max(NODE_R, labelWidth(tree.skill(id).name) / 2) + GAP / 2
    const kids = children.get(id)!
    const row = id === anchor ? [...kids, tip] : kids
    const out = row.length ? lay(row, (k) => (k === tip ? tipColumn(d + 1) : build(k))) : new Map()
    merge(out, new Map([[d, [-h, h]]]), 0)
    return out
  }
  lay(children.get('root')!, build)

  const nodes: Layout['nodes'] = new Map()
  const place = (id: string, x: number) => {
    nodes.set(id, { x: f(x), y: id === tip ? rowY(top) : rowY(depth.get(id)!) })
    for (const k of children.get(id) ?? []) place(k, x + rel.get(k)!)
    if (id === anchor) place(tip, x + rel.get(tip)!)
  }
  for (const k of children.get('root')!) place(k, rel.get(k)!)

  // ── 枝条：父节点头顶往上，到两行中间横过去，停在孩子的名字下面 ──
  const edges: Layout['edges'] = []
  const link = (from: string, to: string) => {
    const a = from === 'root' ? { x: 0, y: 0 } : nodes.get(from)!
    const b = nodes.get(to)!
    const y1 = a.y - (from === 'root' ? START_R + 22 : NODE_R + 4)
    const y2 = b.y + (to === tip ? TIP_R + 10 : LABEL_BOTTOM + 4)
    // 徽章那根竖线在挂的技能上面那一行就转过去
    const ym = (y1 + (to === tip ? rowY(depth.get(from)! + 1) + LABEL_BOTTOM + 4 : y2)) / 2
    edges.push({ from, to, d: elbow(a.x, y1, b.x, y2, ym) })
  }
  for (const id of ids) link(tree.skill(id).parent ?? 'root', id)
  link(anchor, tip)

  // 整张图的框：左右是名字，上面是徽章的名字，下面是“你”
  const xs = ids.map((id) => [nodes.get(id)!.x, Math.max(NODE_R, labelWidth(tree.skill(id).name) / 2)] as const)
  const t = nodes.get(tip)!
  return {
    nodes,
    edges,
    rings: [],
    bounds: {
      minX: Math.min(-START_R, t.x - TIP_HALF, ...xs.map(([x, w]) => x - w)) - 40,
      maxX: Math.max(START_R, t.x + TIP_HALF, ...xs.map(([x, w]) => x + w)) + 40,
      minY: t.y - TIP_R - 90,
      maxY: START_R + 50,
    },
  }
}
