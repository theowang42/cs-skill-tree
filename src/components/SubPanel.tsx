// 一个职业：最外圈的徽章。卡片和技能卡一个样子：徽章、名字、进度、加分项、真实项目。要学的技能在树上看，卡片里不再列一遍。
// 不用“设为目标”：要学的都点亮了，它自己就亮。
import { useApp } from '../state'
import { Rays, SkillGlyph } from './glyphs'
import { CardName, Links, Meter, MiniSkill } from './common'
import { stars } from '../lib/tree'

export function SubPanel({ id }: { id: string }) {
  const { tree, career, progressBySub } = useApp()
  const sub = tree.subs.get(id)!
  const { done, total } = progressBySub.get(id)!
  const reached = done === total
  const pct = Math.round((100 * done) / total)

  return (
    <div className="detail" key={id}>
      <div className="card-head">
        <svg className={`tip career-badge${reached ? ' reached' : ''}`} width={96} height={96} viewBox="-60 -60 120 120" aria-hidden>
          {reached && <Rays r={50} count={32} long={9} short={5} id={id} className="tip-rays" />}
          <circle className="tip-track" r={46} />
          <circle className="tip-progress" r={46} pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90)" />
          <circle className="seal" r={40} />
          <circle className="seal-inner" r={33} />
          <foreignObject x={-16} y={-16} width="32" height="32">
            <div className="tip-glyph"><SkillGlyph icon={sub.icon} size={32} /></div>
          </foreignObject>
        </svg>
        <div className="card-title">
          <p className="card-kind">职业 · {tree.categories.get(sub.categoryId)!.name} · <span className="tip-stars">{stars(total)}</span></p>
          <CardName name={sub.name} />
          <span className={`badge ${reached ? 'b-done' : 'b-available'}`}>{reached ? '已达成' : `${done} / ${total}`}</span>
        </div>
      </div>

      <p className="summary">{sub.intro}</p>
      <div className="goal-meter">
        <Meter value={done} max={total} />
        <b>{pct}%</b>
      </div>
      {/* 职业天赋树上画的全是要学的，不用再说 */}
      {(reached || !career) && <p className="note">{reached ? '要学的技能都点亮了。' : '要学的技能在树上已经亮出来了。'}</p>}

      {sub.bonus.length > 0 && (
        <section className="card-sec">
          <h4>加分项</h4>
          <div className="mini-row">{sub.bonus.map((s) => <MiniSkill key={s} id={s} from={`sub-${id}`} />)}</div>
        </section>
      )}

      <section className="card-sec">
        <h4>去看看真实的项目</h4>
        <Links links={sub.projects} />
      </section>
    </div>
  )
}
