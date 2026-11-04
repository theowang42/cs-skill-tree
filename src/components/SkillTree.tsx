// 技能树：CS 核心课在中心，一条条链往四周长，枝头是方向。白底黑线。
// 课程是方块（里面是课号），技能是圆（里面是图标）。已掌握是实心黑，能学是黑框，还够不着是浅灰。
// 每个节点只画一根枝（连到主前置）；悬停或选中时，其余前置用虚线补出来，整条路线保持清楚，其余变淡。
// 平移缩放不走 React：直接改 <g> 的 transform。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { layoutWeb, NODE_R, subNodeId } from '../lib/webLayout'
import { ICONS } from '../generated/icons'
import { frontier, missingPrerequisites } from '../lib/tree'

interface View {
  x: number
  y: number
  k: number
}

const MIN_K = 0.3
const MAX_K = 2.5
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const isCourse = (icon: string) => icon.startsWith('text:')

export function SkillGlyph({ icon, size }: { icon: string; size: number }) {
  if (isCourse(icon)) return <span className="code" style={{ fontSize: size * 0.5 }}>{icon.slice(5)}</span>
  const spec = ICONS[icon]
  if (!spec) return null
  if (spec.kind === 'lucide') {
    const I = spec.Icon
    return <I width={size} height={size} strokeWidth={1.7} absoluteStrokeWidth />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={spec.title}>
      <path d={spec.path} fill="currentColor" />
    </svg>
  )
}

type Relation = 'none' | 'path' | 'unlock' | 'dim'

