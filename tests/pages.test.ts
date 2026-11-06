// 静态页面（首页、技能页、职业页）：每个技能和职业都有一页，站内链接都指向真实存在的页面
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'
import type { Roadmap } from '../src/types.ts'
import { renderSite, SITE } from '../scripts/pages.ts'

const rm = JSON.parse(readFileSync(new URL('../public/data/roadmap.json', import.meta.url), 'utf8')) as Roadmap
const site = renderSite(rm)
const assets = new Set([...readdirSync(new URL('../site/', import.meta.url)), 'og.jpg'])

test('每个技能、每个职业各一页，加首页和 sitemap', () => {
  for (const s of rm.skills) assert.ok(site.has(`skill/${s.id}/index.html`), s.id)
  for (const c of rm.subs) assert.ok(site.has(`career/${c.id}/index.html`), c.id)
  assert.ok(site.has('index.html'))
  assert.equal(site.size, 1 + rm.skills.length + rm.subs.length + 1)
})

test('站内链接都指向存在的页面或文件', () => {
  for (const [path, html] of site) {
    if (!path.endsWith('.html')) continue
    const dir = posix.dirname(path)
    for (const [, href] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|data:|#)/.test(href)) continue
      const target = posix.normalize(posix.join(dir, href.split('#')[0])).replace(/\/$/, '')
      if (target === 'tree' || target.startsWith('tree/')) continue
      const ok = target === '.' ? site.has('index.html') : site.has(`${target}/index.html`) || assets.has(target)
      assert.ok(ok, `${path} → ${href}`)
    }
  }
})

test('每页标题、描述不重复，canonical 对得上', () => {
  const titles = new Set<string>()
  const descs = new Set<string>()
  for (const [path, html] of site) {
    if (!path.endsWith('.html')) continue
    const title = /<title>([^<]+)<\/title>/.exec(html)![1]
    const desc = /<meta name="description" content="([^"]+)"/.exec(html)![1]
    assert.ok(!titles.has(title), `重复标题：${title}`)
    assert.ok(!descs.has(desc), `重复描述：${path}`)
    titles.add(title)
    descs.add(desc)
    assert.ok(html.includes(`<link rel="canonical" href="${SITE}${path.replace(/index\.html$/, '')}">`), path)
  }
})

test('sitemap 列出所有页面和技能树', () => {
  const xml = site.get('sitemap.xml')!
  assert.equal((xml.match(/<loc>/g) ?? []).length, site.size - 1 + 1)
  assert.ok(xml.includes(`<loc>${SITE}tree/</loc>`))
})
