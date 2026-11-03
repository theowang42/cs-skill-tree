// 技能树主体，从上往下：应用层（方向）→ 工具层 → 进阶层 → 核心层 → 基础层。
// 领域卡片里的技能按“领域内的前置深度”分行，第 1 行在最下面——整棵树从根往上长。
import { memo, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { SkillState } from '../types'
import { useApp, type View } from '../state'
import { ToolIcon } from './ToolIcon'
import { Edges } from './Edges'
import { Meter } from './common'
import { missingPrerequisites } from '../lib/tree'
import { STATE_LABEL } from '../lib/format'

const NEXT: Record<SkillState, 'done' | 'learning' | null> = { locked: 'done', available: 'done', done: 'learning', learning: null }

interface NodeFlags {
  state: SkillState
  focused: boolean
  /** 在当前高亮方向的必学里；值是第几步 */
  step: number | null
  /** 在当前高亮方向的任选组里 */
  choice: boolean
  /** 是选中技能的前置路线的一部分 */
  path: boolean
  /** 是选中技能直接解锁的 */
  unlock: boolean
  dim: boolean
  pulse: boolean
  delay: number
}

const SkillNode = memo(function SkillNode({ id, name, tool, flags, onClick }: { id: string; name: string; tool: boolean; flags: NodeFlags; onClick: (id: string) => void }) {
  const cls = [
    'skill', `s-${flags.state}`, tool && 'tool',
    flags.focused && 'focused', flags.step !== null && 'goal', flags.choice && 'choice',
    flags.path && 'path', flags.unlock && 'unlock', flags.dim && 'dim', flags.pulse && 'pulse',
  ].filter(Boolean).join(' ')
  const title = `${name} · ${STATE_LABEL[flags.state]}${flags.step !== null ? ` · 第 ${flags.step} 步` : ''}${flags.choice ? ' · 任选' : ''}`
  return (
    <button className={cls} data-node={`skill:${id}`} onClick={() => onClick(id)} title={title} aria-pressed={flags.focused} style={{ '--d': `${flags.delay}ms` } as CSSProperties}>
      {tool && <ToolIcon id={id} />}
      <span className="skill-name">{name}</span>
      {flags.step !== null && <span className="step">{flags.step}</span>}
    </button>
  )
})

function Layer({ num, name, sub, children, className = '' }: { num: number; name: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`layer ${className}`}>
      <header>
        <span className="layer-name">{name}</span>
        <span className="layer-num">L{num}</span>
        {sub}
      </header>
      <div className="layer-body">{children}</div>
    </section>
  )
}

function useNodeFlags() {
  const { tree, states, focus, activeSubId, view, pulse, progress } = useApp()
  return useMemo(() => {
    const steps = activeSubId ? tree.steps.get(activeSubId)! : null
    const choices = new Set(activeSubId ? tree.subs.get(activeSubId)!.choices.flatMap((c) => c.options) : [])
    const focusedSkill = focus?.kind === 'skill' ? focus.id : null
    const path = focusedSkill ? tree.ancestors(focusedSkill) : new Set<string>()
    const unlock = new Set(focusedSkill ? tree.skill(focusedSkill).dependents : [])
    const visible = (state: SkillState, step: number | null, choice: boolean, v: View) => {
      if (v === 'goal') return !activeSubId || step !== null || choice
      if (v === 'frontier') return state !== 'locked'
      return true
    }
    // 点亮动画的延迟：按依赖顺序逐个亮起
    const order = new Map<string, number>()
    if (pulse.size) tree.topoSort(pulse).forEach((id, i) => order.set(id, Math.min(i * 40, 800)))
    const flags = new Map<string, NodeFlags>()
    for (const s of tree.roadmap.skills) {
      const state = states.get(s.id)!
      const step = steps?.get(s.id) ?? null
      const choice = choices.has(s.id)
      flags.set(s.id, {
        state,
        focused: focusedSkill === s.id,
        step,
        choice,
        path: path.has(s.id),
        unlock: unlock.has(s.id),
        dim: !visible(state, step, choice, view) && focusedSkill !== s.id,
        pulse: pulse.has(s.id),
        delay: order.get(s.id) ?? 0,
      })
    }
    return flags
    // progress 变化会带来 states 变化，这里列出来是为了可读
  }, [tree, states, focus, activeSubId, view, pulse, progress])
}

