import { useState, type ReactNode } from 'react'
import { CATEGORIES, LAYERS, TOOL_GROUPS, closure } from './data/roadmap'
import { ICONS, MONOGRAMS } from './data/icons'

function ToolIcon({ id }: { id: string }) {
  const icon = ICONS[id]
  if (!icon) return <span className="icon mono">{MONOGRAMS[id]}</span>
  return (
    <svg className="icon" viewBox="0 0 24 24" role="img" aria-label={icon.title}>
      <path d={icon.path} />
    </svg>
  )
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
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const chosen = CATEGORIES.filter((c) => selected.has(c.id))
  const litBlocks = closure(chosen.flatMap((c) => c.requires))
  const litTools = new Set(chosen.flatMap((c) => c.tools))
  const total = LAYERS.length + 2

  return (
    <main>
      <h1>
        <span className="tree-mark" aria-hidden>
          🌲
        </span>
        cs-skill-tree
      </h1>

      <Layer num={total} name="应用层" className="layer-apps">
        <div className="row">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={selected.has(c.id) ? 'node on' : 'node'} onClick={() => toggle(c.id)}>
              <strong>{c.name}</strong>
              <Items items={c.items} />
            </button>
          ))}
        </div>
      </Layer>

      <Layer num={total - 1} name="工具层">
        {TOOL_GROUPS.map((g) => (
          <div key={g.name} className="group">
            <h3>{g.name}</h3>
            <div className="row tools">
              {g.tools.map((t) => (
                <div key={t.id} className={litTools.has(t.id) ? 'node tool on' : 'node tool'}>
                  <ToolIcon id={t.id} />
                  <span className="tool-name">{t.name}</span>
                  <span className="tool-org">{t.org}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Layer>

      {LAYERS.map((layer, i) => (
        <Layer key={layer.name} num={LAYERS.length - i} name={layer.name}>
          <div className="row">
            {layer.blocks.map((b) => (
              <div key={b.id} className={litBlocks.has(b.id) ? 'node on' : 'node'}>
                <strong>{b.name}</strong>
                <Items items={b.items} />
              </div>
            ))}
          </div>
        </Layer>
      ))}
    </main>
  )
}
