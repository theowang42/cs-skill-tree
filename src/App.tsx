import { useState } from 'react'
import { CATEGORIES, LAYERS, closure } from './data/roadmap'

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

  const lit = closure(CATEGORIES.filter((c) => selected.has(c.id)).flatMap((c) => c.requires))

  return (
    <main>
      <h1>cs-skill-tree</h1>

      <section className="layer layer-apps">
        <header>
          <span className="num">L4</span>
          <span className="name">应用层</span>
        </header>
        <div className="row">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={selected.has(c.id) ? 'node on' : 'node'} onClick={() => toggle(c.id)}>
              <strong>{c.name}</strong>
              <Items items={c.items} />
            </button>
          ))}
        </div>
      </section>

      {LAYERS.map((layer, i) => (
        <section key={layer.name} className="layer">
          <header>
            <span className="num">L{LAYERS.length - i}</span>
            <span className="name">{layer.name}</span>
          </header>
          <div className="row">
            {layer.blocks.map((b) => (
              <div key={b.id} className={lit.has(b.id) ? 'node on' : 'node'}>
                <strong>{b.name}</strong>
                <Items items={b.items} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
