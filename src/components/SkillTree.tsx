// 技能树：左边是分支列表，中间一次只看一个分支。
// 五个等级永远是五行，同一个等级在每个分支里都在同一个高度。
// 已掌握是实心黑，能学是黑框，还够不着是浅灰。线只在分支内部画，跨分支的前置列在顶上。
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Brain, Cloud, Code, Cpu, Database, Globe, Hammer, Network, Shield, Smartphone, type LucideIcon } from 'lucide-react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { CELL, LEVEL_NAMES, layoutBranch, ROW } from '../lib/branchLayout'
import { ICONS } from '../generated/icons'
import { frontier, missingPrerequisites } from '../lib/tree'

/** 分支的图标：只在左边列表里用 */
const BRANCH_ICONS: Record<string, LucideIcon> = {
  lang: Code, craft: Network, tools: Hammer, web: Globe, data: Database,
  systems: Cpu, cloud: Cloud, security: Shield, ai: Brain, client: Smartphone,
}

export function SkillGlyph({ icon, size }: { icon: string; size: number }) {
  const spec = ICONS[icon]
  if (!spec) return null
  if (spec.kind === 'lucide') {
    const I = spec.Icon
    return <I width={size} height={size} strokeWidth={1.6} absoluteStrokeWidth />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={spec.title}>
      <path d={spec.path} fill="currentColor" />
    </svg>
  )
}

