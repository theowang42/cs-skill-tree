// 技能网的布局：地基在中心，每个领域朝一个方向长出去，越深离中心越远。
//
//   - 目标半径由深度决定（从根出发的最长前置链），目标角度由领域决定；地基朝着它喂养的那些领域。
//   - 用一个确定性的力导向模拟把节点推到不重叠、又不排成网格的位置：
//     互相排斥、沿边轻轻拉近、径向和角度各有一根弹簧拉回目标。随机数是固定种子，结果每次一样。
//   - 线用三次贝塞尔：从父节点沿径向往外长，再弯向子节点，像树枝。
//
// 纯函数，坐标单位是像素，原点在中心。
import type { Tree } from './tree.ts'

export const NODE_R = 27

/** 每个领域朝哪个方向长（度，0 是正右，-90 是正上）和占多宽 */
const SECTORS: Record<string, { angle: number; spread: number }> = {
  infra: { angle: -90, spread: 70 },
  systems: { angle: -168, spread: 56 },
  product: { angle: -12, spread: 62 },
  quant: { angle: 42, spread: 26 },
  chain: { angle: 82, spread: 18 },
  security: { angle: 128, spread: 30 },
  robotics: { angle: 172, spread: 18 },
}

export interface WebNode {
  id: string
  x: number
  y: number
  depth: number
  area: string
}

export interface WebEdge {
  from: string
  to: string
  d: string
}

export interface AreaLabel {
  id: string
  name: string
  x: number
  y: number
}

export interface WebLayout {
  nodes: Map<string, WebNode>
  edges: WebEdge[]
  areas: AreaLabel[]
  /** 中心到每个根的“树干” */
  trunks: string[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

const rad = (deg: number) => (deg * Math.PI) / 180

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function circularMean(angles: number[]): number {
  let x = 0
  let y = 0
  for (const a of angles) {
    x += Math.cos(a)
    y += Math.sin(a)
  }
  return Math.atan2(y, x)
}

export function layoutWeb(tree: Tree): WebLayout {
  const skills = tree.roadmap.skills
  const random = rng(7)
  const ringR = (depth: number) => 150 + (depth - 1) * 118

  // 1. 每个节点的目标角度：领域方向 + 在领域里摊开；地基朝它所有后代领域的平均方向
  const sectorAngle = (area: string) => rad(SECTORS[area]?.angle ?? 0)
  const targetAngle = new Map<string, number>()
  const byArea = new Map<string, string[]>()
  for (const s of skills) byArea.set(s.areaId!, [...(byArea.get(s.areaId!) ?? []), s.id])
  // 按深度从里往外定角度：领域方向和同领域父节点的方向各占一半，枝条就会顺着父节点长出去
  const order = [...skills].sort((a, b) => a.depth - b.depth)
  const indexInArea = new Map<string, number>()
  for (const [, ids] of byArea) ids.forEach((id, i) => indexInArea.set(id, i))
  for (const s of order) {
    const area = s.areaId!
    if (area === 'base') continue
    const sec = SECTORS[area] ?? { angle: 0, spread: 30 }
    const n = byArea.get(area)!.length
    const t = n === 1 ? 0 : indexInArea.get(s.id)! / (n - 1) - 0.5
    const own = rad(sec.angle + t * sec.spread * 0.6)
    const parents = s.prerequisites.filter((p) => tree.skill(p).areaId === area && targetAngle.has(p)).map((p) => targetAngle.get(p)!)
    targetAngle.set(s.id, parents.length ? circularMean([own, circularMean(parents)]) : own)
  }
  for (const id of byArea.get('base') ?? []) {
    const reach = [...tree.descendants(id)].map((d) => tree.skill(d).areaId!).filter((a) => a !== 'base')
    targetAngle.set(id, reach.length ? circularMean(reach.map(sectorAngle)) : random() * Math.PI * 2)
  }
  // 同一个方向上的地基节点别挤在一起：按目标角度排好再均匀摊开一点
  const base = [...(byArea.get('base') ?? [])].sort((a, b) => targetAngle.get(a)! - targetAngle.get(b)!)

  // 2. 初始位置：目标半径和角度，加一点固定种子的抖动
  const pos = new Map<string, { x: number; y: number }>()
  for (const s of skills) {
    const a = targetAngle.get(s.id)! + (random() - 0.5) * 0.25
    const r = ringR(s.depth) + (random() - 0.5) * 30
    pos.set(s.id, { x: Math.cos(a) * r, y: Math.sin(a) * r })
  }

  // 3. 力导向：排斥、边的弹簧、径向和角度的弹簧
  const ids = skills.map((s) => s.id)
  const edges = skills.flatMap((s) => s.prerequisites.map((p) => [p, s.id] as const))
  const MIN = 128
  for (let iter = 0; iter < 700; iter++) {
    const cool = 1 - iter / 700
    const disp = new Map(ids.map((id) => [id, { x: 0, y: 0 }]))
    // 排斥：只在太近时推开，留出节点和名字的位置
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!
        const b = pos.get(ids[j])!
        let dx = b.x - a.x
        let dy = b.y - a.y
        let d = Math.hypot(dx, dy)
        if (d < 0.01) {
          dx = random() - 0.5
          dy = random() - 0.5
          d = Math.hypot(dx, dy)
        }
        if (d < MIN) {
          const push = ((MIN - d) / d) * 0.5
          disp.get(ids[i])!.x -= dx * push
          disp.get(ids[i])!.y -= dy * push
          disp.get(ids[j])!.x += dx * push
          disp.get(ids[j])!.y += dy * push
        }
      }
    }
    // 边：前置和后继轻轻拉近，让枝条连贯
    for (const [p, c] of edges) {
      const a = pos.get(p)!
      const b = pos.get(c)!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const pull = ((d - 130) / d) * 0.03
      disp.get(p)!.x += dx * pull
      disp.get(p)!.y += dy * pull
      disp.get(c)!.x -= dx * pull
      disp.get(c)!.y -= dy * pull
    }
    // 径向和角度：拉回目标，但不拉死，保留一点错落
    for (const s of skills) {
      const p = pos.get(s.id)!
      const r = Math.hypot(p.x, p.y) || 1
      const a = Math.atan2(p.y, p.x)
      const tr = ringR(s.depth)
      const ta = targetAngle.get(s.id)!
      let da = ta - a
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      const nr = r + (tr - r) * 0.14
      const na = a + da * (s.areaId === 'base' ? 0.03 : 0.07)
      const d = disp.get(s.id)!
      d.x += Math.cos(na) * nr - p.x
      d.y += Math.sin(na) * nr - p.y
    }
    for (const id of ids) {
      const p = pos.get(id)!
      const d = disp.get(id)!
      const len = Math.hypot(d.x, d.y)
      const cap = 30 * cool + 2
      const k = len > cap ? cap / len : 1
      p.x += d.x * k
      p.y += d.y * k
    }
  }
  void base

