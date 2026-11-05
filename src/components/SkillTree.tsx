// 技能树：从下往上长，一列一列，最上面一排是方向。白底黑线。
// 每个节点一个图标和名字。点亮了是实心黑，能点是黑框，还够不着是浅灰。只有点亮和没点亮两种状态。
// 每个节点只画一根枝（连到主前置）；悬停或选中时，它的全部前置和它解锁的保持清楚，其余变淡。
// 平移缩放不走 React：直接改 <g> 的 transform。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { LABEL_Y, layoutWeb, NODE_R, subNodeId, TIP_R } from '../lib/webLayout'
import { ICONS } from '../generated/icons'

interface View {
  x: number
  y: number
  k: number
}

const MIN_K = 0.3
const MAX_K = 2.5
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function SkillGlyph({ icon, size }: { icon: string; size: number }) {
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

type Relation = 'none' | 'path' | 'dim'

/**
 * 点亮了：节点外面一圈向外放射的光芒（长短相间的短线，像太阳），整圈慢慢旋转。
 * r 是光芒从哪里开始（离中心多远）；圆和六边形都用同一圈。
 */
export function Rays({ r, delay, count = 24, long = 9, short = 5, className = '' }: { r: number; delay?: string; count?: number; long?: number; short?: number; className?: string }) {
  return (
    <g className={`rays ${className}`} aria-hidden>
      <g className="rays-spin" style={{ animationDelay: delay }}>
        {Array.from({ length: count }, (_, i) => {
          const a = (Math.PI * 2 * i) / count
          const len = i % 2 === 0 ? long : short
          const c = Math.cos(a)
          const sn = Math.sin(a)
          return <line key={i} x1={(c * r).toFixed(1)} y1={(sn * r).toFixed(1)} x2={(c * (r + len)).toFixed(1)} y2={(sn * (r + len)).toFixed(1)} />
        })}
      </g>
    </g>
  )
}

/** 每个节点的光芒转到不同的角度，整张图不会齐刷刷一起转 */
export function orbitDelay(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return `${-(Math.abs(h) % 2800)}ms`
}

/** 六边形（语言天赋）：尖朝上，外接圆半径 r */
export const hexPath = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ') + 'Z'

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
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

const Node = memo(function Node({ id, language, x, y, name, icon, state, focused, relation, pulse, onClick, onHover }: NodeProps) {
  const cls = ['node', language && 'lang', `s-${state}`, focused && 'focused', relation !== 'none' && `r-${relation}`, pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      data-node={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      {/* 点亮后外面多一圈：像游戏里激活了的技能槽 */}
      {language ? (
        <>
          <path className="ring" d={hexPath(NODE_R + 8)} />
          {pulse && <path className="ripple" d={hexPath(NODE_R + 2)} />}
          <path className="box" d={hexPath(NODE_R + 2)} />
        </>
      ) : (
        <>
          <circle className="ring" r={NODE_R + 6} />
          {pulse && <circle className="ripple" r={NODE_R} />}
          <circle className="box" r={NODE_R} />
        </>
      )}
      <foreignObject x={-14} y={-14} width="28" height="28">
        <div className="glyph">
          <SkillGlyph icon={icon} size={28} />
        </div>
      </foreignObject>
      {/* 点亮了：外面一圈光芒慢慢转 */}
      {state === 'done' && <Rays r={NODE_R + 6} delay={orbitDelay(id)} />}
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
 * 职业：技能树最上面一排的终极节点。一枚双圈的奖章（外粗内细），中间是职业图标，
 * 外面一圈进度环随着点亮要学的技能慢慢填满。全部点亮就自动达成：徽章变黑，外面一大圈光芒转起来。
 */
const Tip = memo(function Tip({ id, x, y, name, icon, done, total, focused, dim, pulse, onClick, onHover }: TipProps) {
  const reached = total > 0 && done >= total
  const pct = total ? Math.round((100 * done) / total) : 0
  const cls = ['tip', reached && 'reached', focused && 'focused', dim && 'dim', pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      data-sub={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <rect className="hit" x={-80} y={-TIP_R - 68} width={160} height={2 * TIP_R + 78} />
      {reached && <Rays r={TIP_R + 12} count={32} long={14} short={7} delay={orbitDelay(id)} className="tip-rays" />}
      {/* 进度环：要学的技能点亮了多少 */}
      <circle className="tip-track" r={TIP_R + 5} />
      <circle className="tip-progress" r={TIP_R + 5} pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90)" />
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
      <text className="tip-pct" y={-TIP_R - 31}>{reached ? '已达成' : `${done} / ${total}`}</text>
    </g>
  )
})

export function SkillTree() {
  const { tree, states, focus, setFocus, hover, setHover, pulse, quick, readOnly, change, flyRequest, readinessBySub } = useApp()
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

  /** 打开时：从最下面的起点看起，主线在屏幕中间，字看得清；往上拖或点“看全图”再看方向 */
  const home = useCallback((ms?: number) => {
    if (!size.w) return
    const k = size.w < 700 ? 0.85 : 1.15
    flyTo({ x: size.w / 2 - layout.home.x * k, y: size.h - (size.w < 700 ? 120 : 80) - layout.home.y * k, k }, ms)
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
  // 看一个技能：只亮它往下的全部依赖（要先点亮的），都画成黑边。看一个方向：它要学的全部技能。
  const subLens = tipHover ?? (hover ? null : focusedSub)
  const lens = subLens ? null : hover ?? focusedSkill
  const anc = useMemo(() => (lens ? tree.ancestors(lens) : new Set<string>()), [tree, lens])
  const plan = useMemo(() => (subLens ? tree.closures.get(subLens)! : null), [tree, subLens])
  const relation = (id: string): Relation => {
    if (plan) return plan.has(id) ? 'path' : 'dim'
    if (lens) {
      if (lens === id) return 'none'
      if (anc.has(id)) return 'path'
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
      return ' e-dim'
    }
    if (focusedArea) return !to.startsWith('sub:') && tree.skill(to).areaId === focusedArea ? '' : ' e-dim'
    return ''
  }
  const edgeState = (from: string, to: string) => {
    const a = from === 'root' ? 'done' : states.get(from)
    const r = to.startsWith('sub:') ? readinessBySub.get(to.slice(4))! : null
    const b = r ? (r.coreDone >= r.coreTotal ? 'done' : 'locked') : states.get(to)
    return a === 'done' && b === 'done' ? 'e-done' : a === 'done' ? 'e-open' : 'e-locked'
  }

  const onTip = useCallback((id: string) => {
    if (drag.current?.moved) return
    setFocus(focusedSub === id ? null : { kind: 'sub', id })
  }, [focusedSub, setFocus])

  const onClick = (id: string) => {
    if (drag.current?.moved) return
    if (quick && !readOnly) {
      // 前置没点亮会被挡下并提示；取消会连带熄灭依赖它的
      change({ [id]: states.get(id) === 'done' ? null : 'done' })
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
                  name={sub.name}
                  icon={sub.icon}
                  done={readinessBySub.get(sub.id)!.coreDone}
                  total={readinessBySub.get(sub.id)!.coreTotal}
                  pulse={pulse.has(`sub:${sub.id}`)}
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
                  language={s.language}
                  x={n.x}
                  y={n.y}
                  name={s.name}
                  icon={s.icon}
                  state={states.get(s.id)!}
                  focused={focusedSkill === s.id}
                  relation={relation(s.id)}
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
