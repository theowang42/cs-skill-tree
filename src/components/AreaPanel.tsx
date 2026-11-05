// 一个分支：一句话、公开课、点亮了几个
import { useApp } from '../state'
import { Meter } from './common'

export function AreaPanel({ id }: { id: string }) {
  const { tree, states } = useApp()
  const area = tree.areas.get(id)!
  const done = area.skillIds.filter((s) => states.get(s) === 'done').length
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">分支</p>
      <h2>{area.name}</h2>
      <p className="summary">{area.intro}</p>
      <div className="goal-meter">
        <Meter value={done} max={area.skillIds.length} />
        <b>{done}/{area.skillIds.length}</b>
      </div>
    </div>
  )
}
