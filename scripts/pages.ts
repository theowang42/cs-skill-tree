// 静态页面：首页、每个技能一页、每个职业一页，加 sitemap。
// 技能树本身是单页应用（在 /tree/），搜索引擎看不到里面的内容；这些页面是写死的 HTML，
// 让人能搜到“Docker 怎么学”“大模型算法工程师要学什么”，也方便把单个技能、单个职业分享出去。
// 同一个意思只有一个页面：职业页打开就是这个职业的天赋树，技能页打开就是大图上这个技能的卡片。
// HTML 里写好同样的内容给搜索引擎，技能树的脚本加载后接管整页。
//
// 用法：npm run build 在 vite 打包完技能树之后跑这个，写进 dist/。
// renderSite() 只返回 { 路径: 内容 }，不碰磁盘，测试直接用它。
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Roadmap, Skill, Sub } from '../src/types.ts'
import { ICONS } from '../src/generated/icons.ts'
import { Tree } from '../src/lib/tree.ts'
import { layoutCareer } from '../src/lib/careerLayout.ts'
import { hexPath, NODE_R, START_R, subNodeId, TIP_R } from '../src/lib/webLayout.ts'

export const SITE = 'https://theowang42.github.io/cs-skill-tree/'
const REPO = 'https://github.com/theowang42/cs-skill-tree'
const NAME = 'CS 技能树'
/** 首页第一屏让人先点的常见技能 */
const QUICK = ['python', 'javascript', 'java', 'linux', 'git', 'sql', 'cs61b', 'networking', 'docker', 'react', 'ml', 'pytorch']
/** 和技能树存进度用的是同一个地方，首页点亮的进了树里也在 */
const PROGRESS_KEY = 'cs-skill-tree:progress:v1'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function icon(name: string, size = 24): string {
  const spec = ICONS[name]
  if (!spec) return ''
  if (spec.kind === 'lucide') return renderToStaticMarkup(createElement(spec.Icon, { width: size, height: size, strokeWidth: 1.7, absoluteStrokeWidth: true, 'aria-hidden': true }))
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${spec.path}" fill="currentColor"/></svg>`
}

interface Page {
  /** 相对站点根的目录，'' 是首页 */
  path: string
  title: string
  description: string
  body: string
  /** 面包屑（给搜索引擎）：[名字, 相对根的路径] */
  crumbs?: [string, string][]
  /** 技能树的脚本和样式：有它时 body 是技能树的挂载点，不要站点的页头页脚 */
  app?: string
}

function layout(p: Page): string {
  const root = p.path ? '../'.repeat(p.path.split('/').filter(Boolean).length) : './'
  const url = SITE + p.path
  const ld = p.crumbs
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: p.crumbs.map(([n, h], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + h })),
      })}</script>`
    : ''
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}og.jpg">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='15' y='15' width='70' height='70' rx='8' fill='%23111'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
${p.app ?? `<link rel="stylesheet" href="${root}site.css">`}
${ld}
</head>
<body>
${p.app === undefined ? site(root, p.body) : `<div id="root">\n${p.body}\n</div>`}
</body>
</html>
`
}

/** 站点的页头、正文、页脚 */
const site = (root: string, body: string) => `<header class="top">
  <a class="logo" href="${root}"><span class="mark"></span>${NAME}</a>
  <nav><a class="btn" href="${root}tree/">打开技能树</a></nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  <p>免费，不用注册。进度只存在你自己的浏览器里，不收集任何数据。</p>
  <p>内容开源在 <a href="${REPO}">GitHub</a>，哪里写得不对，欢迎直接改。课程主要参考 <a href="https://csdiy.wiki/">csdiy.wiki</a>。</p>
</footer>`

