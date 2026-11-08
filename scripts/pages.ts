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

  /**
   * 首页的岗位圆环：17 个岗位是一圈扇形按钮，扇形里只有图标；同一个大方向的挨着，大方向之间空开一点，大方向的名字写在圆环外面。
   * 从正上方开始顺时针。字都在这张图里，跟圆环一起缩放，窗口怎么变，字和圆环的相对位置都不变。
   */
  const careerRing = () => {
    const [RI, RO, RP] = [190, 330, 346] // 扇形内外半径、进度弧
    const FS = 40 // 大方向名字最大的字号（图里的单位，手机上用这么大；电脑上样式里写小一点）
    const GAP = 0.6 // 大方向之间空出几个扇形的位置
    const PAD = 0.012 // 扇形之间的缝（弧度）
    const unit = (Math.PI * 2) / (rm.subs.length + rm.categories.length * GAP)
    // 转一下，让名字最长的大方向落在正下方（居中写），左右两边只剩短名字，圆环可以画大一点
    const longest = rm.categories.reduce((m, c) => ([...c.name].length > [...m.name].length ? c : m))
    let before = GAP / 2
    for (const c of rm.categories.slice(0, rm.categories.indexOf(longest))) before += c.subIds.length + GAP
    const ROT = Math.PI - (before + longest.subIds.length / 2) * unit
    const r1 = (n: number) => Math.round(n * 10) / 10
    const pt = (r: number, a: number) => [r1(r * Math.sin(a + ROT)), r1(-r * Math.cos(a + ROT))]
    const arc = (r: number, a1: number, a2: number) => {
      const [x1, y1] = pt(r, a1)
      const [x2, y2] = pt(r, a2)
      return `M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`
    }
    const width = (t: string) => [...t].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.58), 0) * FS
    const box = { x: RP, y: RP }
    const parts: string[] = []
    let pos = GAP / 2
    let i = 0
    for (const cat of rm.categories) {
      // 大方向的名字：写在它那段圆弧正中的外面；左右两边朝外写，正上正下居中
      const mid = (pos + cat.subIds.length / 2) * unit
      const [sx, cy] = [Math.sin(mid + ROT), -Math.cos(mid + ROT)]
      const [lx, ly] = pt(RP + 40 + FS * 0.4 * Math.abs(cy), mid)
      const anchor = Math.abs(sx) < 0.35 ? 'middle' : sx > 0 ? 'start' : 'end'
      const w = width(cat.name)
      box.x = Math.max(box.x, Math.abs(lx) + (anchor === 'middle' ? w / 2 : w) + 8)
      box.y = Math.max(box.y, Math.abs(ly) + FS * 0.6)
      parts.push(`<text class="cat" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(cat.name)}</text>`)
      for (const id of cat.subIds) {
        const c = subs.get(id)!
        const a1 = pos * unit
        const a = a1 + unit / 2
        const [b1, b2] = [a1 + PAD, a1 + unit - PAD]
        const [ix, iy] = pt((RI + RO) / 2, a)
        const [dx, dy] = pt(16, a)
        const [ox1, oy1] = pt(RO, b1)
        const [ox2, oy2] = pt(RO, b2)
        const [ix2, iy2] = pt(RI, b2)
        const [jx1, jy1] = pt(RI, b1)
        const [tx, ty] = pt(RO, a) // 悬停时名字标签挂在扇形外沿正中
        parts.push(`<a class="job" href="career/${c.id}/" data-id="${c.id}" data-name="${esc(c.name)}" data-cat="${esc(cat.name)}" data-intro="${esc(c.intro)}" data-tx="${tx}" data-ty="${ty}" style="--i:${i++};--dx:${dx}px;--dy:${dy}px" aria-label="${esc(c.name)}">` +
          `<g class="w"><path class="wedge" d="M${ox1},${oy1} A${RO},${RO} 0 0 1 ${ox2},${oy2} L${ix2},${iy2} A${RI},${RI} 0 0 0 ${jx1},${jy1}Z"/>` +
          `<g transform="translate(${r1(ix - 26)},${r1(iy - 26)}) scale(2.17)">${icon(c.icon)}</g>` +
          `<path class="prog" d="${arc(RP, b1, b2)}" pathLength="100" stroke-dasharray="0 100"/></g></a>`)
        pos++
      }
      pos += GAP
    }
    const [hw, hh] = [Math.ceil(box.x), Math.ceil(box.y)]
    return `<div class="ring" style="--hw:${hw};--hh:${hh}"><svg class="jobs" viewBox="${-hw} ${-hh} ${hw * 2} ${hh * 2}" role="group" aria-label="${rm.subs.length} 个岗位">${parts.join('')}</svg><span class="tag" hidden></span></div>`
  }

  // ── 首页：一个问题“你想学什么”，一圈 17 个岗位。点一个，右边写它是什么、长出它的技能树；点“就学这个”记下来，进这条路线 ──
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
  <section id="careers">${careerRing()}</section>
  <aside class="pick">
    <p class="pick-hint">点圆环上的一个岗位</p>
    <h2 class="pk-name"></h2>
    <p class="pk-meta"></p>
    <p class="pk-intro"></p>
    <div class="minis">${rm.subs.map((c) => `<div class="mini" data-id="${c.id}">${miniTree(c, false)}${miniTree(c, true)}</div>`).join('')}</div>
    ${rm.subs.map((c) => `<div class="has" data-id="${c.id}"><p class="pk-ask">要学这 ${c.plan.length} 个，会的点一下</p><div class="quick">${c.plan.map(({ skillId: id }) => `<button type="button" class="chip" data-s="${id}" aria-pressed="false"><svg width="14" height="14" aria-hidden="true"><use href="#i-${id}"/></svg>${esc(sk(id).name)}</button>`).join('')}</div></div>`).join('')}
    <a class="go" href="">就学这个</a>
  </aside>
