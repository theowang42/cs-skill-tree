import { useApp } from '../state'

export function CategoryPanel({ id }: { id: string }) {
  const { tree, readinessBySub, setFocus, progress } = useApp()
  const c = tree.categories.get(id)!
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">方向</p>
      <h2>{c.name}</h2>
      <p className="summary">{c.intro}</p>
      <ul className="plain-list">
        {c.subIds.map((sid) => {
          const s = tree.subs.get(sid)!
          const r = readinessBySub.get(sid)!
          return (
            <li key={sid}>
              <button className="row-link" onClick={() => setFocus({ kind: 'sub', id: sid }, { scroll: true })}>
                <span>{progress.goalSubId === sid && '◆ '}{s.name}</span>
                <small>{Math.round(r.percent)}%</small>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="note">其他方向</p>
      <ul className="plain-list small">
        {tree.roadmap.categories.filter((x) => x.id !== id).map((x) => (
          <li key={x.id}>
            <button className="row-link" onClick={() => setFocus({ kind: 'category', id: x.id })}>
              <span>{x.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
