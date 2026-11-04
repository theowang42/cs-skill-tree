// 一个分支：一句话、公开课、点亮了几个
import { useApp } from '../state'
import { Links, Meter } from './common'

export function AreaPanel({ id }: { id: string }) {
  const { tree, states } = useApp()
  const area = tree.areas.get(id)!
  const done = area.skillIds.filter((s) => states.get(s) === 'done').length
  return (
    <div className="detail" key={id}>
      <p className="eyebrow">分支 · {tree.layers.get(area.layerId)!.name}</p>
      <h2>{area.name}</h2>
      <p className="summary">{area.intro}</p>
      <div className="goal-meter">
        <Meter value={done} max={area.skillIds.length} />
        <b>{done}/{area.skillIds.length}</b>
      </div>
      <h4>公开课</h4>
      <Links links={area.courses} />
      <p className="note">
        课程主要参考 <a href="https://csdiy.wiki/" target="_blank" rel="noreferrer">CS 自学指南</a>
      </p>
    </div>
  )
}
