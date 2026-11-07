// 全部职业：技能树最外圈的徽章，按大方向分组。不用选：要学的都点亮了，它自己达成。
import { useApp } from '../state'
import { stars } from '../lib/tree'

export function CareersPanel() {
  const { tree, progressBySub, setFocus } = useApp()
  return (
    <div className="detail">
      <p className="eyebrow">职业</p>
      <h2>终极节点</h2>
      <p className="summary">每个职业都是技能树最外圈的一枚徽章。把它要学的技能都点亮，它就自己亮起来。</p>
      {tree.roadmap.categories.map((c) => (
        <section key={c.id}>
          <h4>{c.name}</h4>
          <ul className="plain-list">
            {c.subIds.map((id) => {
              const p = progressBySub.get(id)!
              const reached = p.done === p.total
              return (
                <li key={id}>
                  <button className={`row-link${reached ? ' is-reached' : ''}`} onClick={() => setFocus({ kind: 'sub', id }, { scroll: true })}>
                    <span>{reached ? '★ ' : ''}{tree.subs.get(id)!.name}</span>
                    <small>{stars(p.total)}　{reached ? '已达成' : `${p.done} / ${p.total}`}</small>
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
