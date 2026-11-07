// 内容：建库、体检、学习顺序、导出
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build, check } from '../scripts/db.ts'
import { load } from '../scripts/content.ts'
import { getRoadmap } from '../scripts/roadmap.ts'

const db = build()
const roadmap = getRoadmap(db)

test('内容通过体检，没有错误也没有提醒', () => {
  assert.deepEqual(check(db), [])
})

test('技能是能写进简历的能力：一百多个，不是几百个', () => {
  assert.ok(roadmap.skills.length >= 120 && roadmap.skills.length <= 220, `技能有 ${roadmap.skills.length} 个`)
})

test('导出的引用都对得上，每个技能正好在一个领域里', () => {
  const ids = new Set(roadmap.skills.map((s) => s.id))
  for (const s of roadmap.skills) {
    for (const p of s.prerequisites) assert.ok(ids.has(p))
    for (const d of s.dependents) assert.ok(roadmap.skills.find((x) => x.id === d)!.prerequisites.includes(s.id))
  }
  const placed = roadmap.areas.flatMap((a) => a.skillIds)
  assert.deepEqual(new Set(placed), ids)
  assert.equal(placed.length, ids.size)
})

test('学习顺序：第 1 步没有前置，其余每一步是最晚的前置那一步 + 1', () => {
  const pre = new Map(roadmap.skills.map((s) => [s.id, s.prerequisites]))
  for (const sub of roadmap.subs) {
    const step = new Map(sub.plan.map((p) => [p.skillId, p.step]))
    for (const r of sub.requirements) assert.ok(step.has(r), `${sub.id} 必学的 ${r} 不在路线里`)
    for (const { skillId, step: mine } of sub.plan) {
      const own = pre.get(skillId)!
      for (const p of own) assert.ok(step.get(p)! < mine, `${sub.id}：${p} 应该早于 ${skillId}`)
      assert.equal(mine, own.length ? Math.max(...own.map((p) => step.get(p)!)) + 1 : 1, `${sub.id}：${skillId}`)
    }
  }
})

test('体检能发现成环、挂错的主前置和多余的前置', () => {
  const bad = build()
  bad.exec("INSERT INTO skill_prerequisites VALUES ('cs61a', 'agent')") // 成环
  bad.exec("UPDATE skills SET parent_id = 'git' WHERE id = 'docker'") // Git 不是 Docker 的前置
  bad.exec("INSERT INTO skill_prerequisites VALUES ('k8s', 'linux')") // Linux 已经是 Docker 的前置
  const messages = check(bad).map((f) => f.message).join('\n')
  assert.match(messages, /绕了一圈/)
  assert.match(messages, /docker 挂在 git 上/)
  assert.match(messages, /k8s 的前置 linux 已经是/)
})

test('表约束挡住不合法的内容', () => {
  const bad = build()
  assert.throws(() => bad.exec("INSERT INTO skills (id, area_id, position, icon, name, intro) VALUES ('Bad Id', 'base', 99, 'x', 'x', 'y')"), /CHECK/)
  assert.throws(() => bad.exec("UPDATE skills SET icon = 'si:python' WHERE id = 'javascript'"), /UNIQUE/)
  assert.throws(() => bad.exec("INSERT INTO skill_prerequisites VALUES ('linux', 'linux')"), /CHECK/)
  assert.throws(() => bad.exec("INSERT INTO skill_resources (skill_id, position, label, url) VALUES ('linux', 9, 'x', 'http://example.com')"), /CHECK/)
  assert.throws(() => bad.exec("INSERT INTO skill_resources (skill_id, position, label, url, kind) VALUES ('linux', 9, 'x', 'https://example.com', '播客')"), /CHECK/)
})

test('编程语言画成六边形：Python、C、Rust 这些，别的技能不是', () => {
  const langs = roadmap.skills.filter((s) => s.language).map((s) => s.id).sort()
  assert.deepEqual(langs, ['c', 'cpp', 'csharp', 'dart', 'go', 'java', 'javascript', 'kotlin', 'python', 'rust', 'shell', 'sql', 'swift', 'typescript'])
})

/** 复制一份 content/，改掉一个文件，看 load() 报什么 */
function loadWith(file: string, edit: (text: string) => string): string {
  const dir = mkdtempSync(join(tmpdir(), 'content-'))
  cpSync('content', dir, { recursive: true })
  writeFileSync(join(dir, file), edit(readFileSync(join(dir, file), 'utf8')))
  try {
    load(pathToFileURL(dir + '/'))
    return ''
  } catch (e) {
    return (e as Error).message
  }
}

test('内容文件写错时，指出是哪个文件哪一行', () => {
  assert.match(loadWith('skills/docker.md', (t) => t.replace('requires: [linux]', 'requires: [linux, kubernetes]')), /content\/skills\/docker\.md：前置里的 kubernetes 不是一个技能/)
  assert.match(loadWith('skills/docker.md', (t) => t.replace('icon:', 'icom:')), /content\/skills\/docker\.md:3：不认识的属性 icom/)
  assert.match(loadWith('skills/docker.md', (t) => t.replace('## 学习流程', '## 学习步骤')), /docker\.md:\d+：不认识的小节“学习步骤”/)
  assert.match(loadWith('skills/docker.md', (t) => t.replace('· 文档 · 免费', '· 播客 · 免费')), /不认识的标签“播客”/)
  assert.match(loadWith('areas/base.md', (t) => t.replace('docker, ', '')), /content\/skills\/docker\.md 没有列在任何一个/)
  assert.match(loadWith('careers/backend.md', (t) => t.replace(/^requires: \[/m, 'requires: [nope, ')), /必学技能里的 nope 不是一个技能/)
})

test('每个技能都有 4 到 6 步的学习流程，资源都标好类型', () => {
  const content = load()
  const docker = content.skills.find((s) => s.id === 'docker')!
  docker.steps = docker.steps.slice(0, 3)
  docker.resources[0] = { ...docker.resources[0], kind: null }
  const messages = check(build(content)).map((f) => f.message).join('\n')
  assert.match(messages, /docker 的学习流程有 3 步，要 4 到 6 步/)
  assert.match(messages, /docker 的“去哪学”里，每个链接都要标上类型/)
})
