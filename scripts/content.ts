// 读 content/ 下的 Markdown：每个领域、技能、大方向、职业各一个文件，文件名就是 id。写法见 CONTRIBUTING.md。
// 这里只把文件读成对象，并核对文件之间的引用；格式不对时指出是哪个文件、哪一行。
import { readdirSync, readFileSync } from 'node:fs'

export const RESOURCE_KINDS = ['课程', '书', '视频', '文章', '文档', '论文', '练习', '项目'] as const

export interface Link {
  label: string
  url: string
}

export interface Resource extends Link {
  kind: string | null
  free: boolean | null
}

export interface Content {
  areas: { id: string; name: string; order: number; skills: string[]; intro: string }[]
  skills: {
    id: string
    name: string
    icon: string
    requires: string[]
    language: boolean
    intro: string
    steps: string[]
    resources: Resource[]
  }[]
  categories: { id: string; name: string; order: number; careers: string[]; intro: string }[]
  careers: {
    id: string
    name: string
    icon: string
    hot: boolean
    keywords: string[]
    requires: string[]
    bonus: string[]
    intro: string
    topics: string[]
    projects: Link[]
  }[]
}

class ContentError extends Error {}

/** 一个文件拆成三块：开头 --- 之间的属性、第一段（一句话）、各个 ## 小节的行 */
function split(file: string, text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const fail = (line: number, msg: string): never => {
    throw new ContentError(`${file}:${line + 1}：${msg}`)
  }
  if (lines[0] !== '---') fail(0, '文件要以 --- 开头，下面写属性')
  const end = lines.indexOf('---', 1)
  if (end < 0) fail(0, '属性后面少了一行 ---')

  const meta = new Map<string, { value: string | string[]; line: number }>()
  for (let i = 1; i < end; i++) {
    const m = /^([a-z]+): (.+)$/.exec(lines[i])
    if (!m) fail(i, '属性要写成“名字: 值”，列表写成 [a, b]')
    const [, key, raw] = m!
    if (meta.has(key)) fail(i, `属性 ${key} 写了两次`)
    const list = /^\[(.*)\]$/.exec(raw)
    meta.set(key, { value: list ? list[1].split(',').map((x) => x.trim()).filter(Boolean) : raw.trim(), line: i })
  }

  const intro: string[] = []
  const sections = new Map<string, { lines: string[]; line: number }>()
  let current: string[] = intro
  for (let i = end + 1; i < lines.length; i++) {
    const h = /^## (.+)$/.exec(lines[i])
    if (h) {
      if (sections.has(h[1])) fail(i, `小节“${h[1]}”写了两次`)
      sections.set(h[1], { lines: (current = []), line: i })
    } else if (lines[i].trim()) current.push(lines[i].trim())
  }
  return { meta, intro: intro.join(''), sections, fail, end }
}

/** 按规格读一个文件：允许哪些属性、哪些小节，其余的都算写错 */
function read(file: string, text: string, spec: { meta: Record<string, 'text' | 'list' | 'flag' | 'number'>; required: string[]; sections: string[] }) {
  const { meta, intro, sections, fail, end } = split(file, text)
  for (const [key, { line }] of meta) if (!(key in spec.meta)) fail(line, `不认识的属性 ${key}，能写的有：${Object.keys(spec.meta).join('、')}`)
  for (const key of spec.required) if (!meta.has(key)) fail(0, `缺少属性 ${key}`)
  for (const [name, { line }] of sections) if (!spec.sections.includes(name)) fail(line, `不认识的小节“${name}”，能写的有：${spec.sections.join('、')}`)
  if (!intro) fail(end + 1, '属性下面要先写一句话')

  const get = (key: string) => {
    const m = meta.get(key)
    const type = spec.meta[key]
    if (!m) return type === 'list' ? [] : type === 'flag' ? false : null
    if ((type === 'list') !== Array.isArray(m.value)) fail(m.line, type === 'list' ? `${key} 要写成列表 [a, b]` : `${key} 不能是列表`)
    if (type === 'flag' && m.value !== 'true') fail(m.line, `${key} 只能写 true，不是就别写这一行`)
    if (type === 'number' && !/^\d+$/.test(m.value as string)) fail(m.line, `${key} 要写成数字`)
    return type === 'flag' ? true : type === 'number' ? Number(m.value) : m.value
  }
  /** 列表小节：每行以 - 开头 */
  const list = (name: string) => {
    const s = sections.get(name)
    if (!s) return []
    s.lines.forEach((l, i) => l.startsWith('- ') || fail(s.line + 1 + i, `“${name}”里每一行都要以 - 开头`))
    return s.lines.map((l) => l.slice(2).trim())
  }
  /** 链接小节：- [标题](https://…)，技能的资源后面再跟 · 类型 · 免费/付费 */
  const links = (name: string, tagged: boolean): Resource[] =>
    list(name).map((l, i) => {
      const line = sections.get(name)!.line + 1 + i
      const m = /^\[(.+?)\]\((https:\/\/[^\s)]+)\)((?: · \S+)*)$/.exec(l)
      if (!m) fail(line, `链接要写成 - [标题](https://…)${tagged ? ' · 类型 · 免费' : ''}`)
      const tags = m![3].split(' · ').filter(Boolean)
      let kind: string | null = null
      let free: boolean | null = null
      for (const t of tags) {
        if (tagged && (RESOURCE_KINDS as readonly string[]).includes(t) && kind === null) kind = t
        else if (tagged && (t === '免费' || t === '付费') && free === null) free = t === '免费'
        else fail(line, tagged ? `不认识的标签“${t}”：类型写 ${RESOURCE_KINDS.join('、')} 之一，再写免费或付费` : '这里的链接后面不加标签')
      }
      return { label: m![1], url: m![2], kind, free }
    })
  return { get, list, links, intro }
}

