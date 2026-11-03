// 细分方向：介绍、就绪度、按步骤的学习路线、任选组、代表项目
import { useState } from 'react'
import { useApp } from '../state'
import { Links, Meter, Section, SkillChip } from './common'

export function SubPanel({ id }: { id: string }) {
  const { tree, states, progress, readinessBySub, setGoal, readOnly, setFocus, change } = useApp()
  const sub = tree.subs.get(id)!
  const cat = tree.categories.get(sub.categoryId)!
  const r = readinessBySub.get(id)!
  const isGoal = progress.goalSubId === id
  const [showDone, setShowDone] = useState(false)

  const steps = new Map<number, string[]>()
  for (const p of sub.plan) steps.set(p.step, [...(steps.get(p.step) ?? []), p.skillId])
  const stepList = [...steps].sort((a, b) => a[0] - b[0])
  const isDone = (sid: string) => states.get(sid) === 'done'
  const doneSteps = stepList.filter(([, ids]) => ids.every(isDone)).map(([n]) => n)
  // 连续完成的前几步折叠起来
  let leading = 0
  while (leading < stepList.length && doneSteps.includes(stepList[leading][0])) leading++
  const visibleSteps = showDone ? stepList : stepList.slice(leading)
  const tools = sub.requirements.filter((s) => tree.skill(s).kind === 'tool')
  const markAll = () => change(Object.fromEntries(sub.plan.map((p) => [p.skillId, 'done' as const])), { undo: true, message: `「${sub.name}」的必学技能全部标为已掌握` })

  return (
    <div className="detail" key={id}>
      <p className="eyebrow">
        <button className="link-button" onClick={() => setFocus({ kind: 'category', id: cat.id })}>应用层 · {cat.name}</button>
      </p>
      <h2>{sub.name}</h2>
      <p className="summary">{sub.intro}</p>

      <div className="goal-meter">
        <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} label="就绪度" />
        <b>{Math.round(r.percent)}%</b>
      </div>
      <p className="muted small">
        必学 {r.coreTotal} 个技能，已掌握 {r.coreDone} 个{r.coreLearning > 0 && `、在学 ${r.coreLearning} 个`}
        {r.choiceTotal > 0 && `；任选 ${r.choiceTotal} 组，已满足 ${r.choiceDone} 组`}
      </p>
      {!readOnly && (
        <div className="row-actions">
          {isGoal ? (
            <button onClick={() => setGoal(null)}>★ 已是我的目标（取消）</button>
          ) : (
            <button className="primary" onClick={() => setGoal(id)}>设为我的目标</button>
          )}
        </div>
      )}

      <Section title="具体做这些">
        <ul className="includes">{sub.topics.map((t) => <li key={t}>{t}</li>)}</ul>
      </Section>
      {tools.length > 0 && (
        <Section title="会用到的工具">
          <div className="chips">{tools.map((t) => <SkillChip key={t} id={t} />)}</div>
        </Section>
      )}

      <Section title={`学习路线 · ${stepList.length} 步`} aside={<span className="muted small">同一步里的可以一起学</span>}>
        {leading > 0 && !showDone && (
          <button className="link-button steps-folded" onClick={() => setShowDone(true)}>
            ✓ 第 1{leading > 1 ? `–${leading}` : ''} 步已全部掌握（展开）
          </button>
        )}
        <ol className="steps">
          {visibleSteps.map(([n, ids]) => {
            const d = ids.filter(isDone).length
            return (
              <li key={n} className={d === ids.length ? 'step-done' : ''}>
                <span className="step-num">
                  第 {n} 步 <small>{d}/{ids.length}</small>
                </span>
                <div className="chips">{ids.map((sid) => <SkillChip key={sid} id={sid} />)}</div>
              </li>
            )
          })}
        </ol>
        {!readOnly && r.coreDone < r.coreTotal && (
          <button className="link-button" onClick={markAll}>这些我全会</button>
        )}
      </Section>

      {sub.choices.length > 0 && (
        <Section title="任选其一">
          {sub.choices.map((c) => {
            const ok = c.options.some(isDone)
            return (
              <div key={c.label} className="choice-group">
                <p className="label">
                  {c.label}
                  {ok && <span className="success"> ✓</span>}
                  {c.options.length === 1 && <small className="muted">（加分项）</small>}
                </p>
                <div className="chips">{c.options.map((o) => <SkillChip key={o} id={o} />)}</div>
              </div>
            )
          })}
        </Section>
      )}

      <Section title="去看看真实的开源项目">
        <Links links={sub.projects} />
      </Section>
    </div>
  )
}
