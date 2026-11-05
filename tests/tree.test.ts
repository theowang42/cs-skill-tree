// 前端用的 JS 逻辑（src/lib/tree.ts）和数据库视图必须算出一样的结果
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { createLearner, readinessAll, setGoal, setStatuses, skillStates, summary } from '../server/learners.ts'
import { Tree, computeStates, frontier, missingPrerequisites, readiness, litDescendants } from '../src/lib/tree.ts'
import type { Progress, Status } from '../src/types.ts'
import { freshDb, rng } from './helpers.ts'

const db = freshDb()
const roadmap = getRoadmap(db)
const tree = new Tree(roadmap)

test('导出的树引用都对得上', () => {
  const ids = new Set(roadmap.skills.map((s) => s.id))
  for (const s of roadmap.skills) {
    for (const p of s.prerequisites) assert.ok(ids.has(p))
    for (const d of s.dependents) assert.ok(tree.skill(d).prerequisites.includes(s.id))
  }
  const placed = [...roadmap.areas.flatMap((a) => a.skillIds), ...roadmap.toolGroups.flatMap((g) => g.skillIds)]
  assert.equal(placed.length, ids.size)
  assert.equal(new Set(placed).size, ids.size)
  for (const sub of roadmap.subs) {
    for (const r of sub.requirements) assert.ok(tree.closures.get(sub.id)!.has(r))
    for (const c of sub.choices) for (const o of c.options) assert.ok(ids.has(o))
  }
})

test('星图的圈数：前置一定在更靠内的圈，没有前置的在第 1 圈，并且和 JS 算的一致', () => {
  const depth = new Map<string, number>()
  const calc = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!
    const pre = tree.skill(id).prerequisites
    const d = pre.length ? 1 + Math.max(...pre.map(calc)) : 1
    depth.set(id, d)
    return d
  }
  for (const s of roadmap.skills) {
    assert.equal(s.depth, calc(s.id), s.id)
    for (const p of s.prerequisites) assert.ok(tree.skill(p).depth < s.depth, `${p} 应该比 ${s.id} 靠内`)
  }
})

test('等级：1 到 5，前置不会在更高的等级，每级都有技能', () => {
  const counts = [0, 0, 0, 0, 0, 0]
  for (const s of roadmap.skills) {
    assert.ok(s.level >= 1 && s.level <= 5, `${s.id} 等级 ${s.level}`)
    counts[s.level]++
    for (const p of s.prerequisites) assert.ok(tree.skill(p).level <= s.level, `${p} 不该比 ${s.id} 高级`)
  }
  // 最里面一级只有几门起点课，其余每级都要有一批
  assert.ok(counts[1] >= 3, `第 1 级只有 ${counts[1]} 个技能`)
  for (let l = 2; l <= 5; l++) assert.ok(counts[l] >= 5, `第 ${l} 级只有 ${counts[l]} 个技能`)
})

test('领域里的行号：同领域的前置一定在更靠上的行', () => {
  for (const s of roadmap.skills) {
    for (const p of s.prerequisites) {
      const q = tree.skill(p)
      if ((q.areaId ?? q.groupId) === (s.areaId ?? s.groupId)) assert.ok(q.tier < s.tier, `${p} 应该在 ${s.id} 上面`)
    }
  }
})

// 随机生成很多份进度，分别用 SQL 视图和 JS 算，结果必须一模一样
test('随机进度下，三种状态、能力边界、方向就绪度在 SQL 和 JS 里一致', () => {
  const random = rng(42)
  const ids = roadmap.skills.map((s) => s.id)
  for (let round = 0; round < 25; round++) {
    const learner = createLearner(db)
    const density = random()
    const changes: Record<string, Status> = {}
    // 一半轮次按依赖顺序点亮（更像真人），另一半完全随机
    const ordered = round % 2 === 0 ? tree.topoSort(ids) : ids
    for (const id of ordered) {
      const r = random()
      if (r < density) changes[id] = 'done'
    }
    setStatuses(db, learner.id, changes)
    const goal = roadmap.subs[Math.floor(random() * roadmap.subs.length)].id
    setGoal(db, learner.id, goal)

    const progress: Progress = { goalSubId: goal, skills: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, { status: v, updatedAt: '' }])) }
    const js = computeStates(tree, progress)
    const sql = skillStates(db, learner.id)
    for (const id of ids) assert.equal(js.get(id), sql[id], `第 ${round} 轮 ${id}`)

    for (const r of readinessAll(db, learner.id)) {
      const mine = readiness(tree, r.subId, progress)
      assert.equal(mine.coreTotal, r.coreTotal)
      assert.equal(mine.coreDone, r.coreDone)
      assert.equal(mine.choiceTotal, r.choiceTotal)
      assert.equal(mine.choiceDone, r.choiceDone)
      assert.ok(Math.abs(mine.percent - r.percent) < 0.051, `${r.subId} ${mine.percent} vs ${r.percent}`)
    }

    const s = summary(db, learner.id)
    const f = frontier(tree, js, goal)
    assert.deepEqual(new Set(f.map((x) => x.id)), new Set(s.frontier.map((x) => x.skillId)))
    // 目标里的边界排在前面，两边顺序一致
    const inGoal = (list: { step: number | null }[]) => list.filter((x) => x.step !== null).map((x) => x.step)
    assert.deepEqual(inGoal(f), inGoal(s.frontier))
  }
})

test('什么都没学时，边界就是所有没有前置的技能', () => {
  const states = computeStates(tree, { goalSubId: null, skills: {} })
  const roots = roadmap.skills.filter((s) => s.prerequisites.length === 0).map((s) => s.id)
  assert.deepEqual(new Set(frontier(tree, states, null).map((x) => x.id)), new Set(roots))
})

test('缺的前置按依赖顺序给出；取消点亮会提示受影响的后继', () => {
  const progress: Progress = { goalSubId: null, skills: { linux: { status: 'done', updatedAt: '' } } }
  assert.deepEqual(missingPrerequisites(tree, 'docker', progress), [])
  const deep = missingPrerequisites(tree, 'agent', { goalSubId: null, skills: {} })
  const pos = new Map(deep.map((id, i) => [id, i]))
  for (const id of deep) for (const p of tree.skill(id).prerequisites) assert.ok(pos.get(p)! < pos.get(id)!)
  const lit: Progress = { goalSubId: null, skills: { linux: { status: 'done', updatedAt: '' }, docker: { status: 'done', updatedAt: '' }, k8s: { status: 'done', updatedAt: '' } } }
  assert.deepEqual(litDescendants(tree, 'linux', lit), ['docker', 'k8s'])
})

test('把一个方向的必学和任选都点亮后，就绪度是 100%', () => {
  for (const sub of roadmap.subs) {
    const skills: Progress['skills'] = {}
    for (const p of sub.plan) skills[p.skillId] = { status: 'done', updatedAt: '' }
    for (const c of sub.choices) skills[c.options[0]] = { status: 'done', updatedAt: '' }
    assert.equal(readiness(tree, sub.id, { goalSubId: null, skills }).percent, 100, sub.id)
  }
})
