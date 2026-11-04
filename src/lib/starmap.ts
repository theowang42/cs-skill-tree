// 星图布局：以“你”为圆心，技能按等级排成 5 圈，知识领域各占一片星云，方向挂在最外圈。
//
//   - 第 n 圈 = 等级 n（1 入门 … 5 前沿），由数据库视图 skill_level 算好带在数据里。
//     前置永远不在更外圈，所以连线一律从内指向外或沿圈走。
//   - 每个知识领域占一段角度（按技能数分配），相关的领域相邻；它的星聚成一片星云。
//     工具没有领域，跟着它最深的那个前置走（React 跟着“组件与状态管理”去界面开发）。
//   - 同一圈同一星云里按前置的平均角度排序，星云太窄放不下时错成内外两行，最后把挤在一起的推开。
//   - 方向放在最外圈之外，角度是它要求的技能的加权平均方向。
//
// 纯函数，坐标单位是像素，原点在圆心。只依赖导出的 Roadmap，结果对同一份数据总是一样。
import type { Tree } from './tree.ts'

export interface StarPos {
  x: number
  y: number
  /** 弧度，0 指向右，屏幕坐标 y 向下 */
  angle: number
  r: number
  level: number
  sector: string
}

export interface Sector {
  id: string
  name: string
  start: number
  end: number
  /** 基础层 / 核心层 / 进阶层 */
  layer: string
  /** 色相序号，画星云用 */
  hue: number
}

/** 一片星云：一个领域在某一圈上的一团 */
export interface Cloud {
  sector: string
  level: number
  x: number
  y: number
  /** 沿圈方向的半径 */
  rx: number
  /** 沿径向的半径 */
  ry: number
  angle: number
}

export interface StarLayout {
  skills: Map<string, StarPos>
  subs: Map<string, { x: number; y: number; angle: number; r: number }>
  sectors: Sector[]
  clouds: Cloud[]
  /** 每一圈的半径，下标是 level - 1 */
  rings: number[]
  rimRadius: number
  extent: number
}

export const LEVEL_NAMES = ['', '入门', '基础', '进阶', '专精', '前沿']

// 扇区顺序：相邻的领域在内容上也相关，前置连线就不会横穿整张图。
const SECTOR_ORDER = [
  'math', 'theory', 'dsa', 'programming', 'compiler', 'swe', 'tooling', 'ui', 'llm-apps', 'ml',
  'graphics', 'hpc', 'architecture', 'embedded', 'organization', 'os', 'security', 'network', 'database', 'distributed',
]

const BASE_RINGS = [120, 320, 480, 640, 810]
/** 同一圈相邻两颗星中心之间至少隔多远（像素），给名字留位置 */
const MIN_ARC = 66
const ROW_OFFSET = 46
const RIM_GAP = 170
const TAU = Math.PI * 2

const norm = (a: number) => ((a % TAU) + TAU) % TAU

function circularMean(angles: number[], weights?: number[]): number {
  let x = 0
  let y = 0
  angles.forEach((a, i) => {
    const w = weights?.[i] ?? 1
    x += Math.cos(a) * w
    y += Math.sin(a) * w
  })
  return norm(Math.atan2(y, x))
}

/** 把一圈上的角度推开。不在同一行的两颗星可以靠得近一些。圆形的，首尾相接。 */
function relax(items: { angle: number; row?: number }[], minGap: number, otherRow = 1) {
  if (items.length < 2) return
  const n = items.length
  const need = (a: { row?: number }, b: { row?: number }) => (a.row === b.row ? minGap : minGap * otherRow)
  let total = 0
  for (let i = 0; i < n; i++) total += need(items[i], items[(i + 1) % n])
  const scale = total > TAU ? TAU / total : 1
  for (let iter = 0; iter < 300; iter++) {
    items.sort((a, b) => a.angle - b.angle)
    let moved = false
    for (let i = 0; i < n; i++) {
      const a = items[i]
      const b = items[(i + 1) % n]
      let gap = b.angle - a.angle
      if (i === n - 1) gap += TAU
      const want = need(a, b) * scale
      if (gap < want - 1e-6) {
        const push = (want - gap) / 2
        a.angle = norm(a.angle - push)
        b.angle = norm(b.angle + push)
        moved = true
      }
    }
    if (!moved) break
  }
}

