// 一个技能：像游戏里的技能卡。图标槽、名字、状态、一句话、点亮按钮、需要什么、解锁什么、去哪学。
import type { SkillState } from '../types'
import { useApp } from '../state'
import { Rays, SkillGlyph, hexPath, orbitDelay } from './SkillTree'
import { Links, StatusControl } from './common'

const BADGE: Record<SkillState, string> = { locked: '未解锁', available: '可点亮', done: '已点亮' }

/** 图标槽：和树上的节点同一个形状、同一套状态画法。卡头用大的，前置和解锁用小的 */
export function SkillSlot({ uid, icon, language, state, size = 96 }: { uid: string; icon: string; language: boolean; state: SkillState; size?: number }) {
  const R = 34
  return (
    <svg className={`slot s-${state}`} width={size} height={size} viewBox="-48 -48 96 96" aria-hidden>
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
      {state === 'done' && <Rays r={R + 5} delay={orbitDelay(uid)} />}
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
        <SkillSlot uid={`card-${id}`} icon={s.icon} language={s.language} state={state} />
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
          <h4>先点亮上一级</h4>
          <div className="mini-row">
            {s.prerequisites.map((p) => {
              const q = tree.skill(p)
              const st = states.get(p)!
              return (
                <button key={p} className={`mini s-${st}`} onClick={() => setFocus({ kind: 'skill', id: p }, { scroll: true })}>
                  <SkillSlot uid={`req-${p}`} icon={q.icon} language={q.language} state={st} size={52} />
                  <span className="mini-name">{q.name}</span>
                  <span className="mini-state">{st === 'done' ? '已点亮' : '未点亮'}</span>
                </button>
              )
            })}
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
