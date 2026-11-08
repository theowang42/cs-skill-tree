// 技能树：从“你”往外一层一层长，最外面一层是职业徽章（lib/layout.ts）。白底黑线。
// 往上长时名字在节点下面，往右长时名字在节点右边；用哪个方向由页面挑（App.tsx）。
// 技能树页一次画一个领域（页签切换）；职业页只画这个职业要学的技能和它的徽章，画法一样。
// 每个节点一个图标和名字。点亮了是实心黑，能点是黑框，还够不着是浅灰。和首页一样只用细黑线，不加光芒。
// 每个节点只画一根枝（连到主前置）；悬停或选中时，它的全部前置保持清楚，其余变淡。
import { memo, useEffect, useMemo, useState } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { fromText, hexPath, LABEL_Y, NODE_R, SIDE_X, START_R, subNodeId, TIP_R, type Layout } from '../lib/layout'
import { frontier, totals } from '../lib/tree'
import { SkillGlyph } from './glyphs'
import { useCamera } from './useCamera'

/** 打开时树从“你”往外一层层长出来：离“你”越远，出现得越晚 */
const growDelay = (x: number, y: number) => ({ animationDelay: `${Math.round(Math.hypot(x, y) * 0.45)}ms` })

type Relation = 'none' | 'path' | 'dim'

