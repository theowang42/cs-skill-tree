// 分支技能树布局：每个技能在自己等级那一行、不重叠、分支内的前置都在上面
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { CELL, layoutBranch, ROW } from '../src/lib/branchLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))

test('每个分支：技能都在，行就是等级，互不重叠，结果稳定', () => {
  for (const area of tree.roadmap.areas) {
    const l = layoutBranch(tree, area.id)
    assert.equal(l.nodes.length, area.skillIds.length)
    for (const n of l.nodes) assert.equal(n.y, (tree.skill(n.id).level - 1) * ROW)
    for (let i = 0; i < l.nodes.length; i++) {
      for (let j = i + 1; j < l.nodes.length; j++) {
        const a = l.nodes[i]
        const b = l.nodes[j]
        assert.ok(!(a.y === b.y && Math.abs(a.x - b.x) < CELL), `${a.id} 和 ${b.id} 叠在一起`)
      }
    }
    assert.deepEqual(layoutBranch(tree, area.id), l)
  }
})

test('分支内的线都从上往下，跨分支的前置列在 external 里', () => {
  for (const area of tree.roadmap.areas) {
    const l = layoutBranch(tree, area.id)
    const y = new Map(l.nodes.map((n) => [n.id, n.y]))
    for (const e of l.edges) assert.ok(y.get(e.from)! < y.get(e.to)!, `${e.from} → ${e.to} 不是往下走`)
    for (const id of area.skillIds) {
      for (const p of tree.skill(id).prerequisites) {
        if (!area.skillIds.includes(p)) assert.ok(l.external.includes(p))
      }
    }
  }
})

test('每个技能有自己的图标，等级 1 到 5', () => {
  const icons = tree.roadmap.skills.map((s) => s.icon)
  assert.equal(new Set(icons).size, icons.length)
  for (const s of tree.roadmap.skills) assert.ok(s.level >= 1 && s.level <= 5)
})