/** app：技能树打包出来的脚本和样式标签，职业页和技能页要用 */
export function renderSite(rm: Roadmap, app = ''): Map<string, string> {
  const skills = new Map(rm.skills.map((s) => [s.id, s]))
  const subs = new Map(rm.subs.map((s) => [s.id, s]))
  const areas = new Map(rm.areas.map((a) => [a.id, a]))
  const sk = (id: string) => skills.get(id)!
  const out = new Map<string, string>()
  const put = (p: Page) => out.set(p.path + 'index.html', layout(p))

  const tree = new Tree(rm)
  /** 首页的小树：一个职业的天赋树，只画形状，从“你”往上一节一节长出来（离“你”越远越晚） */
  const miniTree = (c: Sub) => {
    const l = layoutCareer(tree, c.id)
    const { minX, minY, maxX, maxY } = l.bounds
    const at = (id: string) => l.nodes.get(id)!
    const delay = (y: number) => `style="animation-delay:${Math.round(-y * 0.55)}ms"`
    // 小树没有名字，枝条直接连到节点中心（节点是白底，盖住线头）：父节点往上一点横过去，再往上到孩子
    const edges = l.edges.map((e) => {
      const a = e.from === 'root' ? { x: 0, y: 0 } : at(e.from)
      const b = at(e.to)
      const d = a.x === b.x ? `M${a.x},${a.y} V${b.y}` : `M${a.x},${a.y} V${a.y - 50} H${b.x} V${b.y}`
      return `<path class="e" pathLength="1" d="${d}" ${delay(b.y)}/>`
    }).join('')
    const nodes = [...tree.closures.get(c.id)!].map((id) => {
      const { x, y } = at(id)
      const shape = sk(id).language ? `<path d="${hexPath(NODE_R + 2)}"/>` : `<circle r="${NODE_R}"/>`
      return `<g class="n" data-s="${id}" transform="translate(${x},${y})"><g ${delay(y)}>${shape}</g></g>`
    }).join('')
    const t = at(subNodeId(c.id))
    return `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" aria-hidden="true">${edges}${nodes}<g class="n tip" transform="translate(${t.x},${t.y})"><g ${delay(t.y)}><circle r="${TIP_R}"/><circle r="${TIP_R - 7}"/><g transform="translate(-20,-20) scale(1.67)">${icon(c.icon)}</g></g></g><circle class="you" r="${START_R}"/></svg>`
  }

  const skillChip = (s: Skill, root: string) => `<a class="chip" href="${root}skill/${s.id}/">${icon(s.icon, 16)}${esc(s.name)}</a>`
  const careerCard = (c: Sub, root: string) => {
    const steps = Math.max(...c.plan.map((p) => p.step))
    return `<a class="card career" data-id="${c.id}" href="${root}career/${c.id}/"><span class="seal">${icon(c.icon, 22)}</span><span class="txt"><b>${esc(c.name)}${c.isHot ? '<em>热门</em>' : ''}</b><small>${esc(c.intro)}</small><span class="meta">${c.plan.length} 个技能 · ${steps} 步</span></span></a>`
  }

  // ── 首页 ──
  {
    // 一个网格：大方向的标题占一整行，点亮了东西之后标题收起，岗位按还差几个排
    const careers = rm.categories
      .map((cat) => `<div class="group-head"><h3>${esc(cat.name)}</h3><p class="muted">${esc(cat.intro)}</p></div>${cat.subIds.map((id) => careerCard(subs.get(id)!, '')).join('')}`)
      .join('')
    // 首页的脚本要用的：每个岗位要学的技能；每个常见技能的前置（点亮时一起亮）和依赖它的（熄灭时一起灭）
    const data = {
      careers: Object.fromEntries(rm.subs.map((c) => [c.id, c.plan.map((p) => p.skillId)])),
      up: Object.fromEntries(QUICK.map((id) => [id, [...tree.ancestors(id)]])),
      down: Object.fromEntries(QUICK.map((id) => [id, rm.skills.filter((s) => tree.ancestors(s.id).has(id)).map((s) => s.id)])),
    }
    const all = rm.areas
      .map((a) => `<section class="group"><h3>${esc(a.name)}<span>${a.skillIds.length}</span></h3><p class="muted">${esc(a.intro)}</p><div class="chips">${a.skillIds.map((id) => skillChip(sk(id), '')).join('')}</div></section>`)
      .join('')
    put({
      path: '',
      title: `${NAME}：${rm.skills.length} 个计算机技能和 ${rm.subs.length} 个职业的学习路线`,
      description: `一棵 ${rm.skills.length} 个技能的计算机技能树：点亮你会的，看清自己的能力边界，按 ${rm.subs.length} 个职业倒推学习路线，每个技能附公开课。免费，不用注册。`,
      body: `
<script>/* 技能树以前在首页：旧的分享链接和技能链接（#share=… / #/skill/…）转到 tree/ */if (/^#(\\/|share=)/.test(location.hash)) location.replace('tree/' + location.hash)</script>
<div class="home">
<section class="hero">
  <h1>点亮你会的，<br>看你离岗位还差几个技能</h1>
  <p class="lead">一棵 ${rm.skills.length} 个技能的计算机技能树。每个技能写清学到什么程度算会、分几步学、去哪免费学。不用注册，进度只存在你的浏览器里。</p>
  <p class="ask">你会哪些？点一下，下面马上算出离每个岗位还差几个。</p>
  <div class="quick">${QUICK.map((id) => `<button type="button" class="chip" data-s="${id}" aria-pressed="false">${icon(sk(id).icon, 16)}${esc(sk(id).name)}</button>`).join('')}</div>
</section>

<aside class="preview">${rm.subs.map((c, i) => `<a class="mini${i ? '' : ' on'}" data-id="${c.id}" href="career/${c.id}/">${miniTree(c)}<b>${esc(c.name)}</b></a>`).join('')}</aside>

<section id="careers" class="block">
  <h2>你想做哪个岗位？</h2>
  <p class="muted">点进去是这个岗位要学的全部技能，会的直接点亮。还没想好，就<a href="tree/">看整棵树</a>。</p>
  <div class="careers">${careers}</div>
</section>
</div>

<details id="skills" class="block">
  <summary>全部 ${rm.skills.length} 个技能</summary>
  ${all}
</details>
<script>
const KEY = ${JSON.stringify(PROGRESS_KEY)}, D = ${JSON.stringify(data)}
let store = null
try { store = JSON.parse(localStorage.getItem(KEY)) } catch {}
if (store?.format !== 'cs-skill-tree-progress') store = { format: 'cs-skill-tree-progress', version: 1, skills: {} }
const lit = () => new Set(Object.keys(store.skills).filter((k) => store.skills[k].status === 'done'))
const cards = [...document.querySelectorAll('.card.career')]
const minis = [...document.querySelectorAll('.mini')]
/** 右边的小树换成这个岗位的，重新长一遍 */
const show = (id) => minis.forEach((m) => m.classList.toggle('on', m.dataset.id === id))
function render() {
  const l = lit()
  for (const b of document.querySelectorAll('.quick .chip')) b.setAttribute('aria-pressed', l.has(b.dataset.s))
  for (const n of document.querySelectorAll('.mini .n[data-s]')) n.classList.toggle('lit', l.has(n.dataset.s))
  document.querySelector('.careers').classList.toggle('ranked', l.size > 0)
  let best = null
  for (const c of cards) {
    const meta = c.querySelector('.meta')
    meta.dataset.base ??= meta.innerHTML
    if (!l.size) {
      meta.innerHTML = meta.dataset.base
      c.style.order = ''
      continue
    }
    const need = D.careers[c.dataset.id]
    const left = need.filter((s) => !l.has(s)).length
    c.style.order = left
    meta.innerHTML = left ? '还差 <strong>' + left + '</strong> 个 · 已点亮 ' + (need.length - left) + ' / ' + need.length : '<strong>已达成</strong>'
    c.style.setProperty('--done', (need.length - left) / need.length)
    if (!best || left < best.left) best = { id: c.dataset.id, left }
  }
  return best?.id
}
function toggle(id) {
  const on = !lit().has(id)
  for (const s of on ? [...D.up[id], id] : [id, ...D.down[id]]) {
    if (on) store.skills[s] = { status: 'done' }
    else if (store.skills[s]?.status === 'done') delete store.skills[s]
  }
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
  const best = render()
  if (best) show(best)
}
for (const b of document.querySelectorAll('.quick .chip')) b.addEventListener('click', () => toggle(b.dataset.s))
for (const c of cards) for (const ev of ['pointerenter', 'focus']) c.addEventListener(ev, () => show(c.dataset.id))
const best = render()
if (best) show(best)
</script>
`,
    })
  }

  /** 职业页、技能页 HTML 里的一个小节 */
  const list = (title: string, items: string[]) => (items.length ? `<h2>${title}</h2><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '')

  // ── 职业页：这个职业的天赋树。HTML 里是同样的内容，给搜索引擎和还没加载完的时候看 ──
  for (const c of rm.subs) {
    const root = '../../'
    const nSteps = Math.max(...c.plan.map((p) => p.step))
    const skillLink = (id: string) => `<a href="${root}skill/${id}/">${esc(sk(id).name)}</a>`
    put({
      path: `career/${c.id}/`,
      title: `${c.name}要学什么？${c.plan.length} 个技能的学习路线 | ${NAME}`,
      description: `${c.intro}从${sk(c.plan[0].skillId).name}开始，按顺序分 ${nSteps} 步列出要学的 ${c.plan.length} 个技能，每个技能附公开课。`,
      crumbs: [[NAME, ''], ['职业路线', '#careers'], [c.name, `career/${c.id}/`]],
      app,
      body: `<h1>${esc(c.name)}</h1>
<p>${esc(c.intro)}</p>
${list('平时做什么', c.topics.map(esc))}
${list(`学习路线：${c.plan.length} 个技能`, c.plan.map((p) => skillLink(p.skillId)))}
${list('加分项', c.bonus.map(skillLink))}
${list('可以参考的开源项目', c.projects.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`))}`,
    })
  }

  // ── 技能页：大图，这个技能的卡片已经打开。HTML 里是同样的内容 ──
  for (const s of rm.skills) {
    const pre = s.prerequisites.map(sk)
    const desc =
      `${s.intro}` +
      (s.steps.length ? `分 ${s.steps.length} 步学：${s.steps.join('、')}。` : '') +
      (pre.length ? `前置：${pre.map((x) => x.name).join('、')}。` : '不需要前置，可以直接开始。')
    put({
      path: `skill/${s.id}/`,
      title: `${s.name}怎么学：学习流程和公开课 | ${NAME}`,
      description: desc,
      crumbs: [[NAME, ''], [areas.get(s.areaId)!.name, '#skills'], [s.name, `skill/${s.id}/`]],
      app,
      body: `<h1>${esc(s.name)}</h1>
<p>${esc(s.intro)}</p>
${list('学习流程', s.steps.map(esc))}
${list('去哪学', s.resources.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a> ${esc(l.kind)} · ${l.free ? '免费' : '付费'}`))}`,
    })
  }

  // ── sitemap ──
  const urls = [...out.keys()].map((k) => SITE + k.replace(/index\.html$/, ''))
  urls.splice(1, 0, SITE + 'tree/')
  out.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`)
  return out
}

