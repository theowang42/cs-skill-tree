// 一个职业：技能树最上面一排的终极节点。卡片和技能卡一个样子：徽章、名字、进度、要点亮哪些、真实项目。
// 不用“设为目标”：要学的都点亮了，它自己就亮。
import { useApp } from '../state'
import { SkillGlyph, Rays, orbitDelay } from './SkillTree'
import { Links, Meter } from './common'
import { SkillSlot } from './SkillPanel'

export function SubPanel({ id }: { id: string }) {
  const { tree, readinessBySub, states, setFocus } = useApp()
  const sub = tree.subs.get(id)!
  const cat = tree.categories.get(sub.categoryId)!
  const r = readinessBySub.get(id)!
  const reached = r.coreDone >= r.coreTotal
  const bonus = sub.choices.flatMap((c) => c.options)

  const mini = (sid: string) => {
    const q = tree.skill(sid)
    const st = states.get(sid)!
    return (
      <button key={sid} className={`mini s-${st}`} onClick={() => setFocus({ kind: 'skill', id: sid }, { scroll: true })}>
        <SkillSlot uid={`sub-${id}-${sid}`} icon={q.icon} language={q.language} state={st} size={52} />
        <span className="mini-name">{q.name}</span>
        <span className="mini-state">{st === 'done' ? '已点亮' : '未点亮'}</span>
      </button>
    )
  }

  return (
    <div className={`detail skill-card career-card${reached ? ' reached' : ''}`} key={id}>
      <div className="card-head">
        <svg className={`tip career-badge${reached ? ' reached' : ''}`} width={96} height={96} viewBox="-60 -60 120 120" aria-hidden>
          {reached && <Rays r={50} count={32} long={9} short={5} delay={orbitDelay(id)} className="tip-rays" />}
          <circle className="tip-track" r={46} />
          <circle className="tip-progress" r={46} pathLength={100} strokeDasharray={`${Math.round((100 * r.coreDone) / r.coreTotal)} 100`} transform="rotate(-90)" />
          <circle className="seal" r={40} />
          <circle className="seal-inner" r={33} />
          <foreignObject x={-16} y={-16} width="32" height="32">
            <div className="tip-glyph"><SkillGlyph icon={sub.icon} size={32} /></div>
          </foreignObject>
        </svg>
        <div className="card-title">
          <p className="card-kind">职业 · {cat.name}</p>
          <h2>{sub.name}</h2>
          <span className={`badge ${reached ? 'b-done' : 'b-available'}`}>{reached ? '已达成' : `${r.coreDone} / ${r.coreTotal}`}</span>
        </div>
      </div>

      <p className="summary">{sub.intro}</p>
      <div className="goal-meter">
        <Meter value={r.coreDone} max={r.coreTotal} />
        <b>{Math.round((100 * r.coreDone) / r.coreTotal)}%</b>
      </div>
      <p className="note">
        {reached ? '要学的技能都点亮了。' : `把下面这些点亮就达成，路线上的技能在树上已经亮出来了。`}
      </p>

      <section className="card-sec">
        <h4>要点亮</h4>
        <div className="mini-row">{sub.requirements.map(mini)}</div>
      </section>

      {bonus.length > 0 && (
        <section className="card-sec">
          <h4>加分项</h4>
          <div className="mini-row">{bonus.map(mini)}</div>
        </section>
      )}

      <section className="card-sec">
        <h4>去看看真实的项目</h4>
        <Links links={sub.projects} />
      </section>
    </div>
  )
}
