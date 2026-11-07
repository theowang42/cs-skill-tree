// 技能树布局：竖着长的一棵树。每个领域的树和每个职业的天赋树都检查：确定、每个节点一根枝、一行一行往上、徽章在最上面、不太大、不穿模不叠
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from '../scripts/db.ts'
import { getRoadmap } from '../scripts/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { labelWidth, layoutTree, NODE_R, START_R, subNodeId, TIP_R, type Layout } from '../src/lib/layout.ts'

const tree = new Tree(getRoadmap(build()))

// ── 线不穿模：任何一根线都不穿过任何名字，也不穿过别的节点 ──
type Box = { l: number; r: number; t: number; b: number; who: string }
/** 把一根线的路径（M / L）采样成一串点，每 3 像素一个 */
function samplePath(d: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  const re = /([ML])([^ML]*)/g
  let cur = { x: 0, y: 0 }
  for (const m of d.matchAll(re)) {
    const n = m[2].trim().split(/[\s,]+/).map(Number)
    if (m[1] === 'M') { cur = { x: n[0], y: n[1] }; out.push(cur); continue }
    const to = { x: n[n.length - 2], y: n[n.length - 1] }
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - cur.x, to.y - cur.y) / 3))
    for (let i = 1; i <= steps; i++) out.push({ x: cur.x + ((to.x - cur.x) * i) / steps, y: cur.y + ((to.y - cur.y) * i) / steps })
    cur = to
  }
  return out
}

/** 一张图上的全部名字框和节点圆：技能、职业、“你” */
function shapes(l: Layout, skills: string[], subs: string[]) {
  const at = (id: string) => l.nodes.get(id)!
  const labels: Box[] = []
  const circles: { x: number; y: number; r: number; who: string }[] = []
  for (const id of skills) {
    const n = at(id)
    const s = tree.skill(id)
    const w = labelWidth(s.name) / 2 + 3
    labels.push({ l: n.x - w, r: n.x + w, t: n.y + NODE_R + 7, b: n.y + NODE_R + 25, who: `${s.name} 的名字` })
    circles.push({ x: n.x, y: n.y, r: NODE_R + 2, who: s.name })
  }
  for (const id of subs) {
    const n = at(subNodeId(id))
    const name = tree.subs.get(id)!.name
    const w = Math.max((labelWidth(name) * 15) / 14, 100) / 2 + 3
    labels.push({ l: n.x - w, r: n.x + w, t: n.y - TIP_R - 63, b: n.y - TIP_R - 27, who: `${name} 的名字和进度` })
    circles.push({ x: n.x, y: n.y, r: TIP_R + 8, who: name })
  }
  circles.push({ x: 0, y: 0, r: START_R + 6, who: '“你”' })
  return { labels, circles }
}

/** 线穿过的名字和节点 */
function crossings(l: Layout, skills: string[], subs: string[]): string[] {
  const { labels, circles } = shapes(l, skills, subs)
  const hits: string[] = []
  for (const e of l.edges) {
    const pts = samplePath(e.d)
    const box = labels.find((b) => pts.some((p) => p.x > b.l && p.x < b.r && p.y > b.t && p.y < b.b))
    if (box) hits.push(`${e.from} → ${e.to} 穿过 ${box.who}`)
    const c = circles.find((c) => pts.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < c.r))
    if (c) hits.push(`${e.from} → ${e.to} 穿过 ${c.who}`)
  }
  return hits
}

/** 互相叠在一起的名字和节点（同一个技能自己的名字和节点不算） */
function overlaps(l: Layout, skills: string[], subs: string[]): string[] {
  const { labels, circles } = shapes(l, skills, subs)
  const rs = [
    ...labels.map((b, i) => ({ ...b, owner: i })),
    ...circles.map((c, i) => ({ l: c.x - c.r, r: c.x + c.r, t: c.y - c.r, b: c.y + c.r, who: c.who, owner: i })),
  ]
  const hits: string[] = []
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i]
    const b = rs[j]
    if (a.owner === b.owner) continue
    if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) hits.push(`${a.who} 和 ${b.who}`)
  }
  return hits
}

