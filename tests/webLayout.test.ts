// 技能网布局：确定性、不重叠、越深离中心越远、领域朝自己的方向长
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { layoutWeb, NODE_R } from '../src/lib/webLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
const layout = layoutWeb(tree)
const r = (id: string) => Math.hypot(layout.nodes.get(id)!.x, layout.nodes.get(id)!.y)

test('每个技能都有位置，结果每次一样', () => {
  assert.equal(layout.nodes.size, tree.roadmap.skills.length)
  assert.deepEqual(layoutWeb(tree), layout)
})

test('节点之间留够名字的位置', () => {
  const all = [...layout.nodes.values()]
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)
      assert.ok(d > NODE_R * 3, `${all[i].id} 和 ${all[j].id} 只隔 ${d.toFixed(0)}`)
    }
  }
})

test('前置几乎总比后继离中心近', () => {
  let bad = 0
  let total = 0
  for (const s of tree.roadmap.skills) {
    for (const p of s.prerequisites) {
      total++
      if (r(p) >= r(s.id)) bad++
    }
  }
  assert.ok(bad / total < 0.1, `${bad}/${total} 条线是往里走的`)
})

test('没有前置的技能在最里面一圈附近', () => {
  const roots = tree.roadmap.skills.filter((s) => s.prerequisites.length === 0)
  const deepest = Math.max(...tree.roadmap.skills.map((s) => r(s.id)))
  for (const s of roots) assert.ok(r(s.id) < deepest * 0.45, `${s.id} 离中心太远`)
})