  const nodes = new Map<string, WebNode>()
  for (const s of skills) {
    const p = pos.get(s.id)!
    nodes.set(s.id, { id: s.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, depth: s.depth, area: s.areaId! })
  }

  // 4. 线：从父节点沿径向长出去，再弯到子节点
  const radial = (n: WebNode) => {
    const r = Math.hypot(n.x, n.y) || 1
    return { x: n.x / r, y: n.y / r }
  }
  const webEdges: WebEdge[] = edges.map(([p, c]) => {
    const a = nodes.get(p)!
    const b = nodes.get(c)!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 1
    const ux = dx / d
    const uy = dy / d
    // 两头各让出节点的半径
    const x1 = a.x + ux * (NODE_R + 3)
    const y1 = a.y + uy * (NODE_R + 3)
    const x2 = b.x - ux * (NODE_R + 3)
    const y2 = b.y - uy * (NODE_R + 3)
    // 控制点在弦上，再往外侧（远离中心）弯一点：像树枝向外长，但绝不绕圈
    const ra = radial(a)
    const rb = radial(b)
    const bend = Math.min(40, d * 0.18)
    const c1x = x1 + (x2 - x1) * 0.33 + ra.x * bend
    const c1y = y1 + (y2 - y1) * 0.33 + ra.y * bend
    const c2x = x1 + (x2 - x1) * 0.7 + rb.x * bend * 0.4
    const c2y = y1 + (y2 - y1) * 0.7 + rb.y * bend * 0.4
    const f = (v: number) => Math.round(v * 10) / 10
    return { from: p, to: c, d: `M${f(x1)},${f(y1)} C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(x2)},${f(y2)}` }
  })

  // 5. 领域名：放在这个领域最外面那个节点再往外一点
  const areas: AreaLabel[] = tree.roadmap.areas.filter((a) => a.id !== 'base').map((a) => {
    const pts = a.skillIds.map((id) => nodes.get(id)!)
    const far = Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))
    const ang = circularMean(pts.map((p) => Math.atan2(p.y, p.x)))
    return { id: a.id, name: a.name, x: Math.cos(ang) * (far + 78), y: Math.sin(ang) * (far + 78) }
  })

  const trunks = skills.filter((s) => s.prerequisites.length === 0).map((s) => s.id)
  const all = [...nodes.values()]
  const pad = 60
  const xs = [...all.map((n) => n.x), ...areas.map((a) => a.x)]
  const ys = [...all.map((n) => n.y), ...areas.map((a) => a.y)]
  return {
    nodes,
    edges: webEdges,
    areas,
    trunks,
    bounds: { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad },
  }
}
