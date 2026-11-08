// 一个技能：像游戏里的技能卡。技能槽、名字、状态、一句话、点亮按钮、学习流程、要先点亮的、去哪学。
import type { SkillState } from '../types'
import { TREE_URL, useApp } from '../state'
import { SkillSlot } from './glyphs'
import { CardName, Links, MiniSkill, StatusControl } from './common'

const BADGE: Record<SkillState, string> = { locked: '未解锁', available: '可点亮', done: '已点亮' }

export function SkillPanel({ id }: { id: string }) {
  const { tree, career, states } = useApp()
  const s = tree.skill(id)
  const jobs = tree.roadmap.subs.filter((c) => tree.closures.get(c.id)!.has(id))
  const state = states.get(id)!
  let row = 1
  for (let p = s.parent; p; p = tree.skill(p).parent) row++

  return (
    <div className="detail" key={id}>
      <div className="card-head">
        <SkillSlot icon={s.icon} language={s.language} state={state} />
        <div className="card-title">
          <p className="card-kind">
            {s.language ? '语言天赋' : '技能'} · {tree.areas.get(s.areaId)!.name} · 第 {row} 层
          </p>
          <CardName name={s.name} />
          <span className={`badge b-${state}`}>{BADGE[state]}</span>
        </div>
      </div>

      <p className="summary">{s.intro}</p>
      <StatusControl id={id} />
      {s.steps.length > 0 && <Flow id={id} />}

      {s.prerequisites.length > 0 && (
        <section className="card-sec">
          <h4>先点亮上一级</h4>
          <div className="mini-row">{s.prerequisites.map((p) => <MiniSkill key={p} id={p} />)}</div>
        </section>
      )}

      {jobs.length > 0 && (
        <section className="card-sec">
          <h4>
            哪些岗位要它 <span className="count">{jobs.length} / {tree.roadmap.subs.length}</span>
          </h4>
          {/* 点一个就去那条路线，停在这个技能上 */}
          <div className="jobs-row">
            {jobs.map((c) => (
              <a key={c.id} className={c.id === career ? 'on' : ''} href={`${TREE_URL}../career/${c.id}/index.html#/skill/${id}`}>
                {c.name.replace(/工程师$/, '')}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="card-sec">
        <h4>去哪学</h4>
        <Links links={s.resources} />
      </section>
    </div>
  )
}

/** 学习流程：几步连成一条竖线，每步点一下就点亮；最后一步是实战，全亮了技能就亮 */
function Flow({ id }: { id: string }) {
  const { tree, states, steps, setStep, readOnly } = useApp()
  const all = tree.skill(id).steps
  const lit = states.get(id) === 'done'
  const locked = states.get(id) === 'locked'
  const done = new Set(lit ? all.map((_, i) => i + 1) : steps.get(id) ?? [])
  return (
    <section className="card-sec">
      <h4>
        学习流程 <span className="count">{done.size} / {all.length}</span>
      </h4>
      <ol className={`flow${locked ? ' locked' : ''}`}>
        {all.map((text, i) => {
          const n = i + 1
          const on = done.has(n)
          return (
            <li key={n} className={on ? 'done' : ''}>
              <button
                disabled={locked || readOnly}
                aria-pressed={on}
                title={locked ? '先点亮上一级' : on ? '再点一下取消' : '学完了就点亮这一步'}
                onClick={() => setStep(id, n, !on)}
              >
                <span className="dot">{on ? '✓' : n}</span>
                <span>{text}{n === all.length && <span className="boss"> ★</span>}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
