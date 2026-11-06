// 静态页面：首页、每个技能一页、每个职业一页，加 sitemap。
// 技能树本身是单页应用（在 /tree/），搜索引擎看不到里面的内容；这些页面是写死的 HTML，
// 让人能搜到“Docker 怎么学”“大模型算法工程师要学什么”，也方便把单个技能、单个职业分享出去。
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

export const SITE = 'https://theowang42.github.io/cs-skill-tree/'
const REPO = 'https://github.com/theowang42/cs-skill-tree'
const NAME = 'CS 技能树'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function icon(name: string, size = 24): string {
  const spec = ICONS[name]
  if (!spec) return ''
  if (spec.kind === 'lucide') return renderToStaticMarkup(createElement(spec.Icon, { width: size, height: size, strokeWidth: 1.7, absoluteStrokeWidth: true, 'aria-hidden': true }))
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${spec.path}" fill="currentColor"/></svg>`
}

/** 技能的图标槽：和树上一样，语言是六边形，其他是圆 */
function slot(s: Skill, size = 44): string {
  return `<span class="slot${s.language ? ' hex' : ''}" style="--s:${size}px">${icon(s.icon, Math.round(size * 0.46))}</span>`
}

interface Page {
  /** 相对站点根的目录，'' 是首页 */
  path: string
  title: string
  description: string
  body: string
  /** 面包屑：[名字, 相对根的路径] */
  crumbs?: [string, string][]
}

function layout(p: Page): string {
  const root = p.path ? '../'.repeat(p.path.split('/').filter(Boolean).length) : './'
  const url = SITE + p.path
  const crumbs = p.crumbs
    ? `<nav class="crumbs" aria-label="位置">${p.crumbs.map(([n, h], i) => (i === p.crumbs!.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${root}${h}">${esc(n)}</a>`)).join('<i>›</i>')}</nav>`
    : ''
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
<link rel="stylesheet" href="${root}site.css">
${ld}
</head>
<body>
<header class="top">
  <a class="logo" href="${root}"><span class="mark"></span>${NAME}</a>
  <nav>
    <a href="${root}#careers">职业路线</a>
    <a href="${root}#skills">全部技能</a>
    <a class="btn" href="${root}tree/">打开技能树</a>
  </nav>
</header>
<main>
${crumbs}
${p.body}
</main>
<footer class="foot">
  <p>免费，不用注册。进度只存在你自己的浏览器里，不收集任何数据。</p>
  <p>内容开源在 <a href="${REPO}">GitHub</a>，哪里写得不对，欢迎直接改。课程主要参考 <a href="https://csdiy.wiki/">csdiy.wiki</a>。</p>
</footer>
</body>
</html>
`
}

