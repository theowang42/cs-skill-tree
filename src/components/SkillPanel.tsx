// 一个技能：像游戏里的技能卡。图标槽、名字、状态、一句话、点亮按钮、需要什么、解锁什么、去哪学。
import { Check, Lock } from 'lucide-react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { SkillGlyph, hexPath } from './SkillTree'
import { Links, StatusControl } from './common'

const BADGE: Record<SkillState, string> = { locked: '未解锁', available: '可点亮', done: '已点亮' }

/** 卡片左上角的图标槽：和树上的节点同一个形状，放大 */
function Slot({ icon, language, state }: { icon: string; language: boolean; state: SkillState }) {
  const R = 34
  return (
    <svg className={`slot s-${state}`} width={96} height={96} viewBox="-48 -48 96 96" aria-hidden>
      {language ? (
        <>
          <path className="slot-ring" d={hexPath(R + 10)} />
          <path className="slot-box" d={hexPath(R + 2)} />
        </>
      ) : (
        <>
          <circle className="slot-ring" r={R + 8} />
          <circle className="slot-box" r={R} />
        </>
      )}
      <foreignObject x={-16} y={-16} width="32" height="32">
        <div className="slot-glyph"><SkillGlyph icon={icon} size={32} /></div>
      </foreignObject>
    </svg>
  )
}

export function SkillPanel({ id }: { id: string }) {
  const { tree, states, setFocus } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  const area = tree.areas.get(s.areaId!)!
  let row = 1
  for (let p = s.parent; p; p = tree.skill(p).parent) row++

  return (
    <div className={`detail skill-card s-${state}`} key={id}>
      <div className="card-head">
        <Slot icon={s.icon} language={s.language} state={state} />
        <div className="card-title">
          <p className="card-kind">
            {s.language ? '语言天赋' : '技能'} · {area.name} · 第 {row} 层
          </p>
          <h2>{s.name}</h2>
          <span className={`badge b-${state}`}>{BADGE[state]}</span>
        </div>
      </div>

      <p className="summary">{s.intro}</p>
      <StatusControl id={id} />

      {s.prerequisites.length > 0 && (
        <section className="card-sec">
          <h4>需要</h4>
          <ul className="req-list">
            {s.prerequisites.map((p) => {
              const ok = states.get(p) === 'done'
              return (
                <li key={p} className={ok ? 'ok' : 'miss'}>
                  <button onClick={() => setFocus({ kind: 'skill', id: p }, { scroll: true })}>
                    <span className="req-mark">{ok ? <Check size={14} strokeWidth={3} /> : <Lock size={13} strokeWidth={2.4} />}</span>
                    <span>{tree.skill(p).name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {s.dependents.length > 0 && (
        <section className="card-sec">
          <h4>解锁</h4>
          <div className="unlock-list">
            {s.dependents.map((d) => (
              <button key={d} className={`unlock s-${states.get(d)}`} onClick={() => setFocus({ kind: 'skill', id: d }, { scroll: true })}>
                <SkillGlyph icon={tree.skill(d).icon} size={14} />
                {tree.skill(d).name}
              </button>
            ))}
          </div>
        </section>
      )}

      {s.resources.length > 0 && (
        <section className="card-sec">
          <h4>去哪学</h4>
          <Links links={s.resources} />
        </section>
      )}
    </div>
  )
}