/** 要检查的每一张图：9 个领域的树，加 17 个职业的天赋树 */
const views = [
  ...tree.roadmap.areas.map((a) => ({ name: a.name, view: { area: a.id }, skills: a.skillIds, subs: tree.roadmap.subs.filter((s) => a.skillIds.includes(s.anchor)).map((s) => s.id) })),
  ...tree.roadmap.subs.map((sub) => ({ name: sub.name, view: { career: sub.id }, skills: [...tree.closures.get(sub.id)!], subs: [sub.id] })),
].map((v) => ({ ...v, l: layoutTree(tree, v.view) }))

test('结果每次一样；要画的技能和徽章都有位置，不多不少', () => {
  for (const { name, view, l, skills, subs } of views) {
    assert.equal(l.nodes.size, skills.length + subs.length, name)
    assert.deepEqual(layoutTree(tree, view), l, name)
  }
})

test('是一棵树：每个技能一根枝连主前置（主前置不在这棵树里就连“你”，并记下来自哪里），徽章连到它挂的技能', () => {
  for (const { name, l, skills, subs } of views) {
    const into = new Map(l.edges.map((e) => [e.to, e.from]))
    for (const id of skills) {
      const p = tree.skill(id).parent
      const inside = p !== null && skills.includes(p)
      assert.equal(into.get(id), inside ? p : 'root', `${name}: ${id}`)
      assert.equal(l.outside.get(id), inside || !p ? undefined : p, `${name}: ${id} 来自哪里`)
    }
    for (const id of subs) assert.equal(into.get(subNodeId(id)), tree.subs.get(id)!.anchor, `${name}: ${id}`)
    assert.equal(l.edges.length, skills.length + subs.length, name)
  }
})

test('大部分节点只有一个孩子：是一条条链，只在关键节点分叉', () => {
  const kids = new Map<string, number>()
  for (const s of tree.roadmap.skills) if (s.parent) kids.set(s.parent, (kids.get(s.parent) ?? 0) + 1)
  const forks = [...kids.values()].filter((n) => n > 2).length
  assert.ok(forks <= tree.roadmap.skills.length * 0.13, `${forks} 个节点分出三根以上`)
})

test('一行一行往上：孩子正好在父亲上面一行，行距处处一样；徽章都在最上面一行', () => {
  for (const { name, l, skills, subs } of views) {
    const y = (id: string) => l.nodes.get(id)!.y
    const gaps = new Set(skills.filter((id) => tree.skill(id).parent && skills.includes(tree.skill(id).parent!)).map((id) => y(tree.skill(id).parent!) - y(id)))
    assert.ok(gaps.size <= 1, `${name}: 行距不一样 ${[...gaps]}`)
    if (!subs.length) continue
    const tops = new Set(subs.map((id) => y(subNodeId(id))))
    assert.equal(tops.size, 1, `${name}: 徽章不在同一行`)
    assert.ok(skills.every((id) => y(id) > [...tops][0]), `${name}: 有技能比徽章还高`)
  }
})

test('一棵树不太大：宽不超过 1400 像素，按原大小差不多放得进屏幕', () => {
  for (const { name, l } of views) {
    const { minX, minY, maxX, maxY } = l.bounds
    assert.ok(maxX - minX <= 1400 && maxY - minY <= 2400, `${name}: ${Math.round(maxX - minX)} x ${Math.round(maxY - minY)}`)
  }
})

test('线不穿过任何名字、徽章和别的节点', () => {
  for (const { name, l, skills, subs } of views) assert.deepEqual(crossings(l, skills, subs), [], name)
})

test('名字、徽章、节点和“你”互相不叠', () => {
  for (const { name, l, skills, subs } of views) assert.deepEqual(overlaps(l, skills, subs), [], name)
})
