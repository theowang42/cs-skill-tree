// 星图布局：以“你”为圆心，技能按前置深度一圈圈往外排，知识领域各占一个扇区，方向挂在最外圈。
//
//   - 第 d 圈 = 从根出发最长前置链为 d 的技能。越往外越进阶，圆心附近是入门。
//   - 每个知识领域占一段角度（按技能数分配），相关的领域相邻，前置连线就短。
//     工具没有领域，跟着它最深的那个前置走（React 跟着“组件与状态管理”去界面开发）。
//   - 同一圈里先按扇区放，再按前置的平均角度微调顺序，最后把挤在一起的推开。
//   - 方向放在最外圈之外，角度是它要求的技能的平均方向：哪片星域亮了，就离哪个方向近。
//
// 纯函数，坐标单位是像素，原点在圆心。只依赖导出的 Roadmap，结果对同一份数据总是一样。
import type { Tree } from './tree.ts'

export interface StarPos {
  x: number
  y: number
  /** 弧度，0 指向右，逆时针为负（屏幕坐标 y 向下） */
  angle: number
  r: number
  depth: number
  sector: string
}

export interface Sector {
  id: string
  name: string
  start: number
  end: number
  /** 基础层 / 核心层 / 进阶层 / 工具 */
  layer: string
}

export interface StarLayout {
  skills: Map<string, StarPos>
  subs: Map<string, { x: number; y: number; angle: number; r: number }>
  sectors: Sector[]
  /** 每一圈的半径，下标是 depth - 1 */
  rings: number[]
  /** 方向所在的圈 */
  rimRadius: number
  /** 整张图的外接半径（含文字） */
  extent: number
}

// 扇区顺序：相邻的领域在内容上也相关，前置连线就不会横穿整张图。
// 数学 → 理论 → 算法 → 编程 → 编译 → 工程 → 工具链 → 界面 → 大模型应用 → 机器学习 → 图形学 → 高性能 → 体系结构 → 嵌入式 → 组成 → 操作系统 → 安全 → 网络 → 数据库 → 分布式
const SECTOR_ORDER = [
  'math', 'theory', 'dsa', 'programming', 'compiler', 'swe', 'tooling', 'ui', 'llm-apps', 'ml',
  'graphics', 'hpc', 'architecture', 'embedded', 'organization', 'os', 'security', 'network', 'database', 'distributed',
]

const CENTER_R = 92
const RING_GAP = 74
/** 同一圈相邻两颗星中心之间至少隔多远（像素），给文字留位置 */
const MIN_ARC = 74
/** 扇区太挤时第二行往外错开多少 */
const ROW_OFFSET = 30
const RIM_GAP = 150
const TAU = Math.PI * 2

const norm = (a: number) => ((a % TAU) + TAU) % TAU

/** 一组角度的平均方向（单位向量求和），权重可选 */
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

/**
 * 把一圈上的角度推开，保证相邻至少 minGap。圆形的，首尾相接。
 * 不在同一行（row 不同，半径错开）的两颗星可以靠得近一些。
 */
