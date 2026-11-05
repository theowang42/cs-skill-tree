// 数据库本身：迁移、播种、体检、视图的基本性质
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { check, migrate, openDatabase, seed } from '../server/db.ts'
import { freshDb, sharedDb } from './helpers.ts'

type Row = Record<string, unknown>

test('种子数据通过体检，没有错误也没有提醒', () => {
  const findings = check(sharedDb())
  assert.deepEqual(findings, [])
})

test('迁移可以重复执行', () => {
  const db = openDatabase(':memory:')
  const first = migrate(db)
  assert.ok(first.applied.length >= 3)
  const second = migrate(db)
  assert.deepEqual(second.applied, [])
  assert.equal(second.skipped.length, first.applied.length)
})

test('技能数量在预期范围内，每个都有等级和图标', () => {
  const db = sharedDb()
  const n = (sql: string) => (db.prepare(sql).get() as Row).n as number
  // 技能是能写进简历的能力，不是知识点：几十个，而不是几百个
  const skills = n('SELECT COUNT(*) AS n FROM skills')
  assert.ok(skills >= 80 && skills <= 160, `技能有 ${skills} 个`)
  assert.ok(n('SELECT COUNT(*) AS n FROM skill_prerequisites') >= 50)
  assert.equal(n('SELECT COUNT(*) AS n FROM skills WHERE icon IS NULL'), 0)
  assert.equal(n('SELECT COUNT(*) AS n FROM skill_level WHERE level NOT BETWEEN 1 AND 5'), 0)
})

test('每个细分方向的学习计划都从没有前置的技能开始，并且每一步的前置都在更早的步骤', () => {
  const db = sharedDb()
  const plan = db.prepare('SELECT sub_id, skill_id, step FROM sub_learning_plan').all() as Row[]
  assert.ok(plan.length > 0)
  const step = new Map(plan.map((r) => [`${r.sub_id}/${r.skill_id}`, r.step as number]))
  const prereqs = db.prepare('SELECT skill_id, prerequisite_id FROM skill_prerequisites').all() as Row[]
  for (const r of plan) {
    const mine = r.step as number
    const own = prereqs.filter((p) => p.skill_id === r.skill_id)
    for (const p of own) {
      const theirs = step.get(`${r.sub_id}/${p.prerequisite_id}`)
      assert.ok(theirs !== undefined, `${r.sub_id}: ${r.skill_id} 的前置 ${p.prerequisite_id} 不在计划里`)
      assert.ok(theirs < mine, `${r.sub_id}: ${p.prerequisite_id}（第 ${theirs} 步）应该早于 ${r.skill_id}（第 ${mine} 步）`)
    }
    if (mine === 1) assert.equal(own.length, 0, `${r.skill_id} 是第 1 步却有前置`)
    else assert.ok(own.some((p) => step.get(`${r.sub_id}/${p.prerequisite_id}`) === mine - 1), `${r.skill_id} 的步骤不是最晚前置 + 1`)
  }
})

test('体检能发现成环、等级倒挂、编号断档和重复图标', () => {
  const db = freshDb()
  db.exec("INSERT INTO skill_prerequisites VALUES ('python', 'agent')") // 成环
  db.exec("UPDATE skills SET level = 1 WHERE id = 'cuda'") // 手写的等级比前置 CS149 还低
  db.exec("UPDATE skills SET level = 3 WHERE id = 'parallel'")
  db.exec("UPDATE skill_resources SET position = 9 WHERE skill_id = 'git' AND position = 2")
  db.exec("UPDATE skills SET icon = 'si:python' WHERE id = 'javascript'")
  const rules = new Set(check(db).filter((f) => f.level === 'error').map((f) => f.rule))
  assert.ok(rules.has('prerequisite-cycle'))
  assert.ok(rules.has('prerequisite-level'))
  assert.ok(rules.has('position-gap'))
  assert.ok(rules.has('duplicate-icon'))
})