</div>

<script>
const KEY = ${JSON.stringify(PROGRESS_KEY)}, D = ${JSON.stringify(data)}
let store = null
try { store = JSON.parse(localStorage.getItem(KEY)) } catch {}
if (store?.format !== 'cs-skill-tree-progress') store = { format: 'cs-skill-tree-progress', version: 1, skills: {} }
const lit = () => new Set(Object.keys(store.skills).filter((k) => store.skills[k].status === 'done'))
const page = document.querySelector('.home')
const ring = document.querySelector('.ring')
const tag = ring.querySelector('.tag')
const pick = document.querySelector('.pick')
const minis = pick.querySelector('.minis')
const jobs = [...document.querySelectorAll('.job')]
const job = (id) => jobs.find((j) => j.dataset.id === id)
let current = null
try { current = localStorage.getItem(${JSON.stringify(ROUTE_KEY)}) } catch {}
if (!D.careers[current]) current = null
const saved = current
/** 一个岗位还差几个、一共几个 */
const count = (id) => {
  const l = lit()
  const need = D.careers[id]
  return { total: need.length, left: need.filter((s) => !l.has(s)).length }
}
/** 选中一个岗位：扇形弹出来，右边换成它：名字、介绍、小树（重新长一遍）、要学的技能 */
function choose(id) {
  current = id
  const j = job(id)
  page.classList.add('chosen')
  for (const x of jobs) x.classList.toggle('on', x === j)
  for (const m of pick.querySelectorAll('.mini, .has')) m.classList.toggle('on', m.dataset.id === id)
  pick.querySelector('.pk-name').textContent = j.dataset.name
  pick.querySelector('.pk-intro').textContent = j.dataset.intro
  const go = pick.querySelector('.go')
  go.setAttribute('href', 'career/' + id + '/index.html')
  go.textContent = id === saved ? '继续学这个' : '就学这个'
  render()
  layout()
}
/**
 * 小树竖着还是横着：哪个在这块地方画得大用哪个。这块地方是右栏里剩下的高度（两栏并排时右栏和圆环一样高），
 * 窄屏上一栏排下来，给一个固定高度。挑好后框按树的形状收紧。
 */
function layout() {
  const m = pick.querySelector('.mini.on')
  if (!m) return
  minis.style.height = '0px'
  const wide = getComputedStyle(page).gridTemplateColumns.split(' ').length > 1
  // 右栏除了小树还要放的：名字到技能列表，加上按钮
  const used = pick.querySelector('.has.on').getBoundingClientRect().bottom - pick.getBoundingClientRect().top + pick.querySelector('.go').offsetHeight + 32
  const h = wide ? Math.max(260, ring.offsetHeight - used) : 320
  const w = minis.clientWidth
  const box = (svg) => svg.getAttribute('viewBox').split(' ').map(Number).slice(2)
  const fit = ([vw, vh]) => Math.min(w / vw, h / vh)
  const side = fit(box(m.querySelector('.side'))) > fit(box(m.querySelector('.up')))
  m.classList.toggle('is-side', side)
  const [vw, vh] = box(m.querySelector(side ? '.side' : '.up'))
  minis.style.height = Math.round(Math.min(h, (w * vh) / vw)) + 'px'
}
/** 大方向的名字在屏幕上保持 16px 左右（图里留的地方最多放得下 40 个单位） */
function catSize() {
  const svg = ring.querySelector('svg')
  ring.style.setProperty('--cat', Math.min(40, (16 * svg.viewBox.baseVal.width) / svg.clientWidth).toFixed(1))
}
addEventListener('resize', () => {
  catSize()
  layout()
})
catSize()
function render() {
  const l = lit()
  for (const b of pick.querySelectorAll('.quick .chip')) b.setAttribute('aria-pressed', l.has(b.dataset.s))
  for (const n of pick.querySelectorAll('.mini .n[data-s]')) n.classList.toggle('lit', l.has(n.dataset.s))
  for (const j of jobs) {
    const { total, left } = count(j.dataset.id)
    j.querySelector('.prog').setAttribute('stroke-dasharray', Math.round((100 * (total - left)) / total) + ' 100')
    j.classList.toggle('done', left === 0)
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
// 悬停：扇形外沿挂一个名字标签（位置按圆环的比例算，跟着圆环缩放）
const [hw, hh] = [+getComputedStyle(ring).getPropertyValue('--hw'), +getComputedStyle(ring).getPropertyValue('--hh')]
for (const j of jobs) {
  j.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return
    tag.textContent = j.dataset.name
    tag.style.left = (50 + (50 * j.dataset.tx) / hw) + '%'
    tag.style.top = (50 + (50 * j.dataset.ty) / hh) + '%'
    tag.dataset.side = j.dataset.tx > 0 ? 'r' : 'l'
    tag.hidden = false
  })
  j.addEventListener('pointerleave', () => { tag.hidden = true })
  j.addEventListener('click', (e) => {
    e.preventDefault()
    if (current !== j.dataset.id) choose(j.dataset.id)
  })
}
pick.querySelector('.go').addEventListener('click', () => {
  try { localStorage.setItem(${JSON.stringify(ROUTE_KEY)}, current) } catch {}
})
if (current) choose(current)
else render()
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
