import { useState } from 'react'
import { CATEGORIES, LAYERS, closure } from './data/roadmap'

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

      <section>
        <h2>应用层</h2>
        <div className="row">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={selected.has(c.id) ? 'node on' : 'node'} onClick={() => toggle(c.id)}>
              <strong>{c.name}</strong>
              <span>{c.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {LAYERS.map((layer) => (
        <section key={layer.name}>
          <h2>{layer.name}</h2>
          <div className="row">
            {layer.blocks.map((b) => (
              <div key={b.id} className={lit.has(b.id) ? 'node on' : 'node'}>
                <strong>{b.name}</strong>
                <span>{b.desc}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
