import { useApp } from '../state'
import { Meter, Section } from './common'

export function CategoryPanel({ id }: { id: string }) {
  const { tree, readinessBySub, setFocus, progress } = useApp()
  const c = tree.categories.get(id)!
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">大方向</p>
      <h2>{c.name}</h2>
      <p className="summary">{c.intro}</p>
      <Section title="选一个细分方向">
        <ul className="readiness-list big">
          {c.subIds.map((sid) => {
            const s = tree.subs.get(sid)!
            const r = readinessBySub.get(sid)!
            return (
              <li key={sid}>
                <button onClick={() => setFocus({ kind: 'sub', id: sid }, { scroll: true })}>
                  <span>
                    {progress.goalSubId === sid && '★ '}
                    {s.name}
                    <small className="muted"> · 必学 {r.coreTotal} 个技能</small>
                  </span>
                  <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} />
                  <small>{Math.round(r.percent)}%</small>
                </button>
                <p className="muted small">{s.intro}</p>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