export function renderSite(rm: Roadmap): Map<string, string> {
  const skills = new Map(rm.skills.map((s) => [s.id, s]))
  const subs = new Map(rm.subs.map((s) => [s.id, s]))
  const areas = new Map(rm.areas.map((a) => [a.id, a]))
  const sk = (id: string) => skills.get(id)!
  const out = new Map<string, string>()
  const put = (p: Page) => out.set(p.path + 'index.html', layout(p))

  /** 小卡片：图标、名字、一句话 */
  const skillCard = (s: Skill, root: string, extra = '') =>
    `<a class="card skill" href="${root}skill/${s.id}/">${slot(s)}<span class="txt"><b>${esc(s.name)}</b><small>${esc(s.intro)}</small>${extra}</span></a>`
  const skillChip = (s: Skill, root: string) => `<a class="chip" href="${root}skill/${s.id}/">${icon(s.icon, 16)}${esc(s.name)}</a>`
  const careerCard = (c: Sub, root: string) => {
    const steps = Math.max(...c.plan.map((p) => p.step))
    return `<a class="card career" href="${root}career/${c.id}/"><span class="seal">${icon(c.icon, 22)}</span><span class="txt"><b>${esc(c.name)}${c.isHot ? '<em>热门</em>' : ''}</b><small>${esc(c.intro)}</small><span class="meta">${c.plan.length} 个技能 · ${steps} 步</span></span></a>`
  }

  // ── 首页 ──
  {
    const careers = rm.categories
      .map((cat) => `<section class="group"><h3>${esc(cat.name)}</h3><p class="muted">${esc(cat.intro)}</p><div class="grid">${cat.subIds.map((id) => careerCard(subs.get(id)!, '')).join('')}</div></section>`)
      .join('')
    const all = rm.areas
      .map((a) => `<section class="group"><h3>${esc(a.name)}<span>${a.skillIds.length}</span></h3><p class="muted">${esc(a.intro)}</p><div class="chips">${a.skillIds.map((id) => skillChip(sk(id), '')).join('')}</div></section>`)
      .join('')
    put({
      path: '',
      title: `${NAME}：点亮你会的，看清离目标还差什么`,
      description: `一棵 ${rm.skills.length} 个技能的计算机技能树：点亮你会的，看清自己的能力边界，按 ${rm.subs.length} 个职业倒推学习路线，每个技能附公开课。免费，不用注册。`,
      body: `
<script>/* 技能树以前在首页：旧的分享链接和技能链接（#share=… / #/skill/…）转到 tree/ */if (/^#(\\/|share=)/.test(location.hash)) location.replace('tree/' + location.hash)</script>
<section class="hero">
  <div class="hero-text">
    <h1><span>点亮你会的，</span><span>看清离目标还差什么</span></h1>
    <p class="lead">一棵 ${rm.skills.length} 个技能的计算机技能树。从编程入门到大模型推理，像游戏天赋一样一个个点亮，再选一个职业，看清还差哪些、先学哪个。</p>
    <div class="cta">
      <a class="btn big" href="tree/">开始点亮 →</a>
      <a class="btn ghost big" href="#careers">看 ${rm.subs.length} 条职业路线</a>
    </div>
    <p class="muted small">免费 · 不用注册 · 每个技能附公开课</p>
  </div>
  <div class="hero-media">
    <video src="intro.mp4" poster="intro-poster.jpg" autoplay muted loop playsinline controls preload="metadata" aria-label="演示：点亮技能、看进度、选职业"></video>
  </div>
</section>

<section class="how">
  <div><span class="n">1</span><h3>点亮你会的</h3><p>从中心的编程入门、Linux、微积分开始，会的就点亮。前置都亮了，下一个才能点。</p></div>
  <div><span class="n">2</span><h3>看清能力边界</h3><p>中心显示你点亮了多少；悬停一下，下一步能学的技能就亮出来。</p></div>
  <div><span class="n">3</span><h3>选一个职业</h3><p>最外圈是 ${rm.subs.length} 个职业。点一个，它要学的整条路线就亮出来，还差什么一目了然。</p></div>
</section>

<section id="careers" class="block">
  <h2>职业路线</h2>
  <p class="muted">每条路线从编程入门开始，按顺序列出要学的全部技能。</p>
  ${careers}
</section>

<section id="skills" class="block">
  <h2>全部 ${rm.skills.length} 个技能</h2>
  ${all}
</section>
`,
    })
  }

  // ── 职业页 ──
  for (const c of rm.subs) {
    const root = '../../'
    const steps = new Map<number, string[]>()
    for (const p of c.plan) steps.set(p.step, [...(steps.get(p.step) ?? []), p.skillId])
    const nSteps = steps.size
    const plan = [...steps.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, ids]) => `<li><span class="step">第 ${n} 步</span><div class="grid">${ids.map((id) => skillCard(sk(id), root)).join('')}</div></li>`)
      .join('')
    const cat = rm.categories.find((x) => x.id === c.categoryId)!
    const siblings = cat.subIds.filter((id) => id !== c.id).map((id) => careerCard(subs.get(id)!, root)).join('')
    put({
      path: `career/${c.id}/`,
      title: `${c.name}要学什么？${c.plan.length} 个技能的学习路线 | ${NAME}`,
      description: `${c.intro}从${sk(c.plan[0].skillId).name}开始，按顺序分 ${nSteps} 步列出要学的 ${c.plan.length} 个技能，每个技能附公开课。`,
      crumbs: [[NAME, ''], ['职业路线', '#careers'], [c.name, `career/${c.id}/`]],
      body: `
<article class="head career-head">
  <span class="seal big">${icon(c.icon, 34)}</span>
  <div>
    <p class="kicker">职业 · ${esc(cat.name)}${c.isHot ? ' · 热门' : ''}</p>
    <h1>${esc(c.name)}</h1>
    <p class="lead">${esc(c.intro)}</p>
    <p class="tags">${c.items.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
    <div class="cta"><a class="btn" href="${root}tree/#/sub/${c.id}">在技能树里看这条路线 →</a></div>
  </div>
</article>
${c.topics.length ? `<section class="block"><h2>平时做什么</h2><ul class="list">${c.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
<section class="block">
  <h2>学习路线：${c.plan.length} 个技能，${nSteps} 步</h2>
  <p class="muted">同一步里的技能互不依赖，先学哪个都行；下一步的技能要用到上一步的。</p>
  <ol class="plan">${plan}</ol>
</section>
${c.bonus.length ? `<section class="block"><h2>加分项</h2><div class="grid">${c.bonus.map((id) => skillCard(sk(id), root)).join('')}</div></section>` : ''}
${c.projects.length ? `<section class="block"><h2>可以参考的开源项目</h2><ul class="list">${c.projects.map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label)} ↗</a></li>`).join('')}</ul></section>` : ''}
${siblings ? `<section class="block"><h2>同类职业</h2><div class="grid">${siblings}</div></section>` : ''}
`,
    })
  }

  // ── 技能页 ──
  for (const s of rm.skills) {
    const root = '../../'
    const area = areas.get(s.areaId!)!
    const pre = s.prerequisites.map(sk)
    const next = s.dependents.map(sk)
    const careers = s.requiredBy.map((id) => subs.get(id)!).filter(Boolean)
    const siblings = area.skillIds.filter((id) => id !== s.id).map(sk)
    const desc =
      `${s.intro}` +
      (pre.length ? `前置：${pre.map((x) => x.name).join('、')}。` : '不需要前置，可以直接开始。') +
      (careers.length ? `${careers.length} 个职业要学它，包括${careers.slice(0, 3).map((x) => x.name).join('、')}。` : '') +
      '附公开课。'
    put({
      path: `skill/${s.id}/`,
      title: `${s.name}怎么学：前置技能、公开课和哪些职业要用 | ${NAME}`,
      description: desc,
      crumbs: [[NAME, ''], [area.name, '#skills'], [s.name, `skill/${s.id}/`]],
      body: `
<article class="head">
  ${slot(s, 88)}
  <div>
    <p class="kicker">${s.language ? '编程语言' : '技能'} · ${esc(area.name)}</p>
    <h1>${esc(s.name)}</h1>
    <p class="lead">${esc(s.intro)}</p>
    <div class="cta"><a class="btn" href="${root}tree/#/skill/${s.id}">在技能树里点亮它 →</a></div>
  </div>
</article>
<section class="block">
  <h2>去哪学</h2>
  <ul class="list">${s.resources.map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label)} ↗</a></li>`).join('')}</ul>
</section>
<section class="block">
  <h2>先学这些</h2>
  ${pre.length ? `<div class="grid">${pre.map((x) => skillCard(x, root)).join('')}</div>` : '<p class="muted">不需要前置，可以直接开始。</p>'}
</section>
${next.length ? `<section class="block"><h2>学会之后可以学</h2><div class="grid">${next.map((x) => skillCard(x, root)).join('')}</div></section>` : ''}
${careers.length ? `<section class="block"><h2>哪些职业要学它</h2><div class="grid">${careers.map((c) => careerCard(c, root)).join('')}</div></section>` : ''}
<section class="block">
  <h2>${esc(area.name)}里的其他技能</h2>
  <div class="chips">${siblings.map((x) => skillChip(x, root)).join('')}</div>
</section>
`,
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
  const site = renderSite(rm)
  for (const [path, html] of site) {
    mkdirSync(dirname(join(DIST, path)), { recursive: true })
    writeFileSync(join(DIST, path), html)
  }
  for (const f of readdirSync(join(ROOT, 'site'))) copyFileSync(join(ROOT, 'site', f), join(DIST, f))
  copyFileSync(join(ROOT, 'docs', 'og.jpg'), join(DIST, 'og.jpg'))
  console.log(`静态页面：${site.size} 个文件`)
}
