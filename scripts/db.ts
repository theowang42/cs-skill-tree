#!/usr/bin/env node
// 数据库命令行。用法：npm run db -- <命令>
//
//   build    删掉旧库，建表并灌入 db/seed 的内容，再体检（加 --export 顺便导出 JSON）
//   migrate  只跑还没跑过的迁移，保留已有数据（线上升级用）
//   seed     只重新灌内容，保留学习者数据
//   check    体检：外键、成环、编号、没人用的内容
//   export   把整棵树导出成 public/data/roadmap.json，给静态站点用
//   stats    每张表有多少行
//   query    跑一条 SQL，例如 npm run db -- query "SELECT * FROM sub_learning_plan WHERE sub_id = 'agent'"
//   events   最近的学习记录（API 模式下有数据）
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { check, DEFAULT_DB_PATH, migrate, openDatabase, rebuild, seed, tableCounts } from '../server/db.ts'
import { getRoadmap } from '../server/roadmap.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
export const EXPORT_PATH = join(ROOT, 'public', 'data', 'roadmap.json')

const [command, ...args] = process.argv.slice(2)

function printTable(rows: Record<string, unknown>[]) {
  if (!rows.length) return console.log('（没有结果）')
  console.table(rows)
}

function runCheck(db = openDatabase()): boolean {
  const findings = check(db)
  for (const f of findings) console.log(`${f.level === 'error' ? '✗' : '!'} [${f.rule}] ${f.message}`)
  const errors = findings.filter((f) => f.level === 'error').length
  const warnings = findings.length - errors
  console.log(`体检完成：${errors} 个错误，${warnings} 个提醒`)
  return errors === 0
}

const ICONS_PATH = join(ROOT, 'src', 'generated', 'icons.ts')
const pascal = (s: string) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const siName = (s: string) => 'si' + s[0].toUpperCase() + s.slice(1)

/**
 * 生成前端用的图标表：只 import 用到的图标，打包时其余的都被摇掉。
 * 名字不存在就直接报错，比运行时少一个图标好查。
 */
function writeIcons(names: string[]) {
  const lucide = [...new Set(names.filter((n) => !n.startsWith('si:') && !n.startsWith('text:')))].sort()
  const brands = [...new Set(names.filter((n) => n.startsWith('si:')).map((n) => n.slice(3)))].sort()
  const lucideMod = require('lucide-react') as { icons: Record<string, unknown> }
  const siMod = require('simple-icons') as Record<string, unknown>
  const bad = [...lucide.filter((n) => !lucideMod.icons[pascal(n)]), ...brands.filter((n) => !siMod[siName(n)]).map((n) => 'si:' + n)]
  if (bad.length) throw new Error(`这些图标不存在：${bad.join('、')}。Lucide 图标名见 https://lucide.dev/icons`)
  const src = `// 由 npm run db:export 生成，别手改。改图标请改 db/seed 里技能的 icon 字段。
import type { LucideIcon } from 'lucide-react'
import { ${lucide.map(pascal).join(', ')} } from 'lucide-react'
import { ${brands.map(siName).join(', ')} } from 'simple-icons'

export type SkillIcon = { kind: 'lucide'; Icon: LucideIcon } | { kind: 'brand'; path: string; title: string }

export const ICONS: Record<string, SkillIcon> = {
${lucide.map((n) => `  ${JSON.stringify(n)}: { kind: 'lucide', Icon: ${pascal(n)} },`).join('\n')}
${brands.map((n) => `  ${JSON.stringify('si:' + n)}: { kind: 'brand', path: ${siName(n)}.path, title: ${siName(n)}.title },`).join('\n')}
}
`
  mkdirSync(dirname(ICONS_PATH), { recursive: true })
  writeFileSync(ICONS_PATH, src)
}

function runExport(db = openDatabase()) {
  const roadmap = getRoadmap(db)
  mkdirSync(dirname(EXPORT_PATH), { recursive: true })
  writeFileSync(EXPORT_PATH, JSON.stringify(roadmap, null, 2) + '\n')
  writeIcons([...roadmap.skills.map((s) => s.icon), ...roadmap.subs.map((s) => s.icon)])
  console.log(`已导出 ${EXPORT_PATH}：${roadmap.areas.length} 个分支、${roadmap.skills.length} 个技能、${roadmap.subs.length} 个方向`)
}

switch (command) {
  case 'build': {
    const db = rebuild()
    console.log(`已重建 ${DEFAULT_DB_PATH}`)
    if (!runCheck(db)) process.exit(1)
    if (args.includes('--export')) runExport(db)
    break
  }
  case 'migrate': {
    const r = migrate(openDatabase())
    console.log(`应用了 ${r.applied.length} 个迁移${r.applied.length ? '：' + r.applied.join('、') : ''}，跳过 ${r.skipped.length} 个`)
    break
  }
  case 'seed': {
    const r = seed(openDatabase())
    console.log(`已重新灌入 ${r.files.join('、')}${r.orphaned ? `，清理了 ${r.orphaned} 条失效的学习记录` : ''}`)
    break
  }
  case 'check':
    if (!runCheck()) process.exit(1)
    break
  case 'export':
    runExport()
    break
  case 'stats':
    printTable(Object.entries(tableCounts(openDatabase())).map(([table, rows]) => ({ table, rows })))
    break
  case 'events':
    printTable(openDatabase().prepare('SELECT e.at, e.learner_id, s.name, e.from_status, e.to_status FROM learner_events e LEFT JOIN skills s ON s.id = e.skill_id ORDER BY e.id DESC LIMIT 30').all() as Record<string, unknown>[])
    break
  case 'query': {
    const sql = args.join(' ')
    if (!sql) {
      console.error('请给一条 SQL')
      process.exit(2)
    }
    printTable(openDatabase().prepare(sql).all() as Record<string, unknown>[])
    break
  }
  default:
    console.error('用法：npm run db -- build [--export] | migrate | seed | check | export | stats | events | query "<SQL>"')
    process.exit(2)
}
