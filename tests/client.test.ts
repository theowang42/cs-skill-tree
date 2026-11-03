// 前端里不碰 DOM 的模块：分享链接、进度文件、搜索
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { decodeShare, encodeShare } from '../src/lib/share.ts'
import { searchTree } from '../src/lib/search.ts'
import { applyChanges, parseFile, sanitize, toFile } from '../src/lib/store.ts'
import type { Progress } from '../src/types.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))

test('分享链接来回编码不丢东西，只保留“学会了”', () => {
  const p: Progress = {
    goalSubId: 'backend',
    skills: { cli: { status: 'done', updatedAt: 'x' }, http: { status: 'done', updatedAt: 'x' }, rust: { status: 'learning', updatedAt: 'x' } },
  }
  const hash = encodeShare(tree, p)
  assert.ok(hash.length < 120, `链接太长：${hash.length}`)
  const back = decodeShare(tree, '#' + hash)!
  assert.equal(back.goalSubId, 'backend')
  assert.deepEqual(Object.keys(back.skills).sort(), ['cli', 'http'])
  assert.equal(decodeShare(tree, '#/skill/http'), null)
  assert.equal(decodeShare(tree, '#share=3.AAAA'), null, '技能数对不上要拒绝')
  assert.equal(decodeShare(tree, '#share=' + hash.split('=')[1].replace(/\.[a-z-]+$/, '.nope'))!.goalSubId, null)
})

test('进度文件：导出再导入一致；格式不对给出说明', () => {
  const p = applyChanges({ goalSubId: 'agent', skills: {} }, { cli: 'done', http: 'learning' }, '2026-01-01T00:00:00.000Z')
  const again = parseFile(JSON.stringify(toFile(p)))
  assert.deepEqual(again, p)
  assert.throws(() => parseFile('nope'), /不是 JSON/)
  assert.throws(() => parseFile('{"format":"other"}'), /不是 cs-skill-tree/)
  assert.throws(() => parseFile('{"format":"cs-skill-tree-progress","version":9,"skills":{}}'), /版本/)
  // 坏条目被跳过
  const loose = parseFile(JSON.stringify({ format: 'cs-skill-tree-progress', version: 1, goalSubId: 5, skills: { a: { status: 'done' }, b: { status: 'wat' } } }))
  assert.deepEqual(Object.keys(loose.skills), ['a'])
  assert.equal(loose.goalSubId, null)
})

test('applyChanges：null 删除，相同状态不改时间', () => {
  const p = applyChanges({ goalSubId: null, skills: {} }, { cli: 'done' }, 't1')
  const q = applyChanges(p, { cli: 'done', http: 'learning' }, 't2')
  assert.equal(q.skills.cli.updatedAt, 't1')
  assert.equal(q.skills.http.updatedAt, 't2')
  assert.deepEqual(Object.keys(applyChanges(q, { cli: null }).skills), ['http'])
})

test('搜索：名字前缀优先，也能搜到介绍和学会的标志', () => {
  assert.equal(searchTree(tree, 'http')[0].id, 'http')
  assert.equal(searchTree(tree, 'Docker')[0].id, 'docker')
  assert.ok(searchTree(tree, 'raft').some((h) => h.id === 'consensus'))
  assert.ok(searchTree(tree, 'curl').some((h) => h.id === 'http'))
  assert.ok(searchTree(tree, '后端').some((h) => h.kind === 'sub' && h.id === 'backend'))
  assert.deepEqual(searchTree(tree, '   '), [])
})

test('sanitize 去掉已不存在的技能和方向，没问题时原样返回', () => {
  const skills = new Set(tree.skills.keys())
  const subs = new Set(tree.subs.keys())
  const ok: Progress = { goalSubId: 'backend', skills: { cli: { status: 'done', updatedAt: 't' } } }
  assert.equal(sanitize(ok, skills, subs).progress, ok)
  const bad: Progress = { goalSubId: 'gone-sub', skills: { cli: { status: 'done', updatedAt: 't' }, 'gone-skill': { status: 'done', updatedAt: 't' } } }
  const r = sanitize(bad, skills, subs)
  assert.deepEqual(r.dropped, ['gone-skill'])
  assert.equal(r.progress.goalSubId, null)
  assert.deepEqual(Object.keys(r.progress.skills), ['cli'])
})