test('表约束挡住不合法的数据', () => {
  const db = freshDb()
  assert.throws(() => db.exec("INSERT INTO skills (id, kind, area_id, position, name, intro) VALUES ('Bad Id', 'concept', 'lang', 99, 'x', 'y')"))
  assert.throws(() => db.exec("UPDATE skills SET level = 6 WHERE id = 'python'"), /CHECK/)
  assert.throws(() => db.exec("INSERT INTO skill_prerequisites VALUES ('linux', 'linux')"), /CHECK/)
  assert.throws(() => db.exec("INSERT INTO skill_resources VALUES ('linux', 9, 'x', 'ftp://example.com')"), /CHECK/)
  assert.throws(() => db.exec("INSERT INTO skill_prerequisites VALUES ('linux', 'no-such-skill')"), /FOREIGN KEY/)
})

test('重新播种保留学习者的进度，只清掉指向已删除技能的记录', () => {
  const db = freshDb()
  const id = 'a'.repeat(32)
  db.prepare("INSERT INTO learners (id, goal_sub_id) VALUES (?, 'inference')").run(id)
  db.prepare("INSERT INTO learner_skills (learner_id, skill_id, status) VALUES (?, 'linux', 'done'), (?, 'docker', 'done')").run(id, id)
  // 模拟一个已经从内容里删掉的技能
  db.exec('PRAGMA foreign_keys = OFF')
  db.prepare("INSERT INTO learner_skills (learner_id, skill_id, status) VALUES (?, 'removed-skill', 'done')").run(id)
  db.exec('PRAGMA foreign_keys = ON')
  const eventsBefore = (db.prepare('SELECT COUNT(*) AS n FROM learner_events').get() as Row).n
  const r = seed(db)
  assert.equal(r.orphaned, 1)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM learner_events').get() as Row).n, eventsBefore, '清理不该留下用户没做过的操作记录')
  const rows = db.prepare('SELECT skill_id, status FROM learner_skills ORDER BY skill_id').all() as Row[]
  assert.deepEqual(rows.map((x) => `${x.skill_id}:${x.status}`), ['docker:done', 'linux:done'])
  assert.equal((db.prepare('SELECT goal_sub_id FROM learners').get() as Row).goal_sub_id, 'inference')
})

test('种子文件出错时整体回滚，原来的内容不受影响', () => {
  const db = freshDb()
  const before = (db.prepare('SELECT COUNT(*) AS n FROM skills').get() as Row).n
  db.exec('DROP TABLE skill_resources') // 让种子文件跑不下去
  assert.throws(() => seed(db))
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM skills').get() as Row).n, before)
})

test('操作记录由触发器自动写入；只有点亮一种状态', () => {
  const db = freshDb()
  const id = 'b'.repeat(32)
  db.prepare('INSERT INTO learners (id) VALUES (?)').run(id)
  db.prepare("INSERT INTO learner_skills (learner_id, skill_id, status) VALUES (?, 'linux', 'done')").run(id)
  db.prepare("UPDATE learner_skills SET status = 'done' WHERE learner_id = ?").run(id) // 没变化，不记
  db.prepare('DELETE FROM learner_skills WHERE learner_id = ?').run(id)
  const ev = db.prepare('SELECT from_status, to_status FROM learner_events WHERE learner_id = ? ORDER BY id').all(id) as Row[]
  assert.deepEqual(ev.map((e) => `${e.from_status}->${e.to_status}`), ['null->done', 'done->null'])
  assert.throws(() => db.prepare("INSERT INTO learner_skills (learner_id, skill_id, status) VALUES (?, 'git', 'learning')").run(id), /只能是 done/)
})

test('API 的整棵树缓存：别的连接改了内容就失效，自己写学习者数据不失效', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { rebuild } = await import('../server/db.ts')
  const { cachedRoadmap } = await import('../server/index.ts')
  const dir = mkdtempSync(join(tmpdir(), 'cs-skill-tree-'))
  try {
    const path = join(dir, 'test.db')
    rebuild(path).close()
    const server = openDatabase(path)
    const first = cachedRoadmap(server)
    server.prepare("INSERT INTO learners (id) VALUES (?)").run('c'.repeat(32))
    assert.equal(cachedRoadmap(server), first, '学习者数据不该让缓存失效')
    const editor = openDatabase(path)
    editor.exec("UPDATE skills SET name = 'Python 3' WHERE id = 'python'")
    const second = cachedRoadmap(server)
    assert.notEqual(second, first)
    assert.equal(second.skills.find((s) => s.id === 'python')!.name, 'Python 3')
    editor.close()
    server.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
