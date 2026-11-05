// 技能树布局：确定性、一棵从下往上长的树、同一排不重叠、方向在最上面一排
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { labelWidth, layoutWeb, NODE_R, ROW, subNodeId } from '../src/lib/webLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
const layout = layoutWeb(tree)
const node = (id: string) => layout.nodes.get(id)!

test('每个技能和方向都有位置，结果每次一样', () => {
  assert.equal(layout.nodes.size, tree.roadmap.skills.length + tree.roadmap.subs.length)
  assert.deepEqual(layoutWeb(tree), layout)
})

test('是一棵树：每个节点正好一根枝，枝连的是主前置', () => {
  const into = new Map(layout.edges.map((e) => [e.to, e.from]))
  for (const s of tree.roadmap.skills) assert.equal(into.get(s.id), s.parent ?? undefined)
  for (const sub of tree.roadmap.subs) assert.equal(into.get(subNodeId(sub.id)), sub.anchor)
  // 其余前置不画线：只有树上的枝
  assert.equal(layout.edges.length, tree.roadmap.skills.filter((s) => s.parent).length + tree.roadmap.subs.length)
})

test('大部分节点只有一个孩子：是一条条链，只在关键节点分叉', () => {
  const kids = new Map<string, number>()
  for (const s of tree.roadmap.skills) if (s.parent) kids.set(s.parent, (kids.get(s.parent) ?? 0) + 1)
  const forks = [...kids.values()].filter((n) => n > 2).length
  assert.ok(forks <= tree.roadmap.skills.length * 0.13, `${forks} 个节点分出三根以上`)
})

test('从下往上长：起点在最下面一排，孩子正好在父亲上面一排', () => {
  for (const s of tree.roadmap.skills) {
    if (!s.parent) assert.equal(node(s.id).y, 0, `${s.id} 是起点却不在最下面`)
    else assert.equal(node(s.parent).y - node(s.id).y, ROW, `${s.id} 不在 ${s.parent} 上面一排`)
  }
})

test('只有一个孩子的节点和孩子对齐，链是直的', () => {
  for (const s of tree.roadmap.skills) {
    const kids = tree.roadmap.skills.filter((k) => k.parent === s.id)
    if (kids.length === 1) assert.ok(Math.abs(node(kids[0].id).x - node(s.id).x) < 0.5, `${s.id} → ${kids[0].id} 歪了`)
  }
})

test('同一排的名字不重叠', () => {
  const rows = new Map<number, { id: string; x: number; w: number }[]>()
  for (const s of tree.roadmap.skills) {
    const n = node(s.id)
    const list = rows.get(n.y) ?? []
    list.push({ id: s.id, x: n.x, w: Math.max(NODE_R * 2, labelWidth(s.name)) })
    rows.set(n.y, list)
  }
  for (const list of rows.values()) {
    list.sort((a, b) => a.x - b.x)
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].x - list[i].w / 2 - (list[i - 1].x + list[i - 1].w / 2)
      assert.ok(gap >= 10, `${list[i - 1].id} 和 ${list[i].id} 挨得太近（${gap.toFixed(0)}）`)
    }
  }
})

test('方向都在最上面一排，彼此不挤', () => {
  const tips = tree.roadmap.subs.map((s) => node(subNodeId(s.id)))
  const top = Math.min(...[...layout.nodes.values()].map((n) => n.y))
  for (const t of tips) assert.equal(t.y, top)
  const xs = tips.map((t) => t.x).sort((a, b) => a - b)
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 110, '两个方向的名字会撞')
})

test('主线在中间：AI Infra 在 AI 产品的右边、底层系统的左边', () => {
  assert.ok(node('pytorch').x > node('react').x)
  assert.ok(node('pytorch').x < node('kernel').x)
})

test('起点排成整齐的一排：等距，最大的子树在中间', () => {
  const roots = tree.roadmap.skills.filter((s) => !s.parent).map((s) => node(s.id)).sort((a, b) => a.x - b.x)
  const gaps = roots.slice(1).map((r, i) => r.x - roots[i].x)
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) < 0.5, `起点间距不一样：${gaps.map((x) => x.toFixed(0)).join('、')}`)
  assert.equal(roots[Math.floor(roots.length / 2)].id, 'cs61a')
})
