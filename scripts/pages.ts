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
import type { Roadmap, Skill, Sub } from '../src/types.ts'
import { ICONS } from '../src/generated/icons.ts'
import { Tree } from '../src/lib/tree.ts'
import { hexPath, layoutTree, NODE_R, START_R, subNodeId, TIP_R } from '../src/lib/layout.ts'
import { ROUTE_KEY, SEEN_KEY } from '../src/lib/route.ts'

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
    const l = layoutTree(tree, { career: c.id })
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
      return `<g class="n" data-s="${id}" transform="translate(${x},${y})"><g ${delay(y)}>${shape}<use href="#i-${id}" x="-15" y="-15" width="30" height="30"/></g></g>`
    }).join('')
    const t = at(subNodeId(c.id))
    return `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" aria-hidden="true">${edges}${nodes}<g class="n tip" transform="translate(${t.x},${t.y})"><g ${delay(t.y)}><circle r="${TIP_R}"/><circle r="${TIP_R - 7}"/><g transform="translate(-20,-20) scale(1.67)">${icon(c.icon)}</g></g></g><g class="you"><circle r="${START_R}"/><text>你</text></g></svg>`
  }

  const skillChip = (s: Skill, root: string) => `<a class="chip" href="${root}skill/${s.id}/">${icon(s.icon, 16)}${esc(s.name)}</a>`
  /**
   * 首页的岗位圆环：17 个岗位是一圈扇形按钮，同一个大方向的挨着，大方向之间空开一点；从正上方开始顺时针。
   * 扇形中间是图标，外面一道细弧是进度；名字写在圆环外面（手机上放不下，只在圆心写正看着的那个）。
   */
  const careerRing = () => {
    const [RI, RO] = [178, 300] // 扇形的内外半径
    const RP = 316 // 进度弧
    const GAP = 0.6 // 大方向之间空出几个扇形的位置
    const PAD = 0.012 // 扇形之间的缝（弧度）
    const unit = (Math.PI * 2) / (rm.subs.length + rm.categories.length * GAP)
    const r1 = (n: number) => Math.round(n * 10) / 10
    const pt = (r: number, a: number) => [r1(r * Math.sin(a)), r1(-r * Math.cos(a))]
    const arc = (r: number, a1: number, a2: number) => {
      const [x1, y1] = pt(r, a1)
      const [x2, y2] = pt(r, a2)
      return `M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`
    }
    const jobs: { c: Sub; cat: string; a1: number; a2: number; lx: number; ly: number }[] = []
    let pos = GAP / 2
    for (const cat of rm.categories) {
      cat.subIds.forEach((id, i) => {
        const a1 = (pos + i) * unit
        const a = a1 + unit / 2
        // 越靠近正上方、正下方，名字（横着写）越要离圆环远一点才不压到它
        const [lx, ly] = pt(RP + 26 + 34 * Math.cos(a) ** 2, a)
        jobs.push({ c: subs.get(id)!, cat: cat.name, a1, a2: a1 + unit, lx, ly })
      })
      pos += cat.subIds.length + GAP
    }
    // 同一边上下挨得太近的名字往下错开
    for (const right of [true, false]) {
      const half = jobs.filter((j) => Math.sin(j.a1 + unit / 2) > 0 === right).sort((p, q) => p.ly - q.ly)
      for (let k = 1; k < half.length; k++) half[k].ly = Math.max(half[k].ly, half[k - 1].ly + 34)
    }
    const wedges = jobs.map(({ c, cat, a1, a2, lx, ly }, i) => {
      const [b1, b2] = [a1 + PAD, a2 - PAD]
      const a = (a1 + a2) / 2
      const [ix, iy] = pt((RI + RO) / 2, a)
      const [dx, dy] = pt(14, a)
      const [ox1, oy1] = pt(RO, b1)
      const [ox2, oy2] = pt(RO, b2)
      const [ix2, iy2] = pt(RI, b2)
      const [ix1, iy1] = pt(RI, b1)
      const shape = `M${ox1},${oy1} A${RO},${RO} 0 0 1 ${ox2},${oy2} L${ix2},${iy2} A${RI},${RI} 0 0 0 ${ix1},${iy1}Z`
      return `<a class="job" href="career/${c.id}/" data-id="${c.id}" data-name="${esc(c.name)}" data-cat="${esc(cat)}" data-intro="${esc(c.intro)}" style="--i:${i};--dx:${dx}px;--dy:${dy}px">` +
        `<g class="w"><path class="wedge" d="${shape}"/><g transform="translate(${ix - 22},${iy - 22}) scale(1.83)">${icon(c.icon)}</g>` +
        `<path class="track" d="${arc(RP, b1, b2)}"/><path class="prog" d="${arc(RP, b1, b2)}" pathLength="100" stroke-dasharray="0 100"/></g>` +
        `<text class="job-name" x="${lx}" y="${r1(ly)}" text-anchor="${Math.sin(a) > 0 ? 'start' : 'end'}">${esc(c.name.replace(/工程师$/, ''))}</text></a>`
    })
    return `<div class="ring-wrap"><svg class="jobs" viewBox="-560 -410 1120 840">${wedges.join('')}</svg>` +
      `<div class="ring-center"><b class="rc-name"></b><span class="rc-meta"></span><p class="rc-intro"></p></div></div>`
  }

  // ── 首页：一个问题“你想学什么”，一圈 17 个岗位。点一个，旁边长出它的技能树；点“就学这个”记下来，进这条路线 ──
  {
    // 首页的脚本要用的：每个岗位要学的技能，每个常见技能的全部前置（选它就算会这些）
    const data = {
      careers: Object.fromEntries(rm.subs.map((c) => [c.id, c.plan.map((p) => p.skillId)])),
      up: Object.fromEntries(QUICK.map((id) => [id, [...tree.ancestors(id)]])),
    }
    const all = rm.areas
      .map((a) => `<section class="group"><h3>${esc(a.name)}<span>${a.skillIds.length}</span></h3><p class="muted">${esc(a.intro)}</p><div class="chips">${a.skillIds.map((id) => skillChip(sk(id), '')).join('')}</div></section>`)
      .join('')
    put({
      path: '',
      title: `${NAME}：${rm.skills.length} 个计算机技能和 ${rm.subs.length} 个职业的学习路线`,
      description: `一棵 ${rm.skills.length} 个技能的计算机技能树：点亮你会的，看清自己的能力边界，按 ${rm.subs.length} 个职业倒推学习路线，每个技能附公开课。免费，不用注册。`,
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
<div class="home">
<section id="careers" class="ask">
  <h1>你想学什么？</h1>
  ${careerRing()}
</section>

<svg width="0" height="0" class="defs" aria-hidden="true">${[...new Set(rm.subs.flatMap((c) => [...tree.closures.get(c.id)!]))].map((id) => `<symbol id="i-${id}" viewBox="0 0 24 24">${icon(sk(id).icon)}</symbol>`).join('')}</svg>
<aside class="pick">
  <p class="pick-hint">点一个岗位，这里长出它要学的技能</p>
  <div class="pick-body">
    <h2 class="pk-name"></h2>
    <p class="pk-meta"></p>
    <div class="minis">${rm.subs.map((c) => `<div class="mini" data-id="${c.id}">${miniTree(c)}</div>`).join('')}</div>
    <p class="pk-ask">已经会的，先点亮</p>
    <div class="quick">${QUICK.map((id) => `<button type="button" class="chip" data-s="${id}" aria-pressed="false">${icon(sk(id).icon, 16)}${esc(sk(id).name)}</button>`).join('')}</div>
    <a class="go" href="">就学这个</a>
  </div>
</aside>
</div>

<details id="skills" class="block">
  <summary>全部 ${rm.skills.length} 个技能</summary>
  ${all}
</details>
<script>
const KEY = ${JSON.stringify(PROGRESS_KEY)}, HOME_KEY = 'cs-skill-tree:home', D = ${JSON.stringify(data)}
let store = null
try { store = JSON.parse(localStorage.getItem(KEY)) } catch {}
if (store?.format !== 'cs-skill-tree-progress') store = { format: 'cs-skill-tree-progress', version: 1, skills: {} }
// 首页记两样：你亲手选了哪些（按钮只亮这些），以及为它们点亮了哪些原本没亮的（取消时只撤这些，树里点亮的不动）
let home = { picks: [], added: [] }
try {
  const h = JSON.parse(localStorage.getItem(HOME_KEY))
  if (Array.isArray(h?.picks) && Array.isArray(h?.added)) home = h
} catch {}
const lit = () => new Set(Object.keys(store.skills).filter((k) => store.skills[k].status === 'done'))
const page = document.querySelector('.home')
const jobs = [...document.querySelectorAll('.job')]
const center = document.querySelector('.ring-center')
const pick = document.querySelector('.pick')
let current = null
try { current = localStorage.getItem(${JSON.stringify(ROUTE_KEY)}) } catch {}
if (!D.careers[current]) current = null
const saved = current
/** 一个岗位还差几个、一共几个 */
const count = (id) => {
  const need = D.careers[id]
  return { total: need.length, left: need.filter((s) => !lit().has(s)).length }
}
const job = (id) => jobs.find((j) => j.dataset.id === id)
/** 圆心写一个岗位（悬停时是悬停的，否则是选中的） */
function show(id) {
  const name = center.querySelector('.rc-name')
  const meta = center.querySelector('.rc-meta')
  const intro = center.querySelector('.rc-intro')
  if (!id) {
    name.textContent = '${rm.subs.length} 个岗位'
    name.style.removeProperty('--len')
    meta.textContent = '点一个看看'
    intro.textContent = ''
    return
  }
  const j = job(id)
  const { total, left } = count(id)
  name.textContent = j.dataset.name
  // 名字一行放下：中文按一个字宽，英文数字按半个多一点
  name.style.setProperty('--len', [...j.dataset.name].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0))
  meta.textContent = j.dataset.cat + ' · ' + (left === total ? total + ' 个技能' : left ? '还差 ' + left + ' 个' : '已达成')
  intro.textContent = j.dataset.intro
}
/** 选中一个岗位：扇形弹出来，旁边换成它的小树、重新长一遍 */
function choose(id, scroll) {
  current = id
  page.classList.add('chosen')
  for (const j of jobs) j.classList.toggle('on', j.dataset.id === id)
  for (const m of document.querySelectorAll('.mini')) m.classList.toggle('on', m.dataset.id === id)
  pick.querySelector('.pk-name').textContent = job(id).dataset.name
  const go = pick.querySelector('.go')
  go.setAttribute('href', 'career/' + id + '/index.html')
  go.textContent = id === saved ? '继续学这个' : '就学这个'
  render()
  // 窄屏上小树在圆环下面：先看扇形弹出来，再滚下去
  if (scroll && matchMedia('(max-width: 860px)').matches) setTimeout(() => pick.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
}
function render() {
  const l = lit()
  for (const b of document.querySelectorAll('.quick .chip')) b.setAttribute('aria-pressed', home.picks.includes(b.dataset.s))
  for (const n of document.querySelectorAll('.mini .n[data-s]')) n.classList.toggle('lit', l.has(n.dataset.s))
  for (const j of jobs) {
    const { total, left } = count(j.dataset.id)
    j.querySelector('.prog').setAttribute('stroke-dasharray', Math.round((100 * (total - left)) / total) + ' 100')
    j.classList.toggle('done', left === 0)
  }
  if (current) {
    const { total, left } = count(current)
    pick.querySelector('.pk-meta').textContent = '共 ' + total + ' 个技能' + (left < total ? '，你已会 ' + (total - left) + ' 个' : '')
  }
  show(current)
}
function toggle(id) {
  const picks = new Set(home.picks)
  const added = new Set(home.added)
  if (picks.delete(id)) {
    // 撤掉为它点亮的，除非还有别的选择要用到
    const keep = new Set([...picks].flatMap((p) => [p, ...D.up[p]]))
    for (const s of added) if (!keep.has(s)) {
      delete store.skills[s]
      added.delete(s)
    }
  } else {
    picks.add(id)
    for (const s of [...D.up[id], id]) if (store.skills[s]?.status !== 'done') {
      store.skills[s] = { status: 'done' }
      added.add(s)
    }
  }
  home = { picks: [...picks], added: [...added] }
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
    localStorage.setItem(HOME_KEY, JSON.stringify(home))
  } catch {}
  render()
}
for (const b of document.querySelectorAll('.quick .chip')) b.addEventListener('click', () => toggle(b.dataset.s))
for (const j of jobs) {
  j.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(j.dataset.id) })
  j.addEventListener('pointerleave', () => show(current))
  j.addEventListener('click', (e) => {
    e.preventDefault()
    if (current !== j.dataset.id) choose(j.dataset.id, true)
  })
}
pick.querySelector('.go').addEventListener('click', () => {
  try { localStorage.setItem(${JSON.stringify(ROUTE_KEY)}, current) } catch {}
})
// 手机上圆环外面放不下名字：只画圆环
const narrow = matchMedia('(max-width: 560px)')
const fit = () => document.querySelector('.jobs').setAttribute('viewBox', narrow.matches ? '-330 -330 660 660' : '-560 -410 1120 840')
narrow.addEventListener('change', fit)
fit()
if (current) choose(current, false)
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
