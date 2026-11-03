// 领域面板：一张可以直接勾选的清单，自评时最快
import { useApp } from '../state'
import type { Status } from '../types'
import { Links, Meter, Section, StateDot } from './common'

export function AreaPanel({ id }: { id: string }) {
  const { tree, states, change, readOnly, setFocus, progress } = useApp()
  const area = tree.areas.get(id)!
  const layer = tree.layers.get(area.layerId)!
  const done = area.skillIds.filter((s) => states.get(s) === 'done').length
  const learning = area.skillIds.filter((s) => states.get(s) === 'learning').length
  const toggle = (sid: string, st: Status) => change({ [sid]: progress.skills[sid]?.status === st ? null : st })
  const markAll = () => change(Object.fromEntries(area.skillIds.map((s) => [s, 'done' as const])), { undo: true, message: `「${area.name}」全部标为已掌握` })

  // 同一领域里按行分组，第 1 行最先学
  const rows = new Map<number, string[]>()
  for (const sid of area.skillIds) {
    const t = tree.skill(sid).tier
    rows.set(t, [...(rows.get(t) ?? []), sid])
  }
  const neighbours = layer.areaIds

  return (
    <div className="detail" key={id}>
      <p className="eyebrow">{layer.name} · 知识领域</p>
      <h2>{area.name}</h2>
      <p className="summary">{area.intro}</p>
      <div className="goal-meter">
        <Meter value={done} partial={learning} max={area.skillIds.length} />
        <b>
          {done}/{area.skillIds.length}
        </b>
      </div>

      <Section title="自评清单" aside={!readOnly && <span className="muted small">会了就勾上</span>}>
        <ol className="checklist">
          {[...rows].map(([tier, ids]) => (
            <li key={tier}>
              <span className="tier-label">第 {tier} 层</span>
              <ul>
                {ids.map((sid) => {
                  const st = states.get(sid)!
                  const s = tree.skill(sid)
                  return (
                    <li key={sid} className={`check-row r-${st}`}>
                      <label>
                        <input type="checkbox" checked={st === 'done'} disabled={readOnly} onChange={() => toggle(sid, 'done')} />
                        <span>{s.name}</span>
                      </label>
                      <button className={`mini${st === 'learning' ? ' on' : ''}`} disabled={readOnly} onClick={() => toggle(sid, 'learning')} title="标为在学">在学</button>
                      <button className="mini ghost" onClick={() => setFocus({ kind: 'skill', id: sid }, { scroll: true })} title="看详情">
                        <StateDot state={st} />›
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
        {!readOnly && done < area.skillIds.length && (
          <button className="link-button" onClick={markAll}>这个领域我全会</button>
        )}
      </Section>

      <Section title="推荐公开课">
        <Links links={area.courses} />
        <p className="note">
          课程主要参考 <a href="https://csdiy.wiki/" target="_blank" rel="noreferrer">CS 自学指南（csdiy.wiki）</a>
        </p>
      </Section>

      <Section title={`${layer.name}的其他领域`}>
        <div className="chips">
          {neighbours.filter((a) => a !== id).map((a) => (
            <button key={a} className="chip" onClick={() => setFocus({ kind: 'area', id: a }, { scroll: true })}>
              {tree.areas.get(a)!.name}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