// ── 命令行：写进 dist/ ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
  const DIST = join(ROOT, 'dist')
  const rm = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'roadmap.json'), 'utf8')) as Roadmap
  // 除了技能树（dist/tree，vite 刚打包好的），其余全部重写
  for (const f of readdirSync(DIST)) if (f !== 'tree') rmSync(join(DIST, f), { recursive: true, force: true })
  // 职业页和技能页要加载技能树：从 vite 打包好的 tree/index.html 里拿脚本和样式
  const treeHtml = readFileSync(join(DIST, 'tree', 'index.html'), 'utf8')
  // 相对路径（./assets/…）换成从职业页、技能页出发的 ../../tree/assets/…
  const app = (treeHtml.match(/<script type="module"[^>]*><\/script>|<link rel="(?:stylesheet|modulepreload)"[^>]*>/g) ?? []).join('\n').replaceAll('"./assets/', '"../../tree/assets/')
  const site = renderSite(rm, app)
  for (const [path, html] of site) {
    mkdirSync(dirname(join(DIST, path)), { recursive: true })
    writeFileSync(join(DIST, path), html)
  }
  for (const f of readdirSync(join(ROOT, 'site'))) copyFileSync(join(ROOT, 'site', f), join(DIST, f))
  copyFileSync(join(ROOT, 'docs', 'og.jpg'), join(DIST, 'og.jpg'))
  console.log(`静态页面：${site.size} 个文件`)
}
