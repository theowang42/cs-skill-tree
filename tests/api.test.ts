// 通过真正的 HTTP 请求测 API
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../server/index.ts'
import type { Learner } from '../src/types.ts'
import { freshDb } from './helpers.ts'

const db = freshDb()
const server = createApp(db)
let base = ''

before(async () => {
  await new Promise<void>((r) => server.listen(0, r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})
after(() => new Promise<void>((r) => server.close(() => r())))

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, { method, headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

test('内容接口', async () => {
  const health = await call('GET', '/health')
  assert.equal(health.status, 200)
  assert.ok(health.body.skills > 200)
  const roadmap = await call('GET', '/roadmap')
  assert.equal(roadmap.body.version, 2)
  assert.equal((await call('GET', '/skills/http')).body.name, 'HTTP')
  assert.equal((await call('GET', '/areas/os')).body.name, '操作系统')
  assert.equal((await call('GET', '/subs/backend')).body.categoryId, 'apps')
  assert.equal((await call('GET', '/categories/ai')).body.name, 'AI')
  assert.equal((await call('GET', '/skills/nope')).status, 404)
  assert.equal((await call('GET', '/skills/..%2F..')).status, 404)
  assert.equal((await call('GET', '/whatever')).status, 404)
  // 不合法的百分号编码是 400，不是 500
  assert.equal((await fetch(base + '/skills/%E0')).status, 400)
  // HEAD 和 GET 一样能用
  const head = await fetch(base + '/health', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
})

test('搜索：名字优先，通配符被转义', async () => {
  const hits = (await call('GET', '/search?q=raft')).body
  assert.equal(hits[0].id, 'consensus')
  const http = (await call('GET', '/search?q=HTTP')).body
  assert.equal(http[0].id, 'http')
  assert.deepEqual((await call('GET', '/search?q=%25%25%25')).body, [])
  assert.deepEqual((await call('GET', '/search?q=')).body, [])
})

test('学习者的完整流程', async () => {
  const created = await call('POST', '/learners')
  assert.equal(created.status, 201)
  const id = (created.body as Learner).id
  assert.match(id, /^[0-9a-f]{32}$/)

  assert.equal((await call('PUT', `/learners/${id}/goal`, { subId: 'backend' })).body.goalSubId, 'backend')
  assert.equal((await call('PUT', `/learners/${id}/goal`, { subId: 'nope' })).status, 404)

  const one = await call('PUT', `/learners/${id}/skills/cli`, { status: 'done' })
  assert.equal(one.body.skills.cli.status, 'done')
  assert.equal((await call('PUT', `/learners/${id}/skills/cli`, { status: 'meh' })).status, 400)
  assert.equal((await call('PUT', `/learners/${id}/skills/nope`, { status: 'done' })).status, 404)

  const batch = await call('PATCH', `/learners/${id}/skills`, { changes: { 'prog-basics': 'done', 'git-basics': 'learning', cli: null } })
  assert.deepEqual(Object.keys(batch.body.skills).sort(), ['git-basics', 'prog-basics'])
  // 有一个不认识的技能，整批都不写
  const bad = await call('PATCH', `/learners/${id}/skills`, { changes: { 'data-types': 'done', nope: 'done' } })
  assert.equal(bad.status, 400)
  assert.equal((await call('GET', `/learners/${id}`)).body.skills['data-types'], undefined)

  const sum = (await call('GET', `/learners/${id}/summary`)).body
  assert.equal(sum.counts.done, 1)
  assert.equal(sum.counts.learning, 1)
  assert.equal(sum.goal.subId, 'backend')
  assert.ok(sum.frontier.some((f: { skillId: string }) => f.skillId === 'functions'))
  assert.ok(!sum.frontier.some((f: { skillId: string }) => f.skillId === 'prog-basics'))

  const ev = (await call('GET', `/learners/${id}/events`)).body
  assert.deepEqual(ev.map((e: { skillId: string; to: string | null }) => `${e.skillId}:${e.to}`), ['cli:null', 'git-basics:learning', 'prog-basics:done', 'cli:done'])

  const exported = (await call('GET', `/learners/${id}/export`)).body
  assert.equal(exported.format, 'cs-skill-tree-progress')

  // 导入到另一个学习者，不认识的技能丢掉并报告
  const other = (await call('POST', '/learners')).body.id
  const imported = await call('POST', `/learners/${other}/import`, { ...exported, skills: { ...exported.skills, gone: { status: 'done', updatedAt: '2020-01-01T00:00:00Z' } } })
  assert.equal(imported.status, 200)
  assert.deepEqual(imported.body.dropped, ['gone'])
  assert.deepEqual(Object.keys(imported.body.learner.skills).sort(), ['git-basics', 'prog-basics'])
  assert.equal(imported.body.learner.goalSubId, 'backend')
  assert.equal((await call('POST', `/learners/${other}/import`, { format: 'x' })).status, 400)

  assert.equal((await call('DELETE', `/learners/${id}`)).status, 204)
  assert.equal((await call('GET', `/learners/${id}`)).status, 404)
})

test('坏请求', async () => {
  const id = (await call('POST', '/learners')).body.id
  assert.equal((await call('PUT', `/learners/${id}/goal`, 'not json')).status, 400)
  assert.equal((await call('PUT', `/learners/${id}/goal`, '[1]')).status, 400)
  assert.equal((await call('GET', '/learners/short')).status, 404)
  assert.equal((await call('PUT', `/learners/${id}/goal`, { subId: 'x'.repeat(2 << 20) })).status, 413)
})
