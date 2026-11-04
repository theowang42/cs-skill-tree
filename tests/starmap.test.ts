// 星图布局：确定性、不重叠、前置在内圈、扇区不交叉
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { layoutStarMap } from '../src/lib/starmap.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))
const layout = layoutStarMap(tree)

test('每颗星都有位置，同一份数据两次布局完全一样', () => {
  assert.equal(layout.skills.size, tree.roadmap.skills.length)
  assert.equal(layout.subs.size, tree.roadmap.subs.length)
  const again = layoutStarMap(tree)
  for (const [id, p] of layout.skills) assert.deepEqual(again.skills.get(id), p)
})

test('前置不在更靠外的圈', () => {
  for (const s of tree.roadmap.skills) {
    const me = layout.skills.get(s.id)!
    for (const p of s.prerequisites) assert.ok(layout.skills.get(p)!.level <= me.level, `${p} 应该不比 ${s.id} 靠外`)
  }
})

test('任意两颗星至少隔 40 像素，信标之间至少隔 100 像素', () => {
  const stars = [...layout.skills.entries()]
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i][1]
      const b = stars[j][1]
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 40, `${stars[i][0]} 和 ${stars[j][0]} 挤在一起`)
    }
  }
  const subs = [...layout.subs.values()]
  for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
    assert.ok(Math.hypot(subs[i].x - subs[j].x, subs[i].y - subs[j].y) >= 100)
  }
})

test('扇区首尾相接盖满一圈，每颗星都在自己领域的星云里', () => {
  const total = layout.sectors.reduce((n, s) => n + (s.end - s.start), 0)
  assert.ok(Math.abs(total - Math.PI * 2) < 1e-6)
  for (let i = 1; i < layout.sectors.length; i++) assert.ok(Math.abs(layout.sectors[i].start - layout.sectors[i - 1].end) < 1e-9)
  for (const s of tree.roadmap.skills) {
    const p = layout.skills.get(s.id)!
    if (s.areaId) assert.equal(p.sector, s.areaId)
    if (p.level === 1) continue // 第 1 圈是共用的起点，不分星云
    const cloud = layout.clouds.find((c) => c.sector === p.sector && c.level === p.level)
    assert.ok(cloud, `${s.id} 没有星云`)
    let d = Math.abs(p.angle - cloud!.angle) % (Math.PI * 2)
    if (d > Math.PI) d = Math.PI * 2 - d
    assert.ok(d * p.r <= cloud!.rx + 1, `${s.id} 在星云外面`)
  }
  // 同一圈上的星云按扇区顺序排，不交叉
  for (let lv = 2; lv <= 5; lv++) {
    const cs = layout.clouds.filter((c) => c.level === lv)
    const order = layout.sectors.map((s) => s.id)
    for (let i = 1; i < cs.length; i++) assert.ok(order.indexOf(cs[i].sector) > order.indexOf(cs[i - 1].sector))
  }
})

test('方向信标朝向它要求的技能', () => {
  for (const sub of tree.roadmap.subs) {
    const b = layout.subs.get(sub.id)!
    const req = [...tree.closures.get(sub.id)!].map((id) => layout.skills.get(id)!)
    // 信标方向和这些技能平均方向的夹角不超过 60°
    const mx = req.reduce((n, p) => n + Math.cos(p.angle) * p.level ** 2, 0)
    const my = req.reduce((n, p) => n + Math.sin(p.angle) * p.level ** 2, 0)
    const mean = Math.atan2(my, mx)
    let diff = Math.abs(b.angle - mean) % (Math.PI * 2)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    assert.ok(diff < Math.PI / 3, `${sub.id} 偏了 ${(diff * 180 / Math.PI).toFixed(0)}°`)
  }
})
