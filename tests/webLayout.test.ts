// 技能树布局：确定性、一棵从圆心往外长的树、同一圈不重叠、职业在最外圈
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { labelWidth, layoutWeb, NODE_R, RING, subNodeId } from '../src/lib/webLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
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
  for (const s of tree.roadmap.skills) {
    if (!s.parent) continue
    const d = node(s.id).depth
    assert.equal(d, node(s.parent).depth + 1)
    assert.ok(Math.abs(radius(s.id) - layout.rings[d - 1]) < 1, `${s.id} 不在第 ${d} 圈`)
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
