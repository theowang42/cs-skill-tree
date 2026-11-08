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
   * 扇形中间是图标，外面一道细弧是进度，名字写在圆环外面，名字也能点。圆心写悬停或选中的那个。
   * 电脑和手机各画一套：手机上圆环小一点、字按屏幕像素定，名字用短的。
   */
  type Ring = { ri: number; ro: number; fs: number; lift: number; spread: number; iconS: number; pop: number; track: number; label: (c: Sub) => string; cls: string }
  const ringSvg = (g: Ring) => {
    const rp = g.ro + g.track * 1.6 // 进度弧
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
    /** 名字大概多宽：中文一个字宽，英文数字半个多一点 */
    const width = (t: string) => [...t].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.58), 0) * g.fs
    const jobs: { c: Sub; cat: string; a: number; lx: number; ly: number }[] = []
    let pos = GAP / 2
    for (const cat of rm.categories) {
      cat.subIds.forEach((id, i) => {
        const a = (pos + i + 0.5) * unit
        // 越靠近正上方、正下方，名字（横着写）越要离圆环远一点才不压到它
        const [lx, ly] = pt(rp + g.fs * 0.6 + g.lift * Math.cos(a) ** 2, a)
        jobs.push({ c: subs.get(id)!, cat: cat.name, a, lx, ly })
      })
      pos += cat.subIds.length + GAP
    }
    // 同一边上下挨得太近的名字往下错开
    for (const right of [true, false]) {
      const half = jobs.filter((j) => Math.sin(j.a) > 0 === right).sort((p, q) => p.ly - q.ly)
      for (let k = 1; k < half.length; k++) half[k].ly = Math.max(half[k].ly, half[k - 1].ly + g.spread)
    }
    const box = { x1: -rp, x2: rp, y1: -rp, y2: rp }
    const wedges = jobs.map(({ c, cat, a, lx, ly }, i) => {
      const [b1, b2] = [a - unit / 2 + PAD, a + unit / 2 - PAD]
      const [ix, iy] = pt((g.ri + g.ro) / 2, a)
      const [dx, dy] = pt(g.pop, a)
      const [ox1, oy1] = pt(g.ro, b1)
      const [ox2, oy2] = pt(g.ro, b2)
      const [ix2, iy2] = pt(g.ri, b2)
      const [ix1, iy1] = pt(g.ri, b1)
      const shape = `M${ox1},${oy1} A${g.ro},${g.ro} 0 0 1 ${ox2},${oy2} L${ix2},${iy2} A${g.ri},${g.ri} 0 0 0 ${ix1},${iy1}Z`
      const name = g.label(c)
      const w = width(name)
      const right = Math.sin(a) > 0
      const tx = right ? lx : lx - w
      box.x1 = Math.min(box.x1, tx - 4)
      box.x2 = Math.max(box.x2, tx + w + 4)
      box.y1 = Math.min(box.y1, ly - g.fs)
      box.y2 = Math.max(box.y2, ly + g.fs)
      const h = g.iconS / 2
      return `<a class="job" href="career/${c.id}/" data-id="${c.id}" data-name="${esc(c.name)}" data-cat="${esc(cat)}" data-intro="${esc(c.intro)}" style="--i:${i};--dx:${dx}px;--dy:${dy}px">` +
        `<g class="w"><path class="wedge" d="${shape}"/><g transform="translate(${r1(ix - h)},${r1(iy - h)}) scale(${r1(g.iconS / 24 * 100) / 100})">${icon(c.icon)}</g>` +
        `<path class="track" d="${arc(rp, b1, b2)}" stroke-width="${g.track}"/><path class="prog" d="${arc(rp, b1, b2)}" stroke-width="${g.track}" pathLength="100" stroke-dasharray="0 100"/></g>` +
        `<rect class="hit" x="${r1(tx - 4)}" y="${r1(ly - g.fs * 0.8)}" width="${r1(w + 8)}" height="${r1(g.fs * 1.6)}"/>` +
        `<text class="job-name" x="${lx}" y="${r1(ly)}" font-size="${g.fs}" text-anchor="${right ? 'start' : 'end'}">${esc(name)}</text></a>`
    })
    const vb = [box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1].map(Math.round).join(' ')
    return `<svg class="jobs ${g.cls}" viewBox="${vb}">${wedges.join('')}</svg>`
  }
  /** 手机上圆环外面放不下全名，写最短的叫法 */
  const SHORT: Record<string, string> = {
    backend: '后端', frontend: '前端', mobile: '客户端', gamedev: '游戏', 'product-eng': '全栈', 'test-dev': '测试', sre: '运维',
    'systems-eng': '嵌入式', 'distributed-eng': '基础架构', security: '安全', 'data-analyst': '数据分析', data: '数据开发',
    quant: '量化', 'ml-algo': '机器学习', 'llm-algo': '大模型', 'ai-app': 'AI 应用', inference: 'AI Infra',
  }
  const careerRing = () =>
    `<div class="ring-wrap">` +
    ringSvg({ cls: 'wide', ri: 240, ro: 350, fs: 22, lift: 34, spread: 34, iconS: 46, pop: 16, track: 7, label: (c) => c.name.replace(/工程师$/, '') }) +
    ringSvg({ cls: 'narrow', ri: 62, ro: 106, fs: 13, lift: 10, spread: 19, iconS: 18, pop: 6, track: 3, label: (c) => SHORT[c.id] ?? c.name }) +
    `<div class="ring-center"><b class="rc-name"></b><span class="rc-meta"></span></div></div>`

  // ── 首页：一个问题“你想学什么”，一圈 17 个岗位。点一个，旁边长出它的技能树；点“就学这个”记下来，进这条路线 ──
  {
    // 首页的脚本要用的：每个岗位要学的技能，每个技能的全部前置（点亮它就连前置一起点亮，熄灭它就连依赖它的一起熄灭）
    const data = {
      careers: Object.fromEntries(rm.subs.map((c) => [c.id, c.plan.map((p) => p.skillId)])),
      up: Object.fromEntries(rm.skills.map((s) => [s.id, [...tree.ancestors(s.id)]])),
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
    <p class="pk-intro"></p>
    <div class="minis">${rm.subs.map((c) => `<div class="mini" data-id="${c.id}">${miniTree(c)}</div>`).join('')}</div>
    ${rm.subs.map((c) => `<div class="has" data-id="${c.id}"><p class="pk-ask">要学这 ${c.plan.length} 个，会的点一下</p><div class="quick">${c.plan.map(({ skillId: id }) => `<button type="button" class="chip" data-s="${id}" aria-pressed="false">${icon(sk(id).icon, 16)}${esc(sk(id).name)}</button>`).join('')}</div></div>`).join('')}
    <a class="go" href="">就学这个</a>
  </div>
</aside>
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
  if (!id) {
    name.textContent = '${rm.subs.length} 个岗位'
    name.style.removeProperty('--len')
    meta.textContent = '点一个看看'
    return
  }
  const j = job(id)
  const { total, left } = count(id)
  name.textContent = j.dataset.name
  // 名字一行放下：中文按一个字宽，英文数字按半个多一点
  name.style.setProperty('--len', [...j.dataset.name].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0))
  meta.textContent = j.dataset.cat + ' · ' + (left === total ? total + ' 个技能' : left ? '还差 ' + left + ' 个' : '已达成')
}
/** 选中一个岗位：扇形弹出来，旁边换成它的小树、重新长一遍 */
function choose(id, scroll) {
  current = id
  page.classList.add('chosen')
  for (const j of jobs) j.classList.toggle('on', j.dataset.id === id)
  for (const m of document.querySelectorAll('.mini, .has')) m.classList.toggle('on', m.dataset.id === id)
  pick.querySelector('.pk-intro').textContent = job(id).dataset.intro
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
  for (const b of document.querySelectorAll('.quick .chip')) b.setAttribute('aria-pressed', l.has(b.dataset.s))
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
/** 会了：连前置一起点亮。点错了再点一下：连依赖它的一起熄灭（和技能树里的规则一样） */
function toggle(id) {
  if (store.skills[id]?.status === 'done') {
    for (const s of Object.keys(store.skills)) if (s === id || D.up[s]?.includes(id)) delete store.skills[s]
  } else for (const s of [...D.up[id], id]) store.skills[s] = { status: 'done' }
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
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
