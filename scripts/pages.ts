// 静态页面：首页、每个技能一页、每个职业一页，加 sitemap。
// 技能树本身是单页应用（在 /tree/），搜索引擎看不到里面的内容；这些页面是写死的 HTML，
// 让人能搜到“Docker 怎么学”“大模型算法工程师要学什么”，也方便把单个技能、单个职业分享出去。
// 同一个意思只有一个页面：职业页打开就是这个职业的天赋树，技能页打开就是它所在领域的树，这个技能的卡片已经打开。
// HTML 里写好同样的内容给搜索引擎，技能树的脚本加载后接管整页。
//
// 用法：npm run build 在 vite 打包完技能树之后跑这个，写进 dist/。
// renderSite() 只返回 { 路径: 内容 }，不碰磁盘，测试直接用它。
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Roadmap, Sub } from '../src/types.ts'
import { ICONS } from '../src/generated/icons.ts'
import { Tree } from '../src/lib/tree.ts'
import { hexPath, layoutTree, NODE_R, subNodeId, TIP_R } from '../src/lib/layout.ts'
import { ROUTE_KEY, SEEN_KEY } from '../src/lib/route.ts'

export const SITE = 'https://theowang42.github.io/cs-skill-tree/'
const REPO = 'https://github.com/theowang42/cs-skill-tree'
const NAME = 'CS 技能树'
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
  <nav><a href="${root}tree/">全部技能</a></nav>
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
  const miniTree = (c: Sub, side: boolean) => {
    const l = layoutTree(tree, { career: c.id })
    // 小树不写名字，层和层之间压紧一点（K）；横着的就是把往上长的整棵转 90°：往上变成往右，图标不转
    const K = 0.55
    const P = (x: number, y: number) => (side ? [-y * K, x] : [x, y * K]).map(Math.round)
    const { minX, maxX } = l.bounds
    const [minY, maxY] = [l.bounds.minY * K, l.bounds.maxY * K]
    const [vx, vy, vw, vh] = (side ? [-maxY, minX, maxY - minY, maxX - minX] : [minX, minY, maxX - minX, maxY - minY]).map(Math.round)
    const at = (id: string) => l.nodes.get(id)!
    const delay = (y: number) => `style="animation-delay:${Math.round(-y * 0.55)}ms"`
    const move = (x: number, y: number) => `transform="translate(${P(x, y).join(',')})"`
    // 小树没有名字，枝条直接连到节点中心（节点是白底，盖住线头）：父节点往前一点拐过去，再到孩子
    const edges = l.edges.map((e) => {
      const a = e.from === 'root' ? { x: 0, y: 0 } : at(e.from)
      const b = at(e.to)
      const pts = a.x === b.x ? [[a.x, a.y], [b.x, b.y]] : [[a.x, a.y], [a.x, a.y - 80], [b.x, a.y - 80], [b.x, b.y]]
      const d = 'M' + pts.map(([x, y]) => P(x, y).join(',')).join(' L')
      return `<path class="e" pathLength="1" d="${d}" ${delay(b.y)}/>`
    }).join('')
    const nodes = [...tree.closures.get(c.id)!].map((id) => {
      const { x, y } = at(id)
      const shape = sk(id).language ? `<path d="${hexPath(NODE_R + 2)}"/>` : `<circle r="${NODE_R}"/>`
      return `<g class="n" data-s="${id}" ${move(x, y)}><g ${delay(y)}>${shape}<use href="#i-${id}" x="-15" y="-15" width="30" height="30"/></g></g>`
    }).join('')
    const t = at(subNodeId(c.id))
    return `<svg class="${side ? 'side' : 'up'}" viewBox="${vx} ${vy} ${vw} ${vh}" aria-hidden="true">${edges}${nodes}<g class="n tip" ${move(t.x, t.y)}><g ${delay(t.y)}><circle r="${TIP_R}"/><circle r="${TIP_R - 7}"/><g transform="translate(-20,-20) scale(1.67)">${icon(c.icon)}</g></g></g><circle class="you" r="16"/></svg>`
  }

  /** 首页的岗位列表：按大方向分组，大方向竖着写在组的左边；一行一个岗位：图标、名字、一句话，点亮了多少从行底铺开 */
  let row = 0
  const careerList = () =>
    rm.categories.map((cat, g) => `<div class="group" style="--g:${g}"><h2>${esc(cat.name)}</h2><div class="jobs">${cat.subIds.map((id) => {
      const c = subs.get(id)!
      return `<a class="job" href="career/${c.id}/" data-id="${c.id}" data-name="${esc(c.name)}" data-cat="${esc(cat.name)}" data-intro="${esc(c.intro)}" style="--i:${row++}">${icon(c.icon, 18)}<b>${esc(c.name)}</b><span class="br">${esc(c.brief)}</span><i aria-hidden="true">→</i></a>`
    }).join('')}</div></div>`).join('')

  // ── 首页：一个问题“你想学什么”，下面一屏列出全部 17 个岗位，一行一个。点一个，旁边滑出抽屉（手机上从底下升起）：它是什么、它的技能树；点“就学这个”记下来，进这条路线 ──
  {
    // 首页的脚本要用的：每个岗位要学的技能，每个技能的全部前置（点亮它就连前置一起点亮，熄灭它就连依赖它的一起熄灭）
    const data = {
      careers: Object.fromEntries(rm.subs.map((c) => [c.id, c.plan.map((p) => p.skillId)])),
      up: Object.fromEntries(rm.skills.map((s) => [s.id, [...tree.ancestors(s.id)]])),
    }
    put({
      path: '',
      title: `你想学什么？${rm.subs.length} 个计算机岗位，各要学哪些技能 | ${NAME}`,
      description: `${rm.subs.length} 个计算机岗位，各要学哪些技能、按什么顺序学、去哪免费学。点亮你会的，看离岗位还差几个。免费，不用注册。`,
      body: `
<script>
/* 技能树以前在首页：旧的分享链接和技能链接（#share=… / #/skill/…）转到 tree/ */
if (/^#(\\/|share=)/.test(location.hash)) location.replace('tree/' + location.hash)
/* 选定过路线：新打开首页直接进去；同一个标签页里再回首页（想换方向）就不跳 */
try {
  const route = localStorage.getItem(${JSON.stringify(ROUTE_KEY)})
  if (${JSON.stringify(rm.subs.map((c) => c.id))}.includes(route) && !sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})) location.replace('career/' + route + '/index.html')
  sessionStorage.setItem(${JSON.stringify(SEEN_KEY)}, '1')
} catch {}
</script>
<svg width="0" height="0" class="defs" aria-hidden="true">${[...new Set(rm.subs.flatMap((c) => [...tree.closures.get(c.id)!]))].map((id) => `<symbol id="i-${id}" viewBox="0 0 24 24">${icon(sk(id).icon)}</symbol>`).join('')}</svg>
<div class="home">
  <h1>你想学什么？</h1>
  <section id="careers">${careerList()}</section>
</div>
<div class="scrim"></div>
<aside class="pick" aria-label="岗位详情" inert>
  <button type="button" class="x" aria-label="关闭"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16"/></svg></button>
  <h2 class="pk-name"></h2>
  <p class="pk-meta"></p>
  <p class="pk-intro"></p>
  ${rm.subs.map((c) => `<p class="dom" data-id="${c.id}"><b>技能在</b>${rm.areas.map((a) => [a, c.plan.filter((p) => sk(p.skillId).areaId === a.id).length] as const).filter(([, n]) => n).map(([a, n]) => `<a href="tree/#/area/${a.id}">${esc(a.name)} ${n}</a>`).join('')}</p>`).join('')}
  <div class="minis">${rm.subs.map((c) => `<div class="mini" data-id="${c.id}">${miniTree(c, false)}${miniTree(c, true)}</div>`).join('')}</div>
  ${rm.subs.map((c) => `<div class="has" data-id="${c.id}"><p class="pk-ask">要学这 ${c.plan.length} 个，会的点一下</p><div class="quick">${c.plan.map(({ skillId: id }) => `<button type="button" class="chip" data-s="${id}" aria-pressed="false"><svg width="14" height="14" aria-hidden="true"><use href="#i-${id}"/></svg>${esc(sk(id).name)}</button>`).join('')}</div></div>`).join('')}
  <a class="go" href="">就学这个</a>
</aside>

<script>
const KEY = ${JSON.stringify(PROGRESS_KEY)}, D = ${JSON.stringify(data)}
let store = null
try { store = JSON.parse(localStorage.getItem(KEY)) } catch {}
if (store?.format !== 'cs-skill-tree-progress') store = { format: 'cs-skill-tree-progress', version: 1, skills: {} }
const lit = () => new Set(Object.keys(store.skills).filter((k) => store.skills[k].status === 'done'))
const home = document.querySelector('.home')
const pick = document.querySelector('.pick')
const scrim = document.querySelector('.scrim')
const minis = pick.querySelector('.minis')
const jobs = [...document.querySelectorAll('.job')]
const job = (id) => jobs.find((j) => j.dataset.id === id)
let current = null
let saved = null
try { saved = localStorage.getItem(${JSON.stringify(ROUTE_KEY)}) } catch {}
/** 一个岗位还差几个、一共几个 */
const count = (id) => {
  const l = lit()
  const need = D.careers[id]
  return { total: need.length, left: need.filter((s) => !l.has(s)).length }
}
/** 打开一个岗位的抽屉：这一行变黑，抽屉里换成它：名字、介绍、小树（重新长一遍）、要学的技能；id 为空就关上 */
function choose(id) {
  current = id
  const j = job(id)
  for (const x of jobs) x.classList.toggle('on', x === j)
  pick.classList.toggle('open', !!j)
  pick.inert = !j
  if (j) {
    for (const m of pick.querySelectorAll('.mini, .has, .dom')) m.classList.toggle('on', m.dataset.id === id)
    pick.querySelector('.pk-name').textContent = j.dataset.name
    pick.querySelector('.pk-intro').textContent = j.dataset.intro
    const go = pick.querySelector('.go')
    go.setAttribute('href', 'career/' + id + '/index.html')
    go.textContent = id === saved ? '继续学这个' : '就学这个'
    pick.scrollTop = 0
    render()
    layout()
  }
  place()
}
/**
 * 抽屉旁边放得下整个列表：列表往左让开，两边都看得见；放不下（窄屏）：抽屉盖在上面，后面压一层浅灰，点它关上
 */
function place() {
  const open = pick.classList.contains('open')
  const free = innerWidth - pick.offsetWidth
  const beside = free >= home.offsetWidth + 48
  scrim.classList.toggle('on', open && !beside)
  const dx = open && beside ? Math.min(0, Math.max(24, (free - home.offsetWidth) / 2) - home.offsetLeft) : 0
  home.style.transform = dx ? 'translateX(' + dx + 'px)' : ''
}
/** 小树竖着还是横着：哪个在抽屉里（一栏宽、最高 210）画得大用哪个。挑好后框按树的形状收紧 */
function layout() {
  const m = pick.querySelector('.mini.on')
  if (!m) return
  const h = 210
  const w = minis.clientWidth
  const box = (svg) => svg.getAttribute('viewBox').split(' ').map(Number).slice(2)
  const fit = ([vw, vh]) => Math.min(w / vw, h / vh)
  const side = fit(box(m.querySelector('.side'))) > fit(box(m.querySelector('.up')))
  m.classList.toggle('is-side', side)
  const [vw, vh] = box(m.querySelector(side ? '.side' : '.up'))
  minis.style.height = Math.round(Math.min(h, (w * vh) / vw)) + 'px'
}
addEventListener('resize', () => {
  layout()
  place()
})
function render() {
  const l = lit()
  for (const b of pick.querySelectorAll('.quick .chip')) b.setAttribute('aria-pressed', l.has(b.dataset.s))
  for (const n of pick.querySelectorAll('.mini .n[data-s]')) n.classList.toggle('lit', l.has(n.dataset.s))
  for (const j of jobs) {
    const { total, left } = count(j.dataset.id)
    j.style.setProperty('--p', ((total - left) / total).toFixed(3))
  }
  if (current) {
    const { total, left } = count(current)
    pick.querySelector('.pk-meta').textContent = job(current).dataset.cat + ' · ' + total + ' 个技能' + (left === 0 ? ' · 已达成' : left < total ? ' · 还差 ' + left + ' 个' : '')
  }
}
/** 会了：连前置一起点亮。点错了再点一下：连依赖它的一起熄灭（和技能树里的规则一样） */
function toggle(id) {
  if (store.skills[id]?.status === 'done') {
    for (const s of Object.keys(store.skills)) if (s === id || D.up[s]?.includes(id)) delete store.skills[s]
  } else for (const s of [...D.up[id], id]) store.skills[s] = { status: 'done' }
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
  render()
}
for (const b of pick.querySelectorAll('.quick .chip')) b.addEventListener('click', () => toggle(b.dataset.s))
for (const j of jobs) {
  j.addEventListener('click', (e) => {
    e.preventDefault()
    // 再点一下打开着的那行就关上
    choose(current === j.dataset.id ? null : j.dataset.id)
  })
}
pick.querySelector('.x').addEventListener('click', () => choose(null))
scrim.addEventListener('click', () => choose(null))
addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) choose(null) })
pick.querySelector('.go').addEventListener('click', () => {
  try { localStorage.setItem(${JSON.stringify(ROUTE_KEY)}, current) } catch {}
})
render()
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

  // ── 技能页：它所在领域的树，这个技能的卡片已经打开。HTML 里是同样的内容 ──
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
