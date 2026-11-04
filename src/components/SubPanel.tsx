// 一个方向：一句话、离它多远、设为目标、代表项目
import { useApp } from '../state'
import { Links, Meter } from './common'

export function SubPanel({ id }: { id: string }) {
  const { tree, readinessBySub, progress, setGoal, readOnly, setFocus } = useApp()
  const sub = tree.subs.get(id)!
  const cat = tree.categories.get(sub.categoryId)!
  const r = readinessBySub.get(id)!
  const isGoal = progress.goalSubId === id
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">方向 · {cat.name}</p>
      <h2>{sub.name}</h2>
      <p className="summary">{sub.intro}</p>
      <div className="goal-meter">
        <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} />
        <b>{Math.round(r.percent)}%</b>
      </div>
      <p className="note">树上亮着的就是要学的 {r.coreTotal} 个，已掌握 {r.coreDone} 个。设为目标后，下一个该学的会标一个红色小三角。</p>
      {!readOnly && (
        <div className="row-actions">
          {isGoal ? <button onClick={() => setGoal(null)}>取消目标</button> : <button className="primary" onClick={() => setGoal(id)}>设为目标</button>}
        </div>
      )}
      <h4>去看看真实的项目</h4>
      <Links links={sub.projects} />
      <p className="more">
        <button className="link-button" onClick={() => setFocus({ kind: 'category', id: cat.id })}>看看其他方向 →</button>
      </p>
    </div>
  )
}
