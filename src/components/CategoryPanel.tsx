// 全部职业：技能树最上面一排的终极节点，按大方向分组。不用选：点够了自己达成。
import { useApp } from '../state'
import { stars, tierOf } from '../lib/tree'

export function CategoryPanel({ id }: { id: string }) {
  const { tree, readinessBySub, setFocus } = useApp()
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">职业</p>
      <h2>终极节点</h2>
      <p className="summary">每个职业都是技能树最上面一排的一枚徽章。把它要学的技能都点亮，它就自己亮起来。</p>
      {tree.roadmap.categories.map((c) => (
        <section key={c.id} className="dir-group">
          <h4>{c.name}</h4>
          <ul className="plain-list">
            {c.subIds.map((sid) => {
              const s = tree.subs.get(sid)!
              const r = readinessBySub.get(sid)!
              const reached = r.coreDone >= r.coreTotal
              return (
                <li key={sid}>
                  <button className={`row-link${reached ? ' is-reached' : ''}`} onClick={() => setFocus({ kind: 'sub', id: sid }, { scroll: true })}>
                    <span>{reached ? '★ ' : ''}{s.name}</span>
                    <small>{stars(tierOf(r.coreTotal))}　{reached ? '已达成' : `${r.coreDone} / ${r.coreTotal}`}</small>
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