interface NodeProps {
  id: string
  x: number
  y: number
  name: string
  icon: string
  state: SkillState
  focused: boolean
  related: 'none' | 'path' | 'unlock' | 'dim'
  goal: boolean
  next: boolean
  pulse: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

const Node = memo(function Node({ id, x, y, name, icon, state, focused, related, goal, next, pulse, onClick, onHover }: NodeProps) {
  const cls = ['node', `s-${state}`, focused && 'focused', related !== 'none' && `r-${related}`, goal && 'goal', pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g className={cls} transform={`translate(${x},${y})`} onClick={() => onClick(id)} onPointerEnter={() => onHover(id)} onPointerLeave={() => onHover(null)} data-node={id}>
      <rect className="box" width={CELL} height={CELL} rx="12" />
      <foreignObject x={(CELL - 28) / 2} y={(CELL - 28) / 2} width="28" height="28">
        <div className="glyph">
          <SkillGlyph icon={icon} size={28} />
        </div>
      </foreignObject>
      {next && <path className="next-mark" d={`M${CELL / 2 - 6},-12 L${CELL / 2 + 6},-12 L${CELL / 2},-5Z`} />}
      <text className="lbl" x={CELL / 2} y={CELL + 20}>{name}</text>
    </g>
  )
})

function Section({ children }: { children: ReactNode }) {
  return <div className="branch-section">{children}</div>
}

export function SkillTree() {
  const { tree, states, focus, setFocus, hover, setHover, pulse, progress, quick, readOnly, change, toast, lightWithPrerequisites, activeSubId, readinessBySub } = useApp()
  const firstArea = tree.roadmap.areas[0].id
  const [branch, setBranch] = useState(firstArea)

  // 选中别的分支里的技能（搜索、下一个、面板里的链接）时，跟着切过去
  useEffect(() => {
    if (focus?.kind === 'skill') {
      const a = tree.skill(focus.id).areaId
      if (a && a !== branch) setBranch(a)
    } else if (focus?.kind === 'area' && focus.id !== branch) setBranch(focus.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const layout = useMemo(() => layoutBranch(tree, branch), [tree, branch])
  const area = tree.areas.get(branch)!
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const lens = hover ?? focusedSkill
  const goal = activeSubId ? tree.closures.get(activeSubId)! : null
  const nextId = progress.goalSubId ? frontier(tree, states, progress.goalSubId).find((f) => f.inGoal)?.id ?? null : null

  const relation = (id: string): NodeProps['related'] => {
    if (!lens || lens === id) return 'none'
    if (tree.ancestors(lens).has(id)) return 'path'
    if (tree.skill(lens).dependents.includes(id)) return 'unlock'
    return 'dim'
  }

  const onClick = (id: string) => {
    if (quick && !readOnly) {
      const cur = states.get(id)!
      const next = cur === 'done' ? 'learning' : cur === 'learning' ? null : 'done'
      change({ [id]: next })
      if (next === 'done') {
        const missing = missingPrerequisites(tree, id, progress)
        if (missing.length) toast(`「${tree.skill(id).name}」还有 ${missing.length} 个前置没点亮`, { label: '一起点亮', run: () => lightWithPrerequisites(id) })
      }
      return
    }
    setFocus(focusedSkill === id ? null : { kind: 'skill', id })
  }

  const done = area.skillIds.filter((s) => states.get(s) === 'done').length

  return (
    <div className={`tree-page${quick && !readOnly ? ' quick' : ''}`}>
      <nav className="branches" aria-label="分支">
        {tree.roadmap.areas.map((a) => {
          const I = BRANCH_ICONS[a.id] ?? Code
          const d = a.skillIds.filter((s) => states.get(s) === 'done').length
          const goalLeft = goal ? a.skillIds.filter((s) => goal.has(s) && states.get(s) !== 'done').length : 0
          return (
            <button key={a.id} className={`branch${a.id === branch ? ' on' : ''}`} onClick={() => { setBranch(a.id); if (focus?.kind === 'skill') setFocus(null) }}>
              <I width={18} height={18} strokeWidth={1.6} />
              <span className="branch-name">{a.name}</span>
              {goalLeft > 0 && <span className="branch-goal" title={`目标还差 ${goalLeft} 个`}>{goalLeft}</span>}
              <span className="branch-count">{d}/{a.skillIds.length}</span>
            </button>
          )
        })}
      </nav>

      <main className="branch-view">
        <header className="branch-head">
          <h1>{area.name}</h1>
          <p>{area.intro}</p>
          <span className="branch-progress">{done} / {area.skillIds.length} 已掌握</span>
        </header>

        {layout.external.length > 0 && (
          <Section>
            <span className="ext-label">先要会</span>
            {layout.external.map((id) => {
              const s = tree.skill(id)
              const st = states.get(id)!
              return (
                <button key={id} className={`ext s-${st}${lens && relation(id) === 'path' ? ' hl' : ''}`} onClick={() => setFocus({ kind: 'skill', id })} title={`${s.name} · ${tree.containerName(id)}`}>
                  <SkillGlyph icon={s.icon} size={14} />
                  {s.name}
                </button>
              )
            })}
          </Section>
        )}

        <div className="canvas">
          <svg viewBox={`0 -30 ${layout.width} ${layout.height + 30}`} width={layout.width} height={layout.height + 30} className="branch-svg" role="img" aria-label={`${area.name}技能树`}>
            <g className="levels">
              {[1, 2, 3, 4, 5].map((lv) => (
                <g key={lv} transform={`translate(0,${(lv - 1) * ROW})`}>
                  <text className="level-name" x={0} y={CELL / 2 + 5}>{LEVEL_NAMES[lv]}</text>
                  {lv > 1 && <line className="level-line" x1={0} y1={-ROW + CELL + 52} x2={layout.width} y2={-ROW + CELL + 52} />}
                </g>
              ))}
            </g>
            <g className="edges">
              {layout.edges.map((e) => {
                const a = states.get(e.from)!
                const b = states.get(e.to)!
                const lit = a === 'done' && b === 'done' ? 'e-done' : a === 'done' ? 'e-open' : 'e-locked'
                let rel = ''
                if (lens) {
                  const anc = tree.ancestors(lens)
                  if ((e.to === lens || anc.has(e.to)) && anc.has(e.from)) rel = ' e-path'
                  else if (e.from === lens) rel = ' e-unlock'
                  else rel = ' e-dim'
                }
                return <path key={`${e.from}>${e.to}`} d={e.d} className={`edge ${lit}${rel}`} />
              })}
            </g>
            <g className="nodes">
              {layout.nodes.map((n) => {
                const s = tree.skill(n.id)
                return (
                  <Node
                    key={n.id}
                    id={n.id}
                    x={n.x}
                    y={n.y}
                    name={s.name}
                    icon={s.icon}
                    state={states.get(n.id)!}
                    focused={focusedSkill === n.id}
                    related={relation(n.id)}
                    goal={goal?.has(n.id) ?? false}
                    next={nextId === n.id}
                    pulse={pulse.has(n.id)}
                    onClick={onClick}
                    onHover={setHover}
                  />
                )
              })}
            </g>
          </svg>
        </div>

        {progress.goalSubId && readinessBySub.get(progress.goalSubId) && (
          <p className="branch-foot">
            <span className="goal-dot" aria-hidden /> 红色小三角是目标「{tree.subs.get(progress.goalSubId)!.name}」里下一个该学的
          </p>
        )}
      </main>
    </div>
  )
}
