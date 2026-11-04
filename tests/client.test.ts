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
    goalSubId: 'inference',
    skills: { linux: { status: 'done', updatedAt: 'x' }, docker: { status: 'done', updatedAt: 'x' }, cpp: { status: 'learning', updatedAt: 'x' } },
  }
  const hash = encodeShare(tree, p)
  assert.ok(hash.length < 120, `链接太长：${hash.length}`)
  const back = decodeShare(tree, '#' + hash)!
  assert.equal(back.goalSubId, 'inference')
  assert.deepEqual(Object.keys(back.skills).sort(), ['docker', 'linux'])
  assert.equal(decodeShare(tree, '#/skill/http'), null)
  assert.equal(decodeShare(tree, '#share=3.AAAA'), null, '技能数对不上要拒绝')
  assert.equal(decodeShare(tree, '#share=' + hash.split('=')[1].replace(/\.[a-z-]+$/, '.nope'))!.goalSubId, null)
})

test('进度文件：导出再导入一致；格式不对给出说明', () => {
  const p = applyChanges({ goalSubId: 'agent', skills: {} }, { linux: 'done', docker: 'learning' }, '2026-01-01T00:00:00.000Z')
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
  const p = applyChanges({ goalSubId: null, skills: {} }, { linux: 'done' }, 't1')
  const q = applyChanges(p, { linux: 'done', docker: 'learning' }, 't2')
  assert.equal(q.skills.linux.updatedAt, 't1')
  assert.equal(q.skills.docker.updatedAt, 't2')
  assert.deepEqual(Object.keys(applyChanges(q, { linux: null }).skills), ['docker'])
})

test('搜索：名字前缀优先，也能搜到介绍', () => {
  assert.equal(searchTree(tree, 'git')[0].id, 'git')
  assert.equal(searchTree(tree, 'Docker')[0].id, 'docker')
  assert.ok(searchTree(tree, '共识').some((h) => h.id === 'distributed'))
  assert.ok(searchTree(tree, 'REST').some((h) => h.id === 'web-api'))
  assert.ok(searchTree(tree, '推理').some((h) => h.kind === 'sub' && h.id === 'inference'))
  assert.deepEqual(searchTree(tree, '   '), [])
})

test('sanitize 去掉已不存在的技能和方向，没问题时原样返回', () => {
  const skills = new Set(tree.skills.keys())
  const subs = new Set(tree.subs.keys())
  const ok: Progress = { goalSubId: 'inference', skills: { linux: { status: 'done', updatedAt: 't' } } }
  assert.equal(sanitize(ok, skills, subs).progress, ok)
  const bad: Progress = { goalSubId: 'gone-sub', skills: { linux: { status: 'done', updatedAt: 't' }, 'gone-skill': { status: 'done', updatedAt: 't' } } }
  const r = sanitize(bad, skills, subs)
  assert.deepEqual(r.dropped, ['gone-skill'])
  assert.equal(r.progress.goalSubId, null)
  assert.deepEqual(Object.keys(r.progress.skills), ['linux'])
})
