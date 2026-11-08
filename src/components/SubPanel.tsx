// 一个职业：最上面一行的徽章。卡片和技能卡一个样子：徽章、名字、进度、加分项、真实项目。要学的技能在树上看，卡片里不再列一遍。
// 进度只有一处：徽章外面那一圈。打开时和数字一起从 0 长到现在，点亮一个就再长一截。
// 不用“设为目标”：要学的都点亮了，它自己就亮。
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { SkillGlyph } from './glyphs'
import { CardName, Links, MiniSkill } from './common'

/** 数字从上一次的值滚到 v（第一次从 0 开始）；不要动效的人直接给 v */
function useRoll(v: number): number {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const [x, setX] = useState(still ? v : 0)
  const from = useRef(still ? v : 0)
  useEffect(() => {
    if (still) return setX(v)
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      setX(a + (v - a) * (1 - (1 - k) ** 3))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = v
    }
  }, [v, still])
  return x
}

export function SubPanel({ id }: { id: string }) {
  const { tree, career, progressBySub } = useApp()
  const sub = tree.subs.get(id)!
  const { done, total } = progressBySub.get(id)!
  const reached = done === total
  const shown = useRoll(done)

  return (
    <div className="detail" key={id}>
      <div className="card-head">
        <svg className={`tip career-badge${reached ? ' reached' : ''}`} width={96} height={96} viewBox="-60 -60 120 120" aria-hidden>
          <circle className="tip-track" r={46} />
          <circle className="tip-progress" r={46} pathLength={100} strokeDasharray={`${(100 * shown) / total} 100`} transform="rotate(-90)" />
          <circle className="seal" r={40} />
          <foreignObject x={-16} y={-16} width="32" height="32">
            <div className="tip-glyph"><SkillGlyph icon={sub.icon} size={32} /></div>
          </foreignObject>
        </svg>
        <div className="card-title">
          <p className="card-kind">职业 · {tree.categories.get(sub.categoryId)!.name}</p>
          <CardName name={sub.name} />
          <span className={`badge ${reached ? 'b-done' : 'b-available'}`}>{reached ? '已达成' : `${Math.round(shown)} / ${total}`}</span>
        </div>
      </div>

      <p className="summary">{sub.intro}</p>
      {/* 职业天赋树上画的全是要学的，不用再说 */}
      {(reached || !career) && <p className="note">{reached ? '要学的技能都点亮了。' : '要学的技能在树上已经亮出来了。'}</p>}

      {sub.bonus.length > 0 && (
        <section className="card-sec">
          <h4>加分项</h4>
          <div className="mini-row">{sub.bonus.map((s) => <MiniSkill key={s} id={s} />)}</div>
        </section>
      )}

      <section className="card-sec">
        <h4>去看看真实的项目</h4>
        <Links links={sub.projects} />
      </section>
    </div>
  )
}
