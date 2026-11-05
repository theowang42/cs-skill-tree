// 选方向：所有方向一张清单，按大方向分组。方向也画在技能树的枝头，两边点哪个都一样。
import { useApp } from '../state'

export function CategoryPanel({ id }: { id: string }) {
  const { tree, readinessBySub, setFocus, progress } = useApp()
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">方向</p>
      <h2>你想去哪</h2>
      <p className="summary">每个方向都画在技能树的最上面一排（◇）。点一个，树上会亮出它要学的全部技能。</p>
      {tree.roadmap.categories.map((c) => (
        <section key={c.id} className="dir-group">
          <h4>{c.name}</h4>
          <ul className="plain-list">
            {c.subIds.map((sid) => {
              const s = tree.subs.get(sid)!
              const r = readinessBySub.get(sid)!
              const goal = progress.goalSubId === sid
              return (
                <li key={sid}>
                  <button className={`row-link${goal ? ' is-goal' : ''}`} onClick={() => setFocus({ kind: 'sub', id: sid }, { scroll: true })}>
                    <span>{goal ? '◆ ' : ''}{s.name}</span>
                    <small>{goal ? '目标 · ' : ''}{Math.round(r.percent)}%</small>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