interface NodeProps {
  id: string
  x: number
  y: number
  name: string
  icon: string
  state: SkillState
  focused: boolean
  relation: Relation
  next: boolean
  pulse: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

const Node = memo(function Node({ id, x, y, name, icon, state, focused, relation, next, pulse, onClick, onHover }: NodeProps) {
  const cls = ['node', isCourse(icon) && 'course', `s-${state}`, focused && 'focused', relation !== 'none' && `r-${relation}`, pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      data-node={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      {isCourse(icon) ? (
        <>
          <rect className="box" x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={6} />
          <text className="code" dy="0.35em">{icon.slice(5)}</text>
        </>
      ) : (
        <>
          <circle className="box" r={NODE_R} />
          <foreignObject x={-12} y={-12} width="24" height="24">
            <div className="glyph">
              <SkillGlyph icon={icon} size={24} />
            </div>
          </foreignObject>
        </>
      )}
      {next && <path className="next-mark" d={`M-6,${-NODE_R - 13} L6,${-NODE_R - 13} L0,${-NODE_R - 6}Z`} />}
      <text className="lbl" y={NODE_R + 18}>{name}</text>
    </g>
  )
})

interface TipProps {
  id: string
  x: number
  y: number
  /** 朝外的方向：名字写在菱形外侧，不压到枝上的节点 */
  angle: number
  name: string
  percent: number
  goal: boolean
  focused: boolean
  dim: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

/** 枝头的方向：一个小菱形和名字。点它看要学什么、设为目标 */
const Tip = memo(function Tip({ id, x, y, angle, name, percent, goal, focused, dim, onClick, onHover }: TipProps) {
  const c = Math.cos(angle)
  const sn = Math.sin(angle)
  // 左右两边：名字横着写在外侧；上下：写在菱形的上方或下方
  const side = c > 0.4 ? 'start' : c < -0.4 ? 'end' : 'middle'
  const tx = side === 'start' ? 14 : side === 'end' ? -14 : 0
  const ty = side === 'middle' ? (sn > 0 ? 24 : -26) : 0
  const hitW = 130
  const cls = ['tip', goal && 'goal', focused && 'focused', dim && 'dim', percent >= 100 && 'reached'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      data-sub={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <rect className="hit" x={side === 'start' ? -12 : side === 'end' ? -hitW : -hitW / 2} y={side === 'middle' ? (sn > 0 ? -12 : -50) : -20} width={side === 'middle' ? hitW : hitW + 12} height={side === 'middle' ? 62 : 44} />
      <path className="diamond" d="M0,-8 L8,0 L0,8 L-8,0Z" />
      <text className="tip-name" x={tx} y={ty} dy="0.1em" style={{ textAnchor: side }}>{name}</text>
      <text className="tip-pct" x={tx} y={ty + 16} dy="0.1em" style={{ textAnchor: side }}>{Math.round(percent)}%</text>
    </g>
  )
})

export function SkillTree() {
  const { tree, states, focus, setFocus, hover, setHover, pulse, progress, quick, readOnly, change, toast, lightWithPrerequisites, flyRequest, readinessBySub } = useApp()
  const layout = useMemo(() => layoutWeb(tree), [tree])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  const anim = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [tipHover, setTipHover] = useState<string | null>(null)
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const focusedSub = focus?.kind === 'sub' ? focus.id : null
  const focusedArea = focus?.kind === 'area' ? focus.id : null

  // ── 视图 ──
  const apply = useCallback((v: View) => {
    viewRef.current = v
    world.current?.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`)
  }, [])

  const flyTo = useCallback((t: View, ms = 550) => {
    cancelAnimationFrame(anim.current)
    const from = { ...viewRef.current }
    if (ms <= 0) return apply(t)
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const e = ease(p)
      apply({ x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e, k: from.k + (t.k - from.k) * e })
      if (p < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [apply])

  /** 看全图 */
  const fit = useCallback((ms?: number) => {
    const b = layout.bounds
    if (!size.w) return
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(size.w / (b.maxX - b.minX), size.h / (b.maxY - b.minY))))
    flyTo({ x: size.w / 2 - ((b.minX + b.maxX) / 2) * k, y: size.h / 2 - ((b.minY + b.maxY) / 2) * k, k }, ms)
  }, [layout, size, flyTo])

  /** 打开时：从中心的核心课看起，字看得清；往外拖或缩小再看枝头 */
  const home = useCallback((ms?: number) => {
    const b = layout.bounds
    if (!size.w) return
    const all = Math.min(size.w / (b.maxX - b.minX), size.h / (b.maxY - b.minY))
    const k = Math.min(1, Math.max(all, size.w < 700 ? 0.6 : 0.78))
    flyTo({ x: size.w / 2, y: size.h / 2 + 40 * k, k }, ms)
  }, [layout, size, flyTo])

  const centerOn = useCallback((x: number, y: number) => {
    const k = Math.max(viewRef.current.k, 1)
    flyTo({ x: size.w / 2 - x * k, y: size.h / 2 - y * k, k })
  }, [size, flyTo])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 第一次：整张网刚好放进屏幕；之后窗口变化也重新适配，除非用户已经动过
  const touched = useRef(false)
  useEffect(() => {
    if (size.w && !touched.current) home(0)
  }, [size, home])

  // 搜索、下一个、面板里的链接：飞到那颗节点
  useEffect(() => {
    if (!flyRequest || (focus?.kind !== 'skill' && focus?.kind !== 'sub')) return
    touched.current = true
    if (focus.kind === 'skill') {
      const n = layout.nodes.get(focus.id)!
      centerOn(n.x, n.y)
      return
    }
    // 方向：把它要学的整条路线放进屏幕
    const pts = [subNodeId(focus.id), ...tree.closures.get(focus.id)!].map((id) => layout.nodes.get(id)!)
    const pad = 90
    const minX = Math.min(...pts.map((p) => p.x)) - pad
    const maxX = Math.max(...pts.map((p) => p.x)) + pad
    const minY = Math.min(...pts.map((p) => p.y)) - pad
    const maxY = Math.max(...pts.map((p) => p.y)) + pad
    // 面板正要打开时会占掉右边一块（已经开着的话，size.w 已经是让过之后的宽度）
    const panelComing = size.w > 900 && window.innerWidth - size.w < 100
    const w = panelComing ? size.w - 360 : size.w
    const k = Math.min(1.1, Math.max(MIN_K, Math.min(w / (maxX - minX), size.h / (maxY - minY))))
    flyTo({ x: w / 2 - ((minX + maxX) / 2) * k, y: size.h / 2 - ((minY + maxY) / 2) * k, k })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest])

  // ── 拖动平移、滚轮缩放、双指缩放 ──
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; k: number } | null>(null)

  const zoomAt = useCallback((sx: number, sy: number, k: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const px = sx - rect.left
    const py = sy - rect.top
    const v = viewRef.current
    const nk = Math.min(MAX_K, Math.max(MIN_K, k))
    apply({ x: px - ((px - v.x) / v.k) * nk, y: py - ((py - v.y) / v.k) * nk, k: nk })
  }, [apply])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      touched.current = true
      zoomAt(e.clientX, e.clientY, viewRef.current.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onDown = (e: RPointerEvent) => {
    cancelAnimationFrame(anim.current)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: viewRef.current.k }
      drag.current = null
    }
  }
  const onMove = (e: RPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d)
      return
    }
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true
      touched.current = true
      svg.current?.setPointerCapture(e.pointerId)
    }
    if (d.moved) apply({ ...viewRef.current, x: d.vx + dx, y: d.vy + dy })
  }
  const onUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const d = drag.current
    window.setTimeout(() => { if (drag.current === d) drag.current = null }, 0)
  }

  // ── 关系 ──
  // 看一个技能：它的全部前置和它直接解锁的。看一个方向：它要学的全部技能。
  const subLens = tipHover ?? (hover ? null : focusedSub)
  const lens = subLens ? null : hover ?? focusedSkill
  const anc = useMemo(() => (lens ? tree.ancestors(lens) : new Set<string>()), [tree, lens])
  const unlocks = useMemo(() => new Set(lens ? tree.skill(lens).dependents : []), [tree, lens])
  const plan = useMemo(() => (subLens ? tree.closures.get(subLens)! : null), [tree, subLens])
  const relation = (id: string): Relation => {
    if (plan) return plan.has(id) ? 'path' : 'dim'
    if (lens) {
      if (lens === id) return 'none'
      if (anc.has(id)) return 'path'
      if (unlocks.has(id)) return 'unlock'
      return 'dim'
    }
    if (focusedArea) return tree.skill(id).areaId === focusedArea ? 'none' : 'dim'
    return 'none'
  }
  /** 一根枝在当前视角下怎么画 */
  const edgeLens = (from: string, to: string): string => {
    if (plan) {
      if (to.startsWith('sub:')) return to === subNodeId(subLens!) ? ' e-path' : ' e-dim'
      return (from === 'root' || plan.has(from)) && plan.has(to) ? ' e-path' : ' e-dim'
    }
    if (lens) {
      if ((to === lens || anc.has(to)) && (from === 'root' || anc.has(from))) return ' e-path'
      if (from === lens && !to.startsWith('sub:')) return ' e-unlock'
      return ' e-dim'
    }
    if (focusedArea) return !to.startsWith('sub:') && tree.skill(to).areaId === focusedArea ? '' : ' e-dim'
    return ''
  }
  /** 平时不画的其余前置：只在它属于当前路线时补出来 */
  const extraOn = (from: string, to: string): boolean => {
    if (plan) return plan.has(from) && plan.has(to)
    if (lens) return (to === lens || anc.has(to)) && anc.has(from)
    return false
  }
  const edgeState = (from: string, to: string) => {
    const a = from === 'root' ? 'done' : states.get(from)
    const b = to.startsWith('sub:') ? (readinessBySub.get(to.slice(4))!.percent >= 100 ? 'done' : 'locked') : states.get(to)
    return a === 'done' && b === 'done' ? 'e-done' : a === 'done' ? 'e-open' : 'e-locked'
  }
  const nextId = progress.goalSubId ? frontier(tree, states, progress.goalSubId).find((f) => f.inGoal)?.id ?? null : null

  const onTip = useCallback((id: string) => {
    if (drag.current?.moved) return
    setFocus(focusedSub === id ? null : { kind: 'sub', id })
  }, [focusedSub, setFocus])

  const onClick = (id: string) => {
    if (drag.current?.moved) return
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

  return (
    <div className={`web-wrap${quick && !readOnly ? ' quick' : ''}`} ref={wrap}>
      <svg
        ref={svg}
        className="web"
        width={size.w || 1}
        height={size.h || 1}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={() => { if (!drag.current?.moved) setFocus(null) }}
        role="img"
        aria-label="技能树"
      >
        <g ref={world}>
          <g className="edges">
            {layout.edges.map((e) => (
              <path key={`${e.from}>${e.to}`} d={e.d} className={`edge ${edgeState(e.from, e.to)}${edgeLens(e.from, e.to)}${e.to.startsWith('sub:') ? ' e-tip' : ''}`} />
            ))}
            {(lens || plan) && layout.extra.filter((e) => extraOn(e.from, e.to)).map((e) => (
              <path key={`x:${e.from}>${e.to}`} d={e.d} className={`edge e-extra ${edgeState(e.from, e.to)}`} />
            ))}
            <circle r="6" className="root-dot" />
          </g>
          <g className="tips">
            {tree.roadmap.subs.map((sub) => {
              const n = layout.nodes.get(subNodeId(sub.id))!
              return (
                <Tip
                  key={sub.id}
                  id={sub.id}
                  x={n.x}
                  y={n.y}
                  angle={n.angle}
                  name={sub.name}
                  percent={readinessBySub.get(sub.id)!.percent}
                  goal={progress.goalSubId === sub.id}
                  focused={focusedSub === sub.id}
                  dim={(subLens !== null && subLens !== sub.id) || (lens !== null && !tree.closures.get(sub.id)!.has(lens))}
                  onClick={onTip}
                  onHover={setTipHover}
                />
              )
            })}
          </g>
          <g className="nodes">
            {tree.roadmap.skills.map((s) => {
              const n = layout.nodes.get(s.id)!
              return (
                <Node
                  key={s.id}
                  id={s.id}
                  x={n.x}
                  y={n.y}
                  name={s.name}
                  icon={s.icon}
                  state={states.get(s.id)!}
                  focused={focusedSkill === s.id}
                  relation={relation(s.id)}
                  next={nextId === s.id}
                  pulse={pulse.has(s.id)}
                  onClick={onClick}
                  onHover={setHover}
                />
              )
            })}
          </g>
        </g>
      </svg>

      <div className="web-tools">
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, viewRef.current.k * 1.25)} aria-label="放大">+</button>
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, viewRef.current.k / 1.25)} aria-label="缩小">−</button>
        <button onClick={() => { touched.current = false; fit() }} aria-label="看全图" title="看全图">⊡</button>
      </div>
    </div>
  )
}
