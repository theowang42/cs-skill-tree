// 技能树布局：确定性、一棵从圆心往外长的树、同一圈不重叠、职业在最外圈
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from '../scripts/db.ts'
import { getRoadmap } from '../scripts/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { labelWidth, layoutWeb, NODE_R, RING, START_R, subNodeId, TIP_R } from '../src/lib/webLayout.ts'

const tree = new Tree(getRoadmap(build()))
const layout = layoutWeb(tree)
const node = (id: string) => layout.nodes.get(id)!
const radius = (id: string) => Math.hypot(node(id).x, node(id).y)
const angle = (id: string) => Math.atan2(node(id).x, -node(id).y)

test('每个技能和方向都有位置，结果每次一样', () => {
  assert.equal(layout.nodes.size, tree.roadmap.skills.length + tree.roadmap.subs.length)
  assert.deepEqual(layoutWeb(tree), layout)
})

test('是一棵树：每个节点正好一根枝，枝连的是主前置', () => {
  const into = new Map(layout.edges.map((e) => [e.to, e.from]))
  for (const s of tree.roadmap.skills) assert.equal(into.get(s.id), s.parent ?? 'root')
  for (const sub of tree.roadmap.subs) assert.equal(into.get(subNodeId(sub.id)), sub.anchor)
  // 起点从圆心发出一根
  assert.equal(layout.edges.length, tree.roadmap.skills.length + tree.roadmap.subs.length)
})

test('大部分节点只有一个孩子：是一条条链，只在关键节点分叉', () => {
  const kids = new Map<string, number>()
  for (const s of tree.roadmap.skills) if (s.parent) kids.set(s.parent, (kids.get(s.parent) ?? 0) + 1)
  const forks = [...kids.values()].filter((n) => n > 2).length
  assert.ok(forks <= tree.roadmap.skills.length * 0.13, `${forks} 个节点分出三根以上`)
})

test('三个起点都在第一圈', () => {
  const roots = tree.roadmap.skills.filter((s) => !s.parent)
  assert.deepEqual(roots.map((s) => s.id).sort(), ['calculus', 'cs61a', 'linux'].sort())
  for (const s of roots) assert.ok(Math.abs(radius(s.id) - layout.rings[0]) < 1, `${s.id} 不在第一圈`)
})

test('一圈一圈往外：孩子正好在父亲外面一圈，同一圈半径相同', () => {
  // 在第几圈（从 1 数）；不在任何一圈上是 0
  const ring = (id: string) => layout.rings.findIndex((r) => Math.abs(radius(id) - r) < 1) + 1
  for (const s of tree.roadmap.skills) {
    assert.ok(ring(s.id) > 0, `${s.id} 不在任何一圈上`)
    if (s.parent) assert.equal(ring(s.id), ring(s.parent) + 1, `${s.id} 不在 ${s.parent} 外面一圈`)
  }
  for (let i = 1; i < layout.rings.length; i++) assert.ok(layout.rings[i] - layout.rings[i - 1] >= RING - 1)
})

test('只有一个孩子的节点和孩子同一个角度，链是直的', () => {
  // 起点在第一圈平均摆开，不算
  for (const s of tree.roadmap.skills.filter((s) => s.parent)) {
    const kids = tree.roadmap.skills.filter((k) => k.parent === s.id)
    const hasTip = tree.roadmap.subs.some((x) => x.anchor === s.id)
    if (kids.length === 1 && !hasTip) assert.ok(Math.abs(angle(kids[0].id) - angle(s.id)) < 1e-3, `${s.id} → ${kids[0].id} 歪了`)
  }
})

test('任意两个技能不重叠（节点加名字）', () => {
  const box = (id: string) => {
    const n = node(id)
    const w = Math.max(NODE_R * 2, labelWidth(tree.skill(id).name)) / 2
    return { l: n.x - w, r: n.x + w, t: n.y - NODE_R, b: n.y + NODE_R + 28 }
  }
  const ids = tree.roadmap.skills.map((s) => s.id)
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = box(ids[i])
      const b = box(ids[j])
      const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
      assert.ok(!overlap, `${ids[i]} 和 ${ids[j]} 叠在一起`)
    }
  }
})

test('职业都在最外圈，彼此不挤', () => {
  const tips = tree.roadmap.subs.map((s) => subNodeId(s.id))
  const r = radius(tips[0])
  for (const t of tips) assert.ok(Math.abs(radius(t) - r) < 1)
  assert.ok(r > layout.rings[layout.rings.length - 1])
  for (let i = 0; i < tips.length; i++) for (let j = i + 1; j < tips.length; j++) {
    const d = Math.hypot(node(tips[i]).x - node(tips[j]).x, node(tips[i]).y - node(tips[j]).y)
    assert.ok(d >= 150, `${tips[i]} 和 ${tips[j]} 的名字会撞`)
  }
})

test('大模型算法工程师在正上方', () => {
  assert.ok(Math.abs(angle(subNodeId('llm-algo'))) < 1e-3)
})