interface NodeProps {
  id: string
  language: boolean
  x: number
  y: number
  name: string
  icon: string
  state: SkillState
  focused: boolean
  relation: Relation
  pulse: boolean
  /** 学习流程完成了几成（0 到 1），没点亮时外圈画出这一段 */
  part: number
  /** 名字写在节点右边（往右长的树），不是下面 */
  side: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

const Node = memo(function Node({ id, language, x, y, name, icon, state, focused, relation, pulse, part, side, onClick, onHover }: NodeProps) {
  const cls = ['node', `s-${state}`, focused && 'focused', relation !== 'none' && `r-${relation}`, pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      style={growDelay(x, y)}
      data-node={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      {language ? (
        <>
          {pulse && <path className="ripple" d={hexPath(NODE_R + 2)} />}
          <path className="box" d={hexPath(NODE_R + 2)} />
          {part > 0 && <path className="part" d={hexPath(NODE_R + 8)} pathLength={100} strokeDasharray={`${part * 100} 100`} />}
        </>
      ) : (
        <>
          {pulse && <circle className="ripple" r={NODE_R} />}
          <circle className="box" r={NODE_R} />
          {part > 0 && <circle className="part" r={NODE_R + 6} pathLength={100} strokeDasharray={`${part * 100} 100`} transform="rotate(-90)" />}
        </>
      )}
      <foreignObject x={-14} y={-14} width="28" height="28">
        <div className="glyph">
          <SkillGlyph icon={icon} size={28} />
        </div>
      </foreignObject>
      {side ? <text className="lbl side" x={SIDE_X} y={5}>{name}</text> : <text className="lbl" y={LABEL_Y}>{name}</text>}
    </g>
  )
})

interface TipProps {
  id: string
  x: number
  y: number
  name: string
  icon: string
  /** 要学的技能点亮了几个、一共几个 */
  done: number
  total: number
  focused: boolean
  dim: boolean
  pulse: boolean
  /** 名字写在徽章右边（往右长的树），不是上面 */
  side: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

/**
 * 职业：最上面一行的终极节点。一个圆，中间是职业图标，外面一圈进度环随着点亮慢慢填满。
 * 全部点亮就自动达成：圆变黑，图标变白。
 */
const Tip = memo(function Tip({ id, x, y, name, icon, done, total, focused, dim, pulse, side, onClick, onHover }: TipProps) {
  const reached = done === total
  const cls = ['tip', reached && 'reached', focused && 'focused', dim && 'dim', pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      style={growDelay(x, y)}
      data-sub={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      {side ? <rect className="hit" x={-TIP_R - 8} y={-TIP_R - 8} width={2 * TIP_R + 170} height={2 * TIP_R + 16} /> : <rect className="hit" x={-80} y={-TIP_R - 68} width={160} height={2 * TIP_R + 78} />}
      <circle className="tip-track" r={TIP_R + 5} />
      <circle className="tip-progress" r={TIP_R + 5} pathLength={100} strokeDasharray={`${Math.round((100 * done) / total)} 100`} transform="rotate(-90)" />
      <circle className="seal" r={TIP_R} />
      <foreignObject x={-16} y={-16} width="32" height="32">
        <div className="tip-glyph"><SkillGlyph icon={icon} size={32} /></div>
      </foreignObject>
      {/* 名字和进度写在进度环外面 */}
      <text className={`tip-name${side ? ' side' : ''}`} x={side ? TIP_R + 14 : 0} y={side ? -4 : -TIP_R - 48}>{name}</text>
      <text className={`tip-pct${side ? ' side' : ''}`} x={side ? TIP_R + 14 : 0} y={side ? 14 : -TIP_R - 31}>{reached ? '已达成' : `${done} / ${total}`}</text>
    </g>
  )
})

export function SkillTree({ layout, onCenter }: { layout: Layout; onCenter: () => void }) {
  const { tree, career, route, states, steps, focus, setFocus, pulse, flyRequest, progressBySub } = useApp()
  const side = layout.orient === 'right'
  const cam = useCamera(layout.bounds, layout.orient)
  const [hover, setHover] = useState<string | null>(null)
  const [tipHover, setTipHover] = useState<string | null>(null)
  const [centerHover, setCenterHover] = useState(false)
  const lit = useMemo(() => totals(states), [states])
  /** 下一步能点亮的 */
  const next = useMemo(() => new Set(frontier(tree, states)), [tree, states])
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const focusedSub = focus?.kind === 'sub' ? focus.id : null

  /** 把这些节点整片放进屏幕（徽章上面还有名字和进度，往上多留一点） */
  const flyOver = (ids: string[]) => {
    const pts = ids.flatMap((id) => layout.nodes.get(id) ?? [])
    const pad = 90
    const minX = Math.min(...pts.map((p) => p.x)) - pad
    const maxX = Math.max(...pts.map((p) => p.x)) + pad
    const minY = Math.min(...pts.map((p) => p.y)) - pad - TIP_R
    const maxY = Math.max(...pts.map((p) => p.y)) + pad
    // 面板正要打开时会占掉右边一块（已经开着的话，size.w 已经是让过之后的宽度）
    const { w: sw, h: sh } = cam.size
    const w = sw > 900 && window.innerWidth - sw < 100 ? sw - 360 : sw
    cam.fly((minX + maxX) / 2, (minY + maxY) / 2, Math.min(1.1, w / (maxX - minX), sh / (maxY - minY)), w)
  }

  // 选中了技能或职业，并且要求飞过去：技能放到屏幕正中；职业把它要学的整条路线放进屏幕。
  // 屏幕尺寸还没量出来时先等着，量好了再飞
  const measured = cam.size.w > 0
  useEffect(() => {
    if (!flyRequest || !measured || !focus) return
    // 职业天赋树上没有的技能和职业，就不飞
    if (focus.kind === 'skill') {
      const n = layout.nodes.get(focus.id)
      if (n) cam.fly(n.x, n.y, Math.max(cam.scale(), 1))
      return
    }
    if (layout.nodes.has(subNodeId(focus.id))) flyOver([subNodeId(focus.id), ...tree.closures.get(focus.id)!])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest, measured])

  // ── 关系 ──
  // 看一个技能：它的全部前置画成黑的。看一个职业：它要学的全部技能。悬停“你”：下一步能点亮的
  // 职业天赋树上画的全是这个职业要学的，看职业就不用再标出来
  const subLens = career ? null : tipHover ?? (hover ? null : focusedSub)
  const lens = subLens ? null : hover ?? focusedSkill
  const anc = useMemo(() => (lens ? tree.ancestors(lens) : new Set<string>()), [tree, lens])
  const plan = subLens ? tree.closures.get(subLens)! : null
  // 技能树页里选定了路线：平时路线外的变浅（看别的东西时按那个来）
  const mine = !career && route ? tree.closures.get(route)! : null
  const relation = (id: string): Relation => {
    if (centerHover) return next.has(id) ? 'path' : 'dim'
    if (plan) return plan.has(id) ? 'path' : 'dim'
    if (lens) return lens === id ? 'none' : anc.has(id) ? 'path' : 'dim'
    return mine && !mine.has(id) ? 'dim' : 'none'
  }
  /** 一根枝在当前视角下怎么画 */
  const edgeLens = (from: string, to: string): string => {
    if (centerHover) return next.has(to) ? ' e-path' : ' e-dim'
    if (plan) {
      if (to.startsWith('sub:')) return to === subNodeId(subLens!) ? ' e-path' : ' e-dim'
      return (from === 'root' || plan.has(from)) && plan.has(to) ? ' e-path' : ' e-dim'
    }
    if (lens) return (to === lens || anc.has(to)) && (from === 'root' || anc.has(from)) ? ' e-path' : ' e-dim'
    if (mine) return (to.startsWith('sub:') ? to === subNodeId(route!) : mine.has(to)) ? '' : ' e-dim'
    return ''
  }
  const edgeState = (from: string, to: string) => {
    const a = from === 'root' ? 'done' : states.get(from)
    const p = to.startsWith('sub:') ? progressBySub.get(to.slice(4))! : null
    const b = p ? (p.done === p.total ? 'done' : 'locked') : states.get(to)
    return a === 'done' && b === 'done' ? 'e-done' : a === 'done' ? 'e-open' : 'e-locked'
  }

  const onTip = (id: string) => {
    if (!cam.dragged()) setFocus(focusedSub === id ? null : { kind: 'sub', id })
  }
  const onNode = (id: string) => {
    if (!cam.dragged()) setFocus(focusedSkill === id ? null : { kind: 'skill', id })
  }

  return (
    <div className="web-wrap" ref={cam.wrap}>
      <svg
        ref={cam.svg}
        className="web"
        width={cam.size.w || 1}
        height={cam.size.h || 1}
        {...cam.handlers}
        onClick={() => { if (!cam.dragged()) setFocus(null) }}
        role="img"
        aria-label="技能树"
      >
        <g ref={cam.world}>
          {layout.edges.map((e) => {
            const n = layout.nodes.get(e.to)!
            const state = edgeState(e.from, e.to)
            return (
              <g key={`${e.from}>${e.to}`}>
                <path d={e.d} pathLength={1} style={growDelay(n.x, n.y)} className={`edge ${state}${edgeLens(e.from, e.to)}`} />
                {/* 两头都点亮了：一道光沿着枝条往外流 */}
                {state === 'e-done' && <path d={e.d} pathLength={100} className="edge-light" style={{ animationDelay: `${Math.round(Math.hypot(n.x, n.y) * 0.8)}ms` }} />}
              </g>
            )
          })}
          {/* 最下面的“你”：中间是点亮了几个，外圈是总进度；悬停看下一步能点哪些，点开看我的进度 */}
          <g
            className={`start${lit.done ? ' lit' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`你：已点亮 ${lit.done} / ${lit.total}。点开看我的进度`}
            onPointerEnter={() => setCenterHover(true)}
            onPointerLeave={() => setCenterHover(false)}
            onClick={(e) => {
              e.stopPropagation()
              if (!cam.dragged()) onCenter()
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCenter() }}
          >
            <title>{`你：已点亮 ${lit.done} / ${lit.total}\n悬停看下一步能点哪些，点开看我的进度`}</title>
            <circle className="start-track" r={START_R + 4} />
            <circle className="start-progress" r={START_R + 4} pathLength={100} strokeDasharray={`${(lit.done / lit.total) * 100} 100`} transform="rotate(-90)" />
            <circle className="start-ring" r={START_R - 2} />
            <text className="start-num" y={-7}>{lit.done}</text>
            <text className="start-lbl" y={15}>我的进度</text>
          </g>
          {tree.roadmap.subs.filter((sub) => layout.nodes.has(subNodeId(sub.id))).map((sub) => {
            const n = layout.nodes.get(subNodeId(sub.id))!
            const p = progressBySub.get(sub.id)!
            return (
              <Tip
                key={sub.id}
                id={sub.id}
                x={n.x}
                y={n.y}
                name={sub.name}
                icon={sub.icon}
                done={p.done}
                total={p.total}
                pulse={pulse.has(`sub:${sub.id}`)}
                side={side}
                focused={focusedSub === sub.id}
                dim={subLens !== null || lens !== null || centerHover ? (subLens !== null && subLens !== sub.id) || (lens !== null && !tree.closures.get(sub.id)!.has(lens)) : mine !== null && sub.id !== route}
                onClick={onTip}
                onHover={setTipHover}
              />
            )
          })}
          {tree.roadmap.skills.filter((s) => layout.nodes.has(s.id)).map((s) => {
            const n = layout.nodes.get(s.id)!
            return (
              <Node
                key={s.id}
                id={s.id}
                language={s.language}
                x={n.x}
                y={n.y}
                name={s.name}
                icon={s.icon}
                state={states.get(s.id)!}
                focused={focusedSkill === s.id}
                relation={relation(s.id)}
                pulse={pulse.has(s.id)}
                part={(steps.get(s.id)?.length ?? 0) / (s.steps.length || 1)}
                side={side}
                onClick={onNode}
                onHover={setHover}
              />
            )
          })}
          {/* 主前置在别的领域：名字下面写“先会 某某”，点它跳到那个领域 */}
          {[...layout.outside].map(([id, from]) => {
            const n = layout.nodes.get(id)!
            return (
              <text
                key={id}
                className={`from${side ? ' side' : ''}`}
                x={side ? n.x + SIDE_X : n.x}
                y={side ? n.y + 22 : n.y + LABEL_Y + 18}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!cam.dragged()) setFocus({ kind: 'skill', id: from }, { scroll: true })
                }}
              >
                <title>{`在「${tree.areas.get(tree.skill(from).areaId)!.name}」里，点它过去`}</title>
                {fromText(tree.skill(from).name)}
              </text>
            )
          })}
        </g>
      </svg>

      <div className="web-tools">
        <button onClick={() => cam.zoom(1.25)} aria-label="放大">+</button>
        <button onClick={() => cam.zoom(1 / 1.25)} aria-label="缩小">−</button>
        <button onClick={cam.fit} aria-label="看全图" title="看全图">⊡</button>
      </div>
    </div>
  )
}