function relax(items: { angle: number; row?: number }[], minGap: number, sameRowOnly = 1) {
  if (items.length < 2) return
  const n = items.length
  const need = (a: { row?: number }, b: { row?: number }) => (a.row === b.row ? minGap : minGap * sameRowOnly)
  // 一圈放不下时，平均分
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

  // 1. 深度：由数据库视图 skill_depth 算好带在数据里
  const depth = new Map(skills.map((s) => [s.id, s.depth]))
  const depthOf = (id: string) => depth.get(id)!

  // 2. 扇区：知识点用自己的领域；工具跟着最深的前置走
  const sectorOf = new Map<string, string>()
  const sectorFor = (id: string): string => {
    const known = sectorOf.get(id)
    if (known) return known
    const s = tree.skill(id)
    let sec: string
    if (s.areaId) sec = s.areaId
    else {
      const pre = [...s.prerequisites].sort((a, b) => depthOf(b) - depthOf(a) || (tree.skill(a).kind === 'concept' ? -1 : 1))
      sec = pre.length ? sectorFor(pre[0]) : 'tooling'
    }
    sectorOf.set(id, sec)
    return sec
  }
  skills.forEach((s) => sectorFor(s.id))

  // 3. 扇区角度：按技能数分，每个扇区再加一点留白；从正上方顺时针排
  const order = [...SECTOR_ORDER, ...tree.roadmap.areas.map((a) => a.id).filter((id) => !SECTOR_ORDER.includes(id))]
  const counts = new Map(order.map((id) => [id, skills.filter((s) => sectorOf.get(s.id) === id).length]))
  const pad = 1.2
  const total = order.reduce((n, id) => n + counts.get(id)! + pad, 0)
  const sectors: Sector[] = []
  let cursor = -Math.PI / 2
  for (const id of order) {
    const span = ((counts.get(id)! + pad) / total) * TAU
    const area = tree.areas.get(id)!
    sectors.push({ id, name: area.name, start: cursor, end: cursor + span, layer: tree.layers.get(area.layerId)!.name })
    cursor += span
  }

  // 4. 每圈半径：至少比上一圈远 RING_GAP 的一大半，并且周长够放下这圈的星
  const maxDepth = Math.max(...depth.values())
  const perRing = Array.from({ length: maxDepth }, (_, i) => skills.filter((s) => depth.get(s.id) === i + 1))
  const rings: number[] = []
  perRing.forEach((list, i) => {
    const base = CENTER_R + i * RING_GAP
    const need = (list.length * MIN_ARC) / TAU
    const prev = i ? rings[i - 1] + RING_GAP * 0.8 + ROW_OFFSET : 0
    rings.push(Math.max(base, need * 0.7, prev))
  })

  // 5. 一圈一圈从里往外放
  const pos = new Map<string, StarPos>()
  perRing.forEach((list, i) => {
    const r = rings[i]
    const items: { id: string; angle: number; row: number }[] = []
    // 按扇区分组，组内按前置的平均角度排序，再在扇区里均匀铺开。
    // 扇区太窄放不下时，星交错排成内外两行。
    for (const sec of sectors) {
      const mine = list.filter((s) => sectorOf.get(s.id) === sec.id)
      if (!mine.length) continue
      const crowded = mine.length * (MIN_ARC / r) > (sec.end - sec.start) * 1.05
      const keyed = mine.map((s) => {
        const pre = s.prerequisites.map((p) => pos.get(p)!).filter(Boolean)
        const pull = pre.length ? circularMean(pre.map((p) => p.angle)) : (sec.start + sec.end) / 2
        // 把前置方向换算到扇区内的相对位置，用来排序
        let rel = norm(pull - sec.start)
        if (rel > Math.PI) rel -= TAU
        return { id: s.id, rel }
      }).sort((a, b) => a.rel - b.rel)
      const span = sec.end - sec.start
      keyed.forEach((k, j) => {
        items.push({ id: k.id, angle: norm(sec.start + (span * (j + 0.5)) / keyed.length), row: crowded ? j % 2 : 0 })
      })
    }
    relax(items, MIN_ARC / r, 0.5)
    for (const it of items) {
      const a = it.angle
      const rr = r + (it.row ? ROW_OFFSET : 0)
      pos.set(it.id, { x: Math.cos(a) * rr, y: Math.sin(a) * rr, angle: a, r: rr, depth: i + 1, sector: sectorOf.get(it.id)! })
    }
  })

  // 6. 方向：最外圈之外，朝它要求的技能的平均方向
  const rimRadius = rings[rings.length - 1] + RIM_GAP
  const subItems = tree.roadmap.subs.map((s) => {
    const req = [...tree.closures.get(s.id)!]
    const angles = req.map((id) => pos.get(id)!.angle)
    // 越深的技能越能代表这个方向
    const weights = req.map((id) => depth.get(id)! ** 2)
    return { id: s.id, angle: circularMean(angles, weights) }
  })
  relax(subItems, 150 / rimRadius)
  const subs = new Map(subItems.map((s) => [s.id, { x: Math.cos(s.angle) * rimRadius, y: Math.sin(s.angle) * rimRadius, angle: s.angle, r: rimRadius }]))

  return { skills: pos, subs, sectors, rings, rimRadius, extent: rimRadius + 120 }
}

/** 角度换成 SVG 圆弧路径（用来沿弧写扇区名字）。reverse 为真时从 end 画到 start，文字方向相反。 */
export function arcPath(r: number, start: number, end: number, reverse = false): string {
  const x1 = Math.cos(start) * r
  const y1 = Math.sin(start) * r
  const x2 = Math.cos(end) * r
  const y2 = Math.sin(end) * r
  const large = end - start > Math.PI ? 1 : 0
  return reverse ? `M${x2},${y2} A${r},${r} 0 ${large} 0 ${x1},${y1}` : `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
}