const CONTENT = new URL('../content/', import.meta.url)

/** 读全部内容。格式错、引用对不上，都一次列出来。root 只有测试会换 */
export function load(root: URL = CONTENT): Content {
  const errors: string[] = []
  const each = <T>(dir: string, parse: (id: string, file: string, text: string) => T): T[] =>
    readdirSync(new URL(dir + '/', root)).filter((f) => f.endsWith('.md')).sort().flatMap((f) => {
      const [id, file, text] = [f.slice(0, -3), `content/${dir}/${f}`, readFileSync(new URL(`${dir}/${f}`, root), 'utf8')]
      try {
        return [parse(id, file, text)]
      } catch (e) {
        if (!(e instanceof ContentError)) throw e
        errors.push(e.message)
        return []
      }
    })

  const areas = each('areas', (id, file, text) => {
    const f = read(file, text, { meta: { name: 'text', order: 'number', skills: 'list' }, required: ['name', 'order', 'skills'], sections: [] })
    return { id, name: f.get('name') as string, order: f.get('order') as number, skills: f.get('skills') as string[], intro: f.intro }
  })
  const skills = each('skills', (id, file, text) => {
    const f = read(file, text, {
      meta: { name: 'text', icon: 'text', requires: 'list', language: 'flag' },
      required: ['name', 'icon', 'requires'],
      sections: ['学习流程', '去哪学'],
    })
    return {
      id,
      name: f.get('name') as string,
      icon: f.get('icon') as string,
      requires: f.get('requires') as string[],
      language: f.get('language') as boolean,
      intro: f.intro,
      steps: f.list('学习流程'),
      resources: f.links('去哪学', true),
    }
  })
  const categories = each('categories', (id, file, text) => {
    const f = read(file, text, { meta: { name: 'text', order: 'number', careers: 'list' }, required: ['name', 'order', 'careers'], sections: [] })
    return { id, name: f.get('name') as string, order: f.get('order') as number, careers: f.get('careers') as string[], intro: f.intro }
  })
  const careers = each('careers', (id, file, text) => {
    const f = read(file, text, {
      meta: { name: 'text', icon: 'text', hot: 'flag', keywords: 'list', requires: 'list', bonus: 'list' },
      required: ['name', 'icon', 'keywords', 'requires'],
      sections: ['平时做什么', '代表项目'],
    })
    return {
      id,
      name: f.get('name') as string,
      icon: f.get('icon') as string,
      hot: f.get('hot') as boolean,
      keywords: f.get('keywords') as string[],
      requires: f.get('requires') as string[],
      bonus: f.get('bonus') as string[],
      intro: f.intro,
      topics: f.list('平时做什么'),
      projects: f.links('代表项目', false).map(({ label, url }) => ({ label, url })),
    }
  })

  // ── 文件之间的引用 ──
  const skillIds = new Set(skills.map((s) => s.id))
  const careerIds = new Set(careers.map((c) => c.id))
  const listed = (kind: string, owners: { id: string; items: string[] }[], dir: string, ids: Set<string>, ownerDir: string) => {
    const seen = new Map<string, string>()
    for (const o of owners)
      for (const x of o.items) {
        if (!ids.has(x)) errors.push(`content/${ownerDir}/${o.id}.md：列表里的 ${x} 没有对应的 content/${dir}/${x}.md`)
        else if (seen.has(x)) errors.push(`${kind} ${x} 同时列在 ${seen.get(x)} 和 ${o.id} 里，只能在一处`)
        else seen.set(x, o.id)
      }
    for (const x of ids) if (!seen.has(x)) errors.push(`content/${dir}/${x}.md 没有列在任何一个 content/${ownerDir}/*.md 的列表里`)
  }
  listed('技能', areas.map((a) => ({ id: a.id, items: a.skills })), 'skills', skillIds, 'areas')
  listed('职业', categories.map((c) => ({ id: c.id, items: c.careers })), 'careers', careerIds, 'categories')
  const refs = (file: string, what: string, ids: string[]) => {
    for (const x of ids) if (!skillIds.has(x)) errors.push(`${file}：${what}里的 ${x} 不是一个技能（没有 content/skills/${x}.md）`)
  }
  for (const s of skills) refs(`content/skills/${s.id}.md`, '前置', s.requires)
  for (const c of careers) {
    refs(`content/careers/${c.id}.md`, '必学技能', c.requires)
    refs(`content/careers/${c.id}.md`, '加分项', c.bonus)
    if (!c.requires.length) errors.push(`content/careers/${c.id}.md：requires 至少要有一个技能`)
  }

  if (errors.length) throw new Error(`内容有 ${errors.length} 处要改：\n${errors.join('\n')}`)
  return { areas, skills, categories, careers }
}
