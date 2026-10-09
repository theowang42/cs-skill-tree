import { useState, type CSSProperties, type ReactNode } from 'react'
import { CATEGORIES, LAYERS, TOOL_GROUPS, closure } from './data/roadmap'
import { BLOCK_DETAILS, CATEGORY_DETAILS, TOOL_DETAILS, type Detail } from './data/details'
import { ICONS, MONOGRAMS, STROKE_ICONS } from './data/icons'

type Kind = 'category' | 'tool' | 'block'
type Focus = { kind: Kind; id: string } | null

const BLOCKS = LAYERS.flatMap((l) => l.blocks.map((b) => ({ ...b, layer: l.name })))
const TOOLS = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => ({ ...t, group: g.name })))
const VISITED_KEY = 'cs-skill-tree:visited'

// localStorage 在隐私模式等情况下可能不可用，读写都要兜底
function hasFlag(key: string) {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // 存不了就只在本次访问里生效
  }
}

// 点亮动画：选中方向后，从工具层到基础层逐层亮起，同一行内从左到右
const LAYER_STEP = 220
const CELL_STEP = 25
const delay = (layer: number, index: number) => ({ '--d': `${layer * LAYER_STEP + index * CELL_STEP}ms` }) as CSSProperties

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

function Layer({ num, name, children, className = '' }: { num: number; name: string; children: ReactNode; className?: string }) {
  return (
    <section className={`layer ${className}`}>
      <header>
        <span className="name">{name}</span>
        <span className="num">L{num}</span>
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
  // 新手引导：第一次来时圈出应用层并给一句提示，选过方向或点“知道了”后不再出现
  const [guide, setGuide] = useState(() => !hasFlag(VISITED_KEY))

  const closeGuide = () => {
    setGuide(false)
    setFlag(VISITED_KEY)
  }

  const clickCategory = (id: string) => {
    if (activeCat === id) {
      setActiveCat(null)
      setFocus(null)
    } else {
      setActiveCat(id)
      setFocus({ kind: 'category', id })
    }
    if (guide) closeGuide()
  }

  const cat = CATEGORIES.find((c) => c.id === activeCat)
  const litBlocks = closure(cat?.requires ?? [])
  const litTools = new Set(cat?.tools ?? [])

  const cls = (kind: Kind, id: string, lit: boolean, extra = '') =>
    ['node', extra, lit && 'on', focus?.kind === kind && focus.id === id && 'focused'].filter(Boolean).join(' ')

  const total = LAYERS.length + 2

  return (
    <div className={guide ? 'page guiding' : 'page'}>
      <main className="tree">
        <Layer num={total} name="应用层" className={guide ? 'layer-apps spotlight' : 'layer-apps'}>
          <div className="row">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={cls('category', c.id, activeCat === c.id, 'app')} onClick={() => clickCategory(c.id)}>
                <strong>{c.name}</strong>
                <Items items={c.items} />
              </button>
            ))}
          </div>
          {guide && (
            <div className="coach" role="note">
              <span>在这里选一个方向，下面变黑的就是你要学的。</span>
              <button onClick={closeGuide}>知道了</button>
            </div>
          )}
        </Layer>

        <Layer num={total - 1} name="工具层">
          {TOOL_GROUPS.map((g, gi) => (
            <div key={g.name} className="group">
              <h3>{SHORT_GROUP[g.name]}</h3>
              <div className="row tools">
                {g.tools.map((t, ti) => (
                  <button
                    key={t.id}
                    className={cls('tool', t.id, litTools.has(t.id), 'tool')}
                    style={delay(0, gi * 3 + ti)}
                    onClick={() => setFocus({ kind: 'tool', id: t.id })}
                    title={t.name}
                  >
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
          <Layer key={layer.name} num={LAYERS.length - i} name={layer.name}>
            <div className="row">
              {layer.blocks.map((b, bi) => (
                <button
                  key={b.id}
                  className={cls('block', b.id, litBlocks.has(b.id))}
                  style={delay(i + 1, bi)}
                  onClick={() => setFocus({ kind: 'block', id: b.id })}
                >
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
        <button className="help" onClick={() => setGuide(true)}>
          使用说明
        </button>
        <Panel focus={focus} onFocus={setFocus} onCategory={clickCategory} />
      </aside>
    </div>
  )
}

function Panel({ focus, onFocus, onCategory }: { focus: Focus; onFocus: (f: Focus) => void; onCategory: (id: string) => void }) {
  if (!focus) {
    return (
      <div className="detail empty">
        <p className="empty-tip">先在右边最上面选一个方向。</p>
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
  // 各类内容的小标题，用大白话
  let labels = { includes: '', links: '' }
  let note: ReactNode = null

  if (focus.kind === 'category') {
    const c = CATEGORIES.find((x) => x.id === focus.id)!
    const blocks = closure(c.requires)
    eyebrow = '应用层 · 方向'
    title = c.name
    detail = CATEGORY_DETAILS[c.id]
    labels = { includes: '具体可以做这些', links: '去看看真实的开源项目' }
    relations = [
      { label: '会用到的工具', chips: TOOLS.filter((t) => c.tools.includes(t.id)).map((t) => chip('tool', t.id, t.name)) },
      { label: '需要先学会的能力', chips: BLOCKS.filter((b) => blocks.has(b.id)).map((b) => chip('block', b.id, b.name)) },
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
    labels = { includes: '学它主要学这些', links: '官方入口' }
    relations = [{ label: '这些方向会用到它', chips: CATEGORIES.filter((c) => c.tools.includes(t.id)).map((c) => chip('category', c.id, c.name)) }]
  } else {
    const b = BLOCKS.find((x) => x.id === focus.id)!
    eyebrow = `${b.layer} · 能力`
    title = b.name
    detail = BLOCK_DETAILS[b.id]
    labels = { includes: '会学到', links: '推荐公开课' }
    note = (
      <p className="note">
        课程主要参考{' '}
        <a href="https://csdiy.wiki/" target="_blank" rel="noreferrer">
          CS 自学指南（csdiy.wiki）
        </a>
        ，那里有更多课程和学习建议。
      </p>
    )
    relations = [
      { label: '学之前最好先会', chips: b.requires.map((r) => chip('block', r, BLOCKS.find((x) => x.id === r)!.name)) },
      { label: '学会了可以去做', chips: CATEGORIES.filter((c) => closure(c.requires).has(b.id)).map((c) => chip('category', c.id, c.name)) },
    ]
  }

  return (
    <div className="detail" key={`${focus.kind}-${focus.id}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={focus.kind === 'tool' ? 'with-icon' : ''}>{title}</h2>
      <p className="summary">{detail.intro}</p>

      <h4>{labels.includes}</h4>
      <ul className="includes">
        {detail.includes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <h4>{labels.links}</h4>
      <ul className="links">
        {detail.links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer">
              {l.label} <span aria-hidden>↗</span>
            </a>
          </li>
        ))}
      </ul>
      {note}

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
