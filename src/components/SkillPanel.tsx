// 一个技能：一句话、去哪学、点亮。没有别的。
import { useApp } from '../state'
import { STATE_LABEL } from '../lib/format'
import { SkillGlyph } from './SkillTree'
import { Links, StatusControl } from './common'

export function SkillPanel({ id }: { id: string }) {
  const { tree, states, setFocus } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  const area = tree.areas.get(s.areaId!)!
  const links = s.resources

  return (
    <div className="detail" key={id}>
      <p className="eyebrow">
        <button className="link-button" onClick={() => setFocus({ kind: 'area', id: area.id })}>{area.name}</button>
      </p>
      <h2 className="with-icon">
        <span className={`panel-glyph s-${state}`}><SkillGlyph icon={s.icon} size={26} /></span>
        <span>{s.name}</span>
      </h2>
      <p className="summary">{s.intro}</p>
      <StatusControl id={id} />
      {state !== 'locked' && <p className="state-line">{STATE_LABEL[state]}</p>}
      {links.length > 0 && (
        <>
          <h4>去哪学</h4>
          <Links links={links} />
        </>
      )}
      {s.prerequisites.length > 0 && (
        <>
          <h4>前置</h4>
          <ul className="prereq-list">
            {s.prerequisites.map((p) => {
              const st = states.get(p)!
              return (
                <li key={p} className={`pq-${st}`}>
                  <button className="row-link" onClick={() => setFocus({ kind: 'skill', id: p }, { scroll: true })}>
                    <span><span className="pq-mark" aria-hidden>{st === 'done' ? '●' : '○'}</span>{tree.skill(p).name}</span>
                    <small>{st === 'done' ? '已点亮' : '还没点亮'}</small>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
