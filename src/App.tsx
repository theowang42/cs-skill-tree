import { useState, type CSSProperties, type ReactNode } from 'react'
import { CATEGORIES, LAYERS, TOOL_GROUPS, closure } from './data/roadmap'
import { BLOCK_DETAILS, CATEGORY_DETAILS, TOOL_DETAILS, type Detail } from './data/details'
import { ICONS, MONOGRAMS, STROKE_ICONS } from './data/icons'

type Kind = 'category' | 'tool' | 'block'
type Focus = { kind: Kind; id: string } | null

const BLOCKS = LAYERS.flatMap((l) => l.blocks.map((b) => ({ ...b, layer: l.name })))
const TOOLS = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => ({ ...t, group: g.name })))
const VISITED_KEY = 'cs-skill-tree:visited'
const SHORT_GROUP: Record<string, string> = { 编程语言: '语言', 框架与库: '框架', 平台与工具: '平台' }

function ToolIcon({ id }: { id: string }) {
  const icon = ICONS[id]
  if (icon) {
    return (
      <svg className="icon" viewBox="0 0 24 24" aria-hidden>
        <path d={icon.path} />
      </svg>
    )
  }
  const stroke = STROKE_ICONS[id]
  if (stroke) {
    return (
      <svg className="icon stroke" viewBox="0 0 24 24" aria-hidden>
        {stroke.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
  }
  return <span className="icon mono">{MONOGRAMS[id]}</span>
}

function Layer({ num, name, hint, children, className = '' }: { num: number; name: string; hint: string; children: ReactNode; className?: string }) {
  return (
    <section className={`layer ${className}`}>
      <header>
        <span className="name">{name}</span>
        <span className="num">L{num}</span>
        <span className="hint">{hint}</span>
      </header>
      <div className="content">{children}</div>
    </section>
  )
}

function Items({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  )
}

export default function App() {
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [focus, setFocus] = useState<Focus>(null)
  // 第一次来的人还没点过应用层时，应用层方块会轻轻闪动提示
  const [fresh, setFresh] = useState(() => {
    try {
      return localStorage.getItem(VISITED_KEY) === null
    } catch {
      return true
    }
  })

  const clickCategory = (id: string) => {
    if (activeCat === id) {
      setActiveCat(null)
      setFocus(null)
    } else {
      setActiveCat(id)
      setFocus({ kind: 'category', id })
    }
    if (fresh) {
      setFresh(false)
      try {
        localStorage.setItem(VISITED_KEY, '1')
      } catch {
        // 存不了就只在本次访问里生效
      }
    }
  }

  const cat = CATEGORIES.find((c) => c.id === activeCat)
  const litBlocks = closure(cat?.requires ?? [])
  const litTools = new Set(cat?.tools ?? [])

  const cls = (kind: Kind, id: string, lit: boolean, extra = '') =>
    ['node', extra, lit && 'on', focus?.kind === kind && focus.id === id && 'focused'].filter(Boolean).join(' ')

  const total = LAYERS.length + 2

  return (
    <div className="page">
      <main className="tree">
        <Layer num={total} name="应用层" hint="① 先选方向" className="layer-apps">
          <div className={fresh ? 'row beckon' : 'row'}>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={cls('category', c.id, activeCat === c.id, 'app')} onClick={() => clickCategory(c.id)}>
                <strong>{c.name}</strong>
                <Items items={c.items} />
              </button>
            ))}
          </div>
        </Layer>

        <Layer num={total - 1} name="工具层" hint="② 要用的工具">
          {TOOL_GROUPS.map((g) => (
            <div key={g.name} className="group">
              <h3>{SHORT_GROUP[g.name]}</h3>
              <div className="row tools">
                {g.tools.map((t) => (
                  <button key={t.id} className={cls('tool', t.id, litTools.has(t.id), 'tool')} onClick={() => setFocus({ kind: 'tool', id: t.id })} title={t.name}>
                    <ToolIcon id={t.id} />
                    <span className="tool-name" style={{ '--len': t.name.length } as CSSProperties}>
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Layer>

        {LAYERS.map((layer, i) => (
          <Layer key={layer.name} num={LAYERS.length - i} name={layer.name} hint="③ 要学的能力">
            <div className="row">
              {layer.blocks.map((b) => (
                <button key={b.id} className={cls('block', b.id, litBlocks.has(b.id))} onClick={() => setFocus({ kind: 'block', id: b.id })}>
                  <strong>{b.name}</strong>
                  <Items items={b.items} />
                </button>
              ))}
            </div>
          </Layer>
        ))}
      </main>

      <aside className="panel">
        <h1>
          <span aria-hidden>🌲</span> cs-skill-tree
        </h1>
        <Panel focus={focus} onFocus={setFocus} onCategory={clickCategory} />
      </aside>
    </div>
  )
}

function Panel({ focus, onFocus, onCategory }: { focus: Focus; onFocus: (f: Focus) => void; onCategory: (id: string) => void }) {
  if (!focus) {
    return (
      <div className="detail empty">
        <p className="eyebrow">怎么用</p>
        <ol className="steps">
          <li>
            <strong>在最上面的应用层选一个方向</strong>
            <span>也就是你想做的工作，比如 AI、Web 应用、操作系统</span>
          </li>
          <li>
            <strong>下面变黑的格子就是要学的</strong>
            <span>工具层是要用的语言和工具，下面三层是要掌握的能力</span>
          </li>
          <li>
            <strong>点任意一格看详情</strong>
            <span>介绍、学习内容和链接会显示在这里</span>
          </li>
        </ol>
        <h4>试试热门方向</h4>
        <div className="chips">
          {CATEGORIES.slice(0, 3).map((c) => (
            <button key={c.id} className="chip" onClick={() => onCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const chip = (kind: Kind, id: string, name: string) => (
    <button key={`${kind}-${id}`} className="chip" onClick={() => (kind === 'category' ? onCategory(id) : onFocus({ kind, id }))}>
      {name}
    </button>
  )

  let eyebrow = ''
  let title: ReactNode = null
  let detail: Detail
  let relations: { label: string; chips: ReactNode[] }[] = []

  if (focus.kind === 'category') {
    const c = CATEGORIES.find((x) => x.id === focus.id)!
    const blocks = closure(c.requires)
    eyebrow = '应用层 · 方向'
    title = c.name
    detail = CATEGORY_DETAILS[c.id]
    relations = [
      { label: '需要的工具', chips: TOOLS.filter((t) => c.tools.includes(t.id)).map((t) => chip('tool', t.id, t.name)) },
      { label: '需要的能力', chips: BLOCKS.filter((b) => blocks.has(b.id)).map((b) => chip('block', b.id, b.name)) },
    ]
  } else if (focus.kind === 'tool') {
    const t = TOOLS.find((x) => x.id === focus.id)!
    eyebrow = `工具层 · ${t.group}`
    title = (
      <>
        <ToolIcon id={t.id} />
        <span>
          {t.name}
          <small>{t.org}</small>
        </span>
      </>
    )
    detail = TOOL_DETAILS[t.id]
    relations = [{ label: '用在', chips: CATEGORIES.filter((c) => c.tools.includes(t.id)).map((c) => chip('category', c.id, c.name)) }]
  } else {
    const b = BLOCKS.find((x) => x.id === focus.id)!
    eyebrow = `${b.layer} · 能力`
    title = b.name
    detail = BLOCK_DETAILS[b.id]
    relations = [
      { label: '前置能力', chips: b.requires.map((r) => chip('block', r, BLOCKS.find((x) => x.id === r)!.name)) },
      { label: '用到它的方向', chips: CATEGORIES.filter((c) => closure(c.requires).has(b.id)).map((c) => chip('category', c.id, c.name)) },
    ]
  }

  return (
    <div className="detail" key={`${focus.kind}-${focus.id}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={focus.kind === 'tool' ? 'with-icon' : ''}>{title}</h2>
      <p className="intro">{detail.intro}</p>

      <h4>包含</h4>
      <ul className="includes">
        {detail.includes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h4>链接</h4>
      <ul className="links">
        {detail.links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer">
              {l.label} <span aria-hidden>↗</span>
            </a>
          </li>
        ))}
      </ul>

      {relations
        .filter((r) => r.chips.length > 0)
        .map((r) => (
          <div key={r.label}>
            <h4>{r.label}</h4>
            <div className="chips">{r.chips}</div>
          </div>
        ))}
    </div>
  )
}
