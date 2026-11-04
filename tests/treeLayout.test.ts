// 技能树布局：确定性、不重叠、前置不在更低的行、每个节点在自己的分支列里
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { layoutTree, NODE } from '../src/lib/treeLayout.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
const layout = layoutTree(tree)

test('每个技能都有位置，同一份数据两次布局完全一样', () => {
  assert.equal(layout.nodes.size, tree.roadmap.skills.length)
  const again = layoutTree(tree)
  for (const [id, p] of layout.nodes) assert.deepEqual(again.nodes.get(id), p)
  assert.equal(layout.branches.length, tree.roadmap.areas.length)
  assert.equal(layout.bands.length, 5)
})

test('前置在更高的等级带或同一带，永远不在更低的带', () => {
  for (const s of tree.roadmap.skills) {
    const me = layout.nodes.get(s.id)!
    for (const p of s.prerequisites) assert.ok(layout.nodes.get(p)!.level <= me.level, `${p} 应该在 ${s.id} 上面`)
  }
})

test('节点互不重叠', () => {
  const all = [...layout.nodes.entries()]
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i][1]
      const b = all[j][1]
      const overlap = Math.abs(a.x - b.x) < NODE && Math.abs(a.y - b.y) < NODE
      assert.ok(!overlap, `${all[i][0]} 和 ${all[j][0]} 叠在一起`)
    }
  }
})

test('节点在自己分支的列里，知识点的分支就是它的领域', () => {
  for (const s of tree.roadmap.skills) {
    const p = layout.nodes.get(s.id)!
    if (s.areaId) assert.equal(p.branch, s.areaId)
    const b = layout.branches.find((x) => x.id === p.branch)!
    assert.ok(p.x >= b.x - 1 && p.x + NODE <= b.x + b.width + 1, `${s.id} 跑出了 ${b.name} 的列`)
    assert.ok(b.skillIds.includes(s.id))
  }
})

test('整张图的尺寸合理', () => {
  assert.ok(layout.width > 2000 && layout.width < 9000, `宽 ${layout.width}`)
  assert.ok(layout.height > 400 && layout.height < 1600, `高 ${layout.height}`)
})
