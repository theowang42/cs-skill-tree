// npm run data：建库、体检，导出 public/data/roadmap.json 和前端的图标表。体检有错误就失败。
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build, check } from './db.ts'
import { getRoadmap } from './roadmap.ts'

const db = build()
const findings = check(db)
for (const f of findings) console.log(`${f.level === 'error' ? '✗' : '!'} ${f.message}`)
if (findings.some((f) => f.level === 'error')) process.exit(1)

const roadmap = getRoadmap(db)
const out = new URL('../public/data/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(new URL('roadmap.json', out), JSON.stringify(roadmap, null, 2) + '\n')
writeIcons([...roadmap.skills.map((s) => s.icon), ...roadmap.subs.map((s) => s.icon)])
console.log(`已导出 ${roadmap.areas.length} 个领域、${roadmap.skills.length} 个技能、${roadmap.subs.length} 个职业`)

/**
 * 前端的图标表：只 import 用到的图标，打包时其余的都被摇掉。
 * 名字不存在就直接报错，比运行时少一个图标好查。
 */
function writeIcons(names: string[]) {
  const require = createRequire(import.meta.url)
  const pascal = (s: string) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  const siName = (s: string) => 'si' + s[0].toUpperCase() + s.slice(1)
  const lucide = [...new Set(names.filter((n) => !n.startsWith('si:')))].sort()
  const brands = [...new Set(names.filter((n) => n.startsWith('si:')).map((n) => n.slice(3)))].sort()
  const lucideMod = require('lucide-react') as { icons: Record<string, unknown> }
  const siMod = require('simple-icons') as Record<string, unknown>
  const bad = [...lucide.filter((n) => !lucideMod.icons[pascal(n)]), ...brands.filter((n) => !siMod[siName(n)]).map((n) => 'si:' + n)]
  if (bad.length) throw new Error(`这些图标不存在：${bad.join('、')}。Lucide 图标名见 https://lucide.dev/icons`)
  const dir = new URL('../src/generated/', import.meta.url)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('icons.ts', dir), `// 由 npm run data 生成，别手改。改图标请改 db/seed 里的 icon。
import type { LucideIcon } from 'lucide-react'
import { ${lucide.map(pascal).join(', ')} } from 'lucide-react'
import { ${brands.map(siName).join(', ')} } from 'simple-icons'

type SkillIcon = { kind: 'lucide'; Icon: LucideIcon } | { kind: 'brand'; path: string }

export const ICONS: Record<string, SkillIcon> = {
${lucide.map((n) => `  ${JSON.stringify(n)}: { kind: 'lucide', Icon: ${pascal(n)} },`).join('\n')}
${brands.map((n) => `  ${JSON.stringify('si:' + n)}: { kind: 'brand', path: ${siName(n)}.path },`).join('\n')}
}
`)
}