export function layoutStarMap(tree: Tree): StarLayout {
  const skills = tree.roadmap.skills
  const level = new Map(skills.map((s) => [s.id, s.level]))

  // 1. 星云归属：知识点用自己的领域；工具跟着最深的前置走
  const sectorOf = new Map<string, string>()
  const sectorFor = (id: string): string => {
    const known = sectorOf.get(id)
    if (known) return known
    const s = tree.skill(id)
    let sec: string
    if (s.areaId) sec = s.areaId
    else {
      const pre = [...s.prerequisites].sort((a, b) => tree.skill(b).depth - tree.skill(a).depth || (tree.skill(a).kind === 'concept' ? -1 : 1))
      sec = pre.length ? sectorFor(pre[0]) : 'tooling'
    }
    sectorOf.set(id, sec)
    return sec
  }
  skills.forEach((s) => sectorFor(s.id))

  // 2. 扇区角度：按技能数分，每个扇区再加一点留白；从正上方顺时针排
  const order = [...SECTOR_ORDER, ...tree.roadmap.areas.map((a) => a.id).filter((id) => !SECTOR_ORDER.includes(id))]
  const counts = new Map(order.map((id) => [id, skills.filter((s) => sectorOf.get(s.id) === id).length]))
  const pad = 1.5
  const total = order.reduce((n, id) => n + counts.get(id)! + pad, 0)
  const sectors: Sector[] = []
  let cursor = -Math.PI / 2
  order.forEach((id, i) => {
    const span = ((counts.get(id)! + pad) / total) * TAU
    const area = tree.areas.get(id)!
    sectors.push({ id, name: area.name, start: cursor, end: cursor + span, layer: tree.layers.get(area.layerId)!.name, hue: i })
    cursor += span
  })

  // 3 + 4. 一圈一圈从里往外放。
  // 每片星云（一个领域在一圈上的星）按自己的弧长决定排几行；圈的半径由最挤的那片决定。
  // 位置是算出来的，不靠“推开”，所以每颗星一定待在自己的星云里。
  const levels = 5
  const pos = new Map<string, StarPos>()
  const clouds: Cloud[] = []
  const rings: number[] = []
  for (let i = 0; i < levels; i++) {
    const list = skills.filter((s) => level.get(s.id) === i + 1)
    // 第 1 圈是大家共用的起点，星少，不按星云分，均匀绕一圈
    // 这一圈上每片星云占的角度：一半按全图的扇区，一半按这一圈上各领域的星数。
    // 领域的方向大体不变，但这一圈谁星多谁就宽一点，圈不用撑得太大。
    let groups: { sec: Sector; span: number; items: typeof list }[]
    if (i === 0) {
      groups = [{ sec: { ...sectors[0], start: -Math.PI / 2, end: -Math.PI / 2 + TAU }, span: TAU, items: list }]
    } else {
      const present = sectors.map((sec) => ({ sec, items: list.filter((s) => sectorOf.get(s.id) === sec.id) }))
      const ringTotal = list.length + present.length * 0.8
      let a = -Math.PI / 2
      groups = present.map(({ sec, items }) => {
        const global = sec.end - sec.start
        const local = ((items.length + 0.8) / ringTotal) * TAU
        const span = global * 0.5 + local * 0.5
        const g = { sec: { ...sec, start: a, end: a + span }, span, items }
        a += span
        return g
      })
      // 四舍五入的误差摊到最后一片
      const last = groups[groups.length - 1]
      last.sec.end = -Math.PI / 2 + TAU
      last.span = last.sec.end - last.sec.start
      groups = groups.filter((g) => g.items.length)
    }
    let r = Math.max(BASE_RINGS[i], i ? rings[i - 1] + 2 * ROW_OFFSET + 70 : 0)
    let rows = groups.map(() => 1)
    // 行数和半径互相影响；行数只增不减，几轮就稳定了
    for (let pass = 0; pass < 4; pass++) {
      rows = groups.map((g, gi) => Math.max(rows[gi], Math.min(4, Math.ceil((g.items.length * MIN_ARC) / (g.span * r)))))
      const needed = Math.max(...groups.map((g, gi) => (Math.ceil(g.items.length / rows[gi]) * MIN_ARC) / g.span))
      r = Math.max(r, needed)
    }
    rings.push(r)
    groups.forEach((g, gi) => {
      const n = rows[gi]
      // 组内按前置的平均角度排序，连线就不会在星云里交叉
      const keyed = g.items.map((s) => {
        const pre = s.prerequisites.map((p) => pos.get(p)!).filter(Boolean)
        const own = sectors.find((x) => x.id === sectorOf.get(s.id))!
        const pull = pre.length ? circularMean(pre.map((p) => p.angle)) : (own.start + own.end) / 2
        let rel = norm(pull - g.sec.start)
        if (rel > Math.PI) rel -= TAU
        return { id: s.id, rel }
      }).sort((a, b) => a.rel - b.rel)
      const slots = Math.ceil(keyed.length / n)
      const slotW = g.span / slots
      const placed: { angle: number; row: number }[] = []
      keyed.forEach((k, j) => {
        const slot = Math.floor(j / n)
        const row = j % n
        // 多行时错开半格，相邻的星交错着排
        const a = norm(g.sec.start + slotW * (slot + 0.5) + ((row - (n - 1) / 2) * slotW) / n)
        const rr = r + row * ROW_OFFSET
        pos.set(k.id, { x: Math.cos(a) * rr, y: Math.sin(a) * rr, angle: a, r: rr, level: i + 1, sector: sectorOf.get(k.id)! })
        placed.push({ angle: a, row })
      })
      if (i === 0) return
      // 星云：这一团的范围
      const mid = circularMean(placed.map((m) => m.angle))
      let spread = 0
      for (const m of placed) {
        let d = Math.abs(norm(m.angle - mid))
        if (d > Math.PI) d = TAU - d
        spread = Math.max(spread, d)
      }
      const rc = r + (ROW_OFFSET * (n - 1)) / 2
      clouds.push({ sector: g.sec.id, level: i + 1, angle: mid, x: Math.cos(mid) * rc, y: Math.sin(mid) * rc, rx: Math.max(60, spread * r + 50), ry: 55 + (ROW_OFFSET * (n - 1)) / 2 })
    })
  }

  // 5. 方向：最外圈之外，朝它要求的技能的加权平均方向
  const rimRadius = rings[rings.length - 1] + RIM_GAP
  const subItems = tree.roadmap.subs.map((s) => {
    const req = [...tree.closures.get(s.id)!]
    return { id: s.id, angle: circularMean(req.map((id) => pos.get(id)!.angle), req.map((id) => level.get(id)! ** 2)) }
  })
  relax(subItems, 150 / rimRadius)
  const subs = new Map(subItems.map((s) => [s.id, { x: Math.cos(s.angle) * rimRadius, y: Math.sin(s.angle) * rimRadius, angle: s.angle, r: rimRadius }]))

  return { skills: pos, subs, sectors, clouds, rings, rimRadius, extent: rimRadius + 140 }
}