function AreaCard({ id, flags, onSkill }: { id: string; flags: Map<string, NodeFlags>; onSkill: (id: string) => void }) {
  const { tree, states, focus, setFocus } = useApp()
  const area = tree.areas.get(id)!
  const tiers: string[][] = []
  for (const sid of area.skillIds) {
    const t = tree.skill(sid).tier
    ;(tiers[t - 1] ??= []).push(sid)
  }
  const done = area.skillIds.filter((s) => states.get(s) === 'done').length
  const learning = area.skillIds.filter((s) => states.get(s) === 'learning').length
  const focused = focus?.kind === 'area' && focus.id === id
  const anyGoal = area.skillIds.some((s) => flags.get(s)!.step !== null || flags.get(s)!.choice)
  const allDim = area.skillIds.every((s) => flags.get(s)!.dim)
  return (
    <section className={`area${focused ? ' focused' : ''}${anyGoal ? ' has-goal' : ''}${allDim ? ' dim' : ''}${done === area.skillIds.length ? ' complete' : ''}`} data-node={`area:${id}`}>
      <button className="area-head" onClick={() => setFocus(focused ? null : { kind: 'area', id })} title={`${area.name}：已掌握 ${done} / ${area.skillIds.length}`}>
        <span className="area-name">{area.name}</span>
        <span className="area-count">
          {done}/{area.skillIds.length}
        </span>
        <Meter value={done} partial={learning} max={area.skillIds.length} label={`${area.name}进度`} />
      </button>
      <div className="tiers">
        {tiers.map((row, i) => (
          <div className="tier" key={i}>
            {row.map((sid) => (
              <SkillNode key={sid} id={sid} name={tree.skill(sid).name} tool={false} flags={flags.get(sid)!} onClick={onSkill} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function Directions() {
  const { tree, readinessBySub, focus, setFocus, openCategory, setOpenCategory, progress } = useApp()
  const cat = openCategory ? tree.categories.get(openCategory)! : null
  if (cat) {
    return (
      <div className="dir-row" key={cat.id}>
        <button className={`dir category back${focus?.kind === 'category' && focus.id === cat.id ? ' focused' : ''}`} data-node={`category:${cat.id}`} onClick={() => { setOpenCategory(null); setFocus(null) }}>
          <strong>{cat.name}</strong>
          <span className="dir-items">← 返回全部方向</span>
        </button>
        {cat.subIds.map((sid) => {
          const s = tree.subs.get(sid)!
          const r = readinessBySub.get(sid)!
          const isGoal = progress.goalSubId === sid
          const focused = focus?.kind === 'sub' && focus.id === sid
          return (
            <button key={sid} className={`dir sub${focused ? ' focused' : ''}${isGoal ? ' is-goal' : ''}`} data-node={`sub:${sid}`} onClick={() => setFocus(focused ? { kind: 'category', id: cat.id } : { kind: 'sub', id: sid })}>
              <strong>
                {isGoal && <span className="goal-star" aria-label="我的目标">★</span>}
                {s.name}
              </strong>
              <ul className="dir-items">
                {s.items.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <span className="dir-ready">
                <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} label="就绪度" />
                <small>{Math.round(r.percent)}%</small>
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="dir-row">
      {tree.roadmap.categories.map((c) => {
        const best = c.subIds.map((s) => readinessBySub.get(s)!).sort((a, b) => b.percent - a.percent)[0]
        const hasGoal = progress.goalSubId && c.subIds.includes(progress.goalSubId)
        return (
          <button key={c.id} className={`dir category${hasGoal ? ' is-goal' : ''}`} data-node={`category:${c.id}`} onClick={() => setFocus({ kind: 'category', id: c.id })}>
            <strong>
              {hasGoal && <span className="goal-star" aria-label="目标在这里">★</span>}
              {c.name}
            </strong>
            <ul className="dir-items">
              {c.items.map((x) => <li key={x}>{x}</li>)}
            </ul>
            {best.percent > 0 && (
              <span className="dir-best">
                最近：{tree.subs.get(best.subId)!.name} {Math.round(best.percent)}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TreeView() {
  const app = useApp()
  const { tree, focus, setFocus, quick, readOnly, change, progress, toast, lightWithPrerequisites, states } = app
  const flags = useNodeFlags()
  const ref = useRef<HTMLDivElement>(null)
  const layers = [...tree.roadmap.layers].reverse()
  const total = layers.length + 2

  const onSkill = (id: string) => {
    if (quick && !readOnly) {
      const next = NEXT[states.get(id)!]
      change({ [id]: next })
      if (next === 'done') {
        const missing = missingPrerequisites(tree, id, progress)
        if (missing.length) toast(`「${tree.skill(id).name}」还有 ${missing.length} 个前置没点亮`, { label: '一起点亮', run: () => lightWithPrerequisites(id) })
      }
      return
    }
    setFocus(focus?.kind === 'skill' && focus.id === id ? null : { kind: 'skill', id })
  }

  return (
    <div className={`tree${quick && !readOnly ? ' quick' : ''}${focus?.kind === 'skill' ? ' has-focus' : ''}`} ref={ref}>
      <Edges container={ref} />
      <Layer num={total} name="应用层" className="layer-apps" sub={<span className="layer-hint">选一个方向，看它需要什么</span>}>
        <Directions />
      </Layer>
      <Layer num={total - 1} name="工具层" className="layer-tools">
        {tree.roadmap.toolGroups.map((g) => (
          <div key={g.id} className="tool-group">
            <h3>{g.shortName}</h3>
            <div className="tool-row">
              {g.skillIds.map((sid) => (
                <SkillNode key={sid} id={sid} name={tree.skill(sid).name} tool flags={flags.get(sid)!} onClick={onSkill} />
              ))}
            </div>
          </div>
        ))}
      </Layer>
      {layers.map((l, i) => (
        <Layer key={l.id} num={layers.length - i} name={l.name} className={`layer-${l.id}`}>
          <div className="areas">
            {l.areaIds.map((aid) => (
              <AreaCard key={aid} id={aid} flags={flags} onSkill={onSkill} />
            ))}
          </div>
        </Layer>
      ))}
    </div>
  )
}
