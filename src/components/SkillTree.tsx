// 技能树：一个圆，圆心是“你”，一圈一圈往外长，最外圈是职业。白底黑线。
// 职业页只画这个职业的天赋树：竖着长，“你”在最下面，徽章在最上面（lib/careerLayout.ts），画法一样。
// 每个节点一个图标和名字。点亮了是实心黑加一圈光芒，能点是黑框，还够不着是浅灰。
// 每个节点只画一根枝（连到主前置）；悬停或选中时，它的全部前置保持清楚，其余变淡。
import { memo, useEffect, useMemo, useState } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { LABEL_Y, layoutWeb, NODE_R, START_R, subNodeId, TIP_R } from '../lib/webLayout'
import { layoutCareer } from '../lib/careerLayout'
import { frontier, stars, totals } from '../lib/tree'
import { hexPath, Rays, SkillGlyph } from './glyphs'
import { useCamera } from './useCamera'

/** 打开时整棵树从圆心往外一圈圈长出来：离圆心越远，出现得越晚 */
const growDelay = (x: number, y: number) => ({ animationDelay: `${Math.round(Math.hypot(x, y) * 0.32)}ms` })

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
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

const Node = memo(function Node({ id, language, x, y, name, icon, state, focused, relation, pulse, part, onClick, onHover }: NodeProps) {
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
          <path className="ring" d={hexPath(NODE_R + 8)} />
          {pulse && <path className="ripple" d={hexPath(NODE_R + 2)} />}
          <path className="box" d={hexPath(NODE_R + 2)} />
          {part > 0 && <path className="part" d={hexPath(NODE_R + 8)} pathLength={100} strokeDasharray={`${part * 100} 100`} />}
        </>
      ) : (
        <>
          <circle className="ring" r={NODE_R + 6} />
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
      {state === 'done' && <Rays r={NODE_R + 6} id={id} />}
      {/* 点亮那一刻：八道光芒往外散开 */}
      {pulse && state === 'done' && (
        <g className="sparks">
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={0} y1={-NODE_R - 10} x2={0} y2={-NODE_R - 22} transform={`rotate(${i * 45})`} />
          ))}
        </g>
      )}
      <text className="lbl" y={LABEL_Y}>{name}</text>
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
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

/**
 * 职业：最外圈的终极节点。一枚双圈的奖章，中间是职业图标，外面一圈进度环随着点亮慢慢填满。
 * 全部点亮就自动达成：徽章变黑，外面一大圈光芒转起来。
 */
const Tip = memo(function Tip({ id, x, y, name, icon, done, total, focused, dim, pulse, onClick, onHover }: TipProps) {
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
      <rect className="hit" x={-80} y={-TIP_R - 68} width={160} height={2 * TIP_R + 78} />
      {reached && <Rays r={TIP_R + 12} count={32} long={14} short={7} id={id} className="tip-rays" />}
      <circle className="tip-track" r={TIP_R + 5} />
      <circle className="tip-progress" r={TIP_R + 5} pathLength={100} strokeDasharray={`${Math.round((100 * done) / total)} 100`} transform="rotate(-90)" />
      <circle className="seal" r={TIP_R} />
      <circle className="seal-inner" r={TIP_R - 7} />
      <foreignObject x={-16} y={-16} width="32" height="32">
        <div className="tip-glyph"><SkillGlyph icon={icon} size={32} /></div>
      </foreignObject>
      {/* 达成那一刻：两圈波纹和一圈光芒冲出去 */}
      {pulse && reached && (
        <g className="burst">
          <circle className="burst-ring" r={TIP_R} />
          <circle className="burst-ring late" r={TIP_R} />
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1={0} y1={-TIP_R - 16} x2={0} y2={-TIP_R - 34} transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
      )}
      {/* 名字和进度写在光芒外面，达成后转起来的光芒不会压到字 */}
      <text className="tip-name" y={-TIP_R - 48}>{name}</text>
      <text className="tip-pct" y={-TIP_R - 31}>
        <tspan className="tip-stars">{stars(total)}</tspan>
        {'  '}
        {reached ? '已达成' : `${done} / ${total}`}
      </text>
    </g>
  )
})

