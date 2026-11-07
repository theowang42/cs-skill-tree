// 短片要用的数据：真实布局、名字、图标 SVG、前置、学习流程、推理工程师要学的技能。写到 out/data.json
// 先跑 npm run data（生成 roadmap.json 和图标表），再跑这个
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Roadmap } from '../../src/types.ts'
import { Tree } from '../../src/lib/tree.ts'
import { layoutWeb, subNodeId } from '../../src/lib/webLayout.ts'
import { ICONS } from '../../src/generated/icons.ts'

/** 片子里第二幕点亮的基础技能；点亮后 Docker 正好能学，是第三幕的主角 */
const LIT = ['cs61a', 'python', 'cs61b', 'linux', 'shell', 'git', 'calculus', 'math', 'discrete', 'dsa', 'github', 'sql', 'numpy', 'testing']

const rm = JSON.parse(readFileSync(new URL('../../public/data/roadmap.json', import.meta.url), 'utf8')) as Roadmap
const tree = new Tree(rm)
const layout = layoutWeb(tree)

/** 图标画成 SVG 字符串，片子里按需要换颜色 */
function svg(name: string): string {
  const spec = ICONS[name]
  if (spec.kind === 'lucide') return renderToStaticMarkup(createElement(spec.Icon, { width: 64, height: 64, strokeWidth: 1.5, color: '#000' }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path d="${spec.path}" fill="#000"/></svg>`
}
const depth = (id: string) => {
  let d = 1
  for (let p = tree.skill(id).parent; p; p = tree.skill(p).parent) d++
  return d
}

const out = {
  rings: layout.rings,
  skills: rm.skills.map((s) => ({ id: s.id, name: s.name, language: s.language, parent: s.parent, depth: depth(s.id), icon: svg(s.icon), ...layout.nodes.get(s.id)!, steps: s.steps, pre: s.prerequisites })),
  subs: rm.subs.map((s) => ({ id: s.id, name: s.name, icon: svg(s.icon), ...layout.nodes.get(subNodeId(s.id))!, closure: [...tree.closures.get(s.id)!] })),
  edges: layout.edges,
  lit: LIT,
}
const dir = new URL('out/', import.meta.url)
mkdirSync(dir, { recursive: true })
writeFileSync(new URL('data.json', dir), JSON.stringify(out))
console.log(`out/data.json：${out.skills.length} 个技能，${out.subs.length} 个职业`)