// ── 线不穿模：任何一根线都不穿过任何名字，也不穿过别的节点 ──
type Box = { l: number; r: number; t: number; b: number; who: string }
/** 把一根线的路径（M / L / A，弧的圆心都在原点）采样成一串点，每 3 像素一个 */
function samplePath(d: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  const re = /([MLA])([^MLA]*)/g
  let cur = { x: 0, y: 0 }
  for (const m of d.matchAll(re)) {
    const n = m[2].trim().split(/[\s,]+/).map(Number)
    if (m[1] === 'M') { cur = { x: n[0], y: n[1] }; out.push(cur); continue }
    const to = { x: n[n.length - 2], y: n[n.length - 1] }
    if (m[1] === 'L') {
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - cur.x, to.y - cur.y) / 3))
      for (let i = 1; i <= steps; i++) out.push({ x: cur.x + ((to.x - cur.x) * i) / steps, y: cur.y + ((to.y - cur.y) * i) / steps })
    } else {
      const r = n[0]
      const a1 = Math.atan2(cur.y, cur.x)
      let da = Math.atan2(to.y, to.x) - a1
      while (da > Math.PI) da -= Math.PI * 2
      while (da <= -Math.PI) da += Math.PI * 2
      const steps = Math.max(1, Math.ceil((Math.abs(da) * r) / 3))
      for (let i = 1; i <= steps; i++) out.push({ x: r * Math.cos(a1 + (da * i) / steps), y: r * Math.sin(a1 + (da * i) / steps) })
    }
    cur = to
  }
  return out
}

test('线不穿过任何名字、徽章和别的节点', () => {
  const boxes: Box[] = []
  const circles: { x: number; y: number; r: number; who: string }[] = []
  for (const s of tree.roadmap.skills) {
    const n = node(s.id)
    const w = labelWidth(s.name) / 2 + 3
    boxes.push({ l: n.x - w, r: n.x + w, t: n.y + NODE_R + 7, b: n.y + NODE_R + 25, who: `${s.name} 的名字` })
    circles.push({ x: n.x, y: n.y, r: NODE_R + 2, who: s.name })
  }
  for (const sub of tree.roadmap.subs) {
    const n = node(subNodeId(sub.id))
    const w = Math.max((labelWidth(sub.name) * 15) / 14, 100) / 2 + 3
    boxes.push({ l: n.x - w, r: n.x + w, t: n.y - TIP_R - 63, b: n.y - TIP_R - 27, who: `${sub.name} 的名字和星级` })
    circles.push({ x: n.x, y: n.y, r: TIP_R + 8, who: sub.name })
  }
  circles.push({ x: 0, y: 0, r: START_R + 6, who: '圆心' })
  const hits: string[] = []
  for (const e of layout.edges) {
    const pts = samplePath(e.d)
    const box = boxes.find((b) => pts.some((p) => p.x > b.l && p.x < b.r && p.y > b.t && p.y < b.b))
    if (box) hits.push(`${e.from} → ${e.to} 穿过 ${box.who}`)
    const c = circles.find((c) => pts.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < c.r))
    if (c) hits.push(`${e.from} → ${e.to} 穿过 ${c.who}`)
  }
  assert.deepEqual(hits, [])
})

test('名字、徽章、节点、圆心互相不叠', () => {
  type R = { l: number; r: number; t: number; b: number; who: string; owner: string }
  const rs: R[] = []
  for (const s of tree.roadmap.skills) {
    const n = node(s.id)
    const w = labelWidth(s.name) / 2 + 3
    rs.push({ l: n.x - w, r: n.x + w, t: n.y + NODE_R + 7, b: n.y + NODE_R + 25, who: `${s.name} 的名字`, owner: s.id })
    rs.push({ l: n.x - NODE_R - 2, r: n.x + NODE_R + 2, t: n.y - NODE_R - 2, b: n.y + NODE_R + 2, who: s.name, owner: s.id })
  }
  for (const sub of tree.roadmap.subs) {
    const n = node(subNodeId(sub.id))
    const w = Math.max((labelWidth(sub.name) * 15) / 14, 100) / 2 + 3
    rs.push({ l: n.x - w, r: n.x + w, t: n.y - TIP_R - 63, b: n.y - TIP_R - 27, who: `${sub.name} 的名字`, owner: sub.id })
    rs.push({ l: n.x - TIP_R - 8, r: n.x + TIP_R + 8, t: n.y - TIP_R - 8, b: n.y + TIP_R + 8, who: sub.name, owner: sub.id })
  }
  rs.push({ l: -START_R - 6, r: START_R + 6, t: -START_R - 6, b: START_R + 6, who: '圆心', owner: 'center' })
  const hits: string[] = []
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i]
    const b = rs[j]
    if (a.owner === b.owner) continue
    if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) hits.push(`${a.who} 和 ${b.who}`)
  }
  assert.deepEqual(hits, [])
})
