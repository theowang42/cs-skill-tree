// 技能树布局：确定性、不重叠、每个节点一根枝、越深离中心越远
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { layoutWeb, NODE_R, subNodeId } from '../src/lib/webLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
const layout = layoutWeb(tree)
const r = (id: string) => Math.hypot(layout.nodes.get(id)!.x, layout.nodes.get(id)!.y)

test('每个技能和方向都有位置，结果每次一样', () => {
  assert.equal(layout.nodes.size, tree.roadmap.skills.length + tree.roadmap.subs.length)
  assert.deepEqual(layoutWeb(tree), layout)
})

test('是一棵树：每个节点正好一根枝，枝连的是主前置', () => {
  assert.equal(layout.edges.length, layout.nodes.size)
  const into = new Map(layout.edges.map((e) => [e.to, e.from]))
  for (const s of tree.roadmap.skills) assert.equal(into.get(s.id), s.parent ?? 'root')
  for (const sub of tree.roadmap.subs) assert.equal(into.get(subNodeId(sub.id)), sub.anchor)
  // 其余前置不画在树上，但都留着选中时用
  const extra = tree.roadmap.skills.reduce((n, s) => n + s.prerequisites.length - (s.parent ? 1 : 0), 0)
  assert.equal(layout.extra.length, extra)
})

test('大部分节点只有一个孩子：是一条条链，只在关键节点分叉', () => {
  const kids = new Map<string, number>()
  for (const e of layout.edges) if (!e.to.startsWith('sub:')) kids.set(e.from, (kids.get(e.from) ?? 0) + 1)
  const forks = [...kids.values()].filter((n) => n > 2).length
  assert.ok(forks <= 8, `${forks} 个节点分出三根以上`)
})

test('节点之间留够名字的位置', () => {
  const all = [...layout.nodes.values()]
  const anchorOf = new Map(tree.roadmap.subs.map((s) => [subNodeId(s.id), s.anchor]))
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i].id, all[j].id]
      if (anchorOf.get(a) === b || anchorOf.get(b) === a) continue
      const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)
      assert.ok(d > NODE_R * 2.6, `${a} 和 ${b} 只隔 ${d.toFixed(0)}`)
    }
  }
})

test('树上的孩子总比父亲离中心远', () => {
  for (const e of layout.edges) if (e.from !== 'root') assert.ok(r(e.to) > r(e.from), `${e.from} → ${e.to} 往里走了`)
})

test('主线 AI Infra 朝上', () => {
  for (const id of ['pytorch', 'gpt', 'vllm']) assert.ok(layout.nodes.get(id)!.y < 0, `${id} 不在上半边`)
})
