// 前端里不碰 DOM 的模块：分享链接、进度文件、搜索
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoadmap } from '../server/roadmap.ts'
import { Tree } from '../src/lib/tree.ts'
import { decodeShare, encodeShare } from '../src/lib/share.ts'
import { applyChanges, parseFile, sanitize, toFile } from '../src/lib/store.ts'
import type { Progress } from '../src/types.ts'
import { freshDb } from './helpers.ts'

const tree = new Tree(getRoadmap(freshDb()))

test('分享链接来回编码不丢东西', () => {
  const p: Progress = {
    goalSubId: 'inference',
    skills: { linux: { status: 'done', updatedAt: 'x' }, docker: { status: 'done', updatedAt: 'x' } },
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
  const p = applyChanges({ goalSubId: 'agent', skills: {} }, { linux: 'done', docker: 'done' }, '2026-01-01T00:00:00.000Z')
  const again = parseFile(JSON.stringify(toFile(p)))
  assert.deepEqual(again, p)
  assert.throws(() => parseFile('nope'), /不是 JSON/)
  assert.throws(() => parseFile('{"format":"other"}'), /不是 cs-skill-tree/)
  assert.throws(() => parseFile('{"format":"cs-skill-tree-progress","version":9,"skills":{}}'), /版本/)
  // 坏条目被跳过；旧版本的“在学”当作没点亮
  const loose = parseFile(JSON.stringify({ format: 'cs-skill-tree-progress', version: 1, goalSubId: 5, skills: { a: { status: 'done' }, b: { status: 'wat' }, c: { status: 'learning' } } }))
  assert.deepEqual(Object.keys(loose.skills), ['a'])
  assert.equal(loose.goalSubId, null)
})

test('applyChanges：null 删除，相同状态不改时间', () => {
  const p = applyChanges({ goalSubId: null, skills: {} }, { linux: 'done' }, 't1')
  const q = applyChanges(p, { linux: 'done', docker: 'done' }, 't2')
  assert.equal(q.skills.linux.updatedAt, 't1')
  assert.equal(q.skills.docker.updatedAt, 't2')
  assert.deepEqual(Object.keys(applyChanges(q, { linux: null }).skills), ['docker'])
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
