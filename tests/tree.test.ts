// 前端的纯逻辑：状态、规则、进度文件、分享链接
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from '../scripts/db.ts'
import { getRoadmap } from '../scripts/roadmap.ts'
import { Tree, clean, cleanSteps, computeStates, frontier, plan, subProgress } from '../src/lib/tree.ts'
import { parseFile, toFile } from '../src/lib/progress.ts'
import { decodeShare, encodeShare } from '../src/lib/share.ts'

const tree = new Tree(getRoadmap(build()))

test('什么都没点亮时，能点亮的就是所有没有前置的技能', () => {
  const roots = tree.roadmap.skills.filter((s) => !s.prerequisites.length).map((s) => s.id)
  assert.deepEqual(new Set(frontier(tree, computeStates(tree, new Set()))), new Set(roots))
})

test('状态：点亮的是 done；前置都点亮了是 available；否则 locked', () => {
  const states = computeStates(tree, new Set(['linux']))
  assert.equal(states.get('linux'), 'done')
  assert.equal(states.get('docker'), 'available')
  assert.equal(states.get('k8s'), 'locked')
})

test('规则：前置都点亮了才能点亮；熄灭前置，依赖它的一起熄灭', () => {
  // 前置没点亮：挡下，一个都不改
  const blocked = plan(tree, new Set(), { docker: true })
  assert.deepEqual(blocked.blocked, { id: 'docker', missing: ['linux'] })
  assert.deepEqual(blocked.next, new Set())
  // 同一批里先点亮前置就行，顺序随便
  assert.deepEqual(plan(tree, new Set(), { docker: true, linux: true }).next, new Set(['docker', 'linux']))
  // 熄灭 Linux：Docker、Git、GitHub 一起熄灭，并报告连带的
  const off = plan(tree, new Set(['linux', 'docker', 'git', 'github']), { linux: false })
  assert.deepEqual(off.next, new Set())
  assert.deepEqual(off.cascaded.sort(), ['docker', 'git', 'github'])
})

test('清理：去掉不存在的技能和前置没点亮的', () => {
  const r = clean(tree, new Set(['linux', 'docker', 'numpy', 'gone']))
  assert.deepEqual(r.lit, new Set(['linux', 'docker']))
  assert.equal(r.dropped, 2)
})

test('职业要学的全部点亮，就是达成；加分项不算', () => {
  for (const sub of tree.roadmap.subs) {
    const p = subProgress(tree, sub.id, new Set(sub.plan.map((x) => x.skillId)))
    assert.equal(p.done, p.total, sub.id)
  }
})

test('进度文件：导出再导入一致；格式不对给出说明；旧版本的“在学”当作没点亮', () => {
  const p = { lit: new Set(['linux', 'docker']), steps: new Map([['sql', [1, 3]]]) }
  assert.deepEqual(parseFile(toFile(p)), p)
  assert.throws(() => parseFile('nope'), /不是 JSON/)
  assert.throws(() => parseFile('{"format":"other"}'), /不是 cs-skill-tree/)
  assert.throws(() => parseFile('{"format":"cs-skill-tree-progress","version":9,"skills":{}}'), /版本/)
  const old = { format: 'cs-skill-tree-progress', version: 1, goalSubId: 'x', skills: { a: { status: 'done', updatedAt: 't' }, b: { status: 'learning' } } }
  assert.deepEqual(parseFile(JSON.stringify(old)), { lit: new Set(['a']), steps: new Map() })
})

test('分享链接来回编码不丢东西，技能数对不上就拒绝，旧链接末尾的目标职业忽略', () => {
  const lit = new Set(['linux', 'docker'])
  const hash = encodeShare(tree, lit)
  assert.ok(hash.length < 120, `链接太长：${hash.length}`)
  assert.deepEqual(decodeShare(tree, hash), lit)
  assert.deepEqual(decodeShare(tree, hash + '.inference'), lit)
  assert.equal(decodeShare(tree, '#/skill/docker'), null)
  assert.equal(decodeShare(tree, '#share=3.AAAA'), null)
})

test('学习流程的进度：只留没点亮、步数对得上、还没做完的', () => {
  const steps = new Map([
    ['sql', [3, 1, 3, 9]], // 去重、排序，超过步数的去掉
    ['docker', [1]], // 已经点亮：不记步骤
    ['nope', [1]], // 技能不存在
    ['cs61a', [1, 2, 3, 4, 5]], // 全做完却没点亮：内容改过步数
  ])
  assert.deepEqual(cleanSteps(tree, new Set(['docker']), steps), new Map([['sql', [1, 3]]]))
})