export function SkillTree({ onCenter }: { onCenter: () => void }) {
  const { tree, career, states, steps, focus, setFocus, pulse, flyRequest, progressBySub } = useApp()
  const layout = useMemo(() => (career ? layoutCareer(tree, career) : layoutWeb(tree)), [tree, career])
  const cam = useCamera(layout.bounds)
  const [hover, setHover] = useState<string | null>(null)
  const [tipHover, setTipHover] = useState<string | null>(null)
  const [centerHover, setCenterHover] = useState(false)
  const lit = useMemo(() => totals(states), [states])
  /** 下一步能点亮的 */
  const next = useMemo(() => new Set(frontier(tree, states)), [tree, states])
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const focusedSub = focus?.kind === 'sub' ? focus.id : null

  // 选中了技能或职业，并且要求飞过去：技能放到屏幕正中；职业把它要学的整条路线放进屏幕。
  // 屏幕尺寸还没量出来时先等着，量好了再飞
  const measured = cam.size.w > 0
  useEffect(() => {
    if (!flyRequest || !measured || !focus || focus.kind === 'careers') return
    // 职业天赋树上没有的技能和职业，就不飞
    if (focus.kind === 'skill') {
      const n = layout.nodes.get(focus.id)
      if (n) cam.fly(n.x, n.y, Math.max(cam.scale(), 1))
      return
    }
    if (!layout.nodes.has(subNodeId(focus.id))) return
    const pts = [subNodeId(focus.id), ...tree.closures.get(focus.id)!].map((id) => layout.nodes.get(id)!)
    const pad = 90
    const minX = Math.min(...pts.map((p) => p.x)) - pad
    const maxX = Math.max(...pts.map((p) => p.x)) + pad
    // 徽章上面还有名字和星级
    const minY = Math.min(...pts.map((p) => p.y)) - pad - TIP_R
    const maxY = Math.max(...pts.map((p) => p.y)) + pad
    // 面板正要打开时会占掉右边一块（已经开着的话，size.w 已经是让过之后的宽度）
    const { w: sw, h: sh } = cam.size
    const w = sw > 900 && window.innerWidth - sw < 100 ? sw - 360 : sw
    cam.fly((minX + maxX) / 2, (minY + maxY) / 2, Math.min(1.1, w / (maxX - minX), sh / (maxY - minY)), w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest, measured])

  // ── 关系 ──
  // 看一个技能：它的全部前置画成黑的。看一个职业：它要学的全部技能。悬停圆心：下一步能点亮的
  // 职业天赋树上画的全是这个职业要学的，看职业就不用再标出来
  const subLens = career ? null : tipHover ?? (hover ? null : focusedSub)
  const lens = subLens ? null : hover ?? focusedSkill
  const anc = useMemo(() => (lens ? tree.ancestors(lens) : new Set<string>()), [tree, lens])
  const plan = subLens ? tree.closures.get(subLens)! : null
  const relation = (id: string): Relation => {
    if (centerHover) return next.has(id) ? 'path' : 'dim'
    if (plan) return plan.has(id) ? 'path' : 'dim'
    if (lens) return lens === id ? 'none' : anc.has(id) ? 'path' : 'dim'
    return 'none'
  }
  /** 一根枝在当前视角下怎么画 */
  const edgeLens = (from: string, to: string): string => {
    if (centerHover) return next.has(to) ? ' e-path' : ' e-dim'
    if (plan) {
      if (to.startsWith('sub:')) return to === subNodeId(subLens!) ? ' e-path' : ' e-dim'
      return (from === 'root' || plan.has(from)) && plan.has(to) ? ' e-path' : ' e-dim'
    }
    if (lens) return (to === lens || anc.has(to)) && (from === 'root' || anc.has(from)) ? ' e-path' : ' e-dim'
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
          <g className="rings" aria-hidden>
            {layout.rings.map((r, i) => <circle key={r} r={r} style={{ animationDelay: `${i * 0.5}s` }} />)}
          </g>
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
          {/* 圆心：你。中间是点亮了几个，外圈是总进度；悬停看下一步能点哪些，点开看我的进度 */}
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
            {lit.done > 0 && <Rays r={START_R + 9} count={32} long={10} short={5} />}
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
                focused={focusedSub === sub.id}
                dim={(subLens !== null && subLens !== sub.id) || (lens !== null && !tree.closures.get(sub.id)!.has(lens))}
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
                onClick={onNode}
                onHover={setHover}
              />
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
