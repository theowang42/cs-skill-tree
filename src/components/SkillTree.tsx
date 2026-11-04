// 技能网：地基在中心，每个领域朝一个方向长出去，越往外越深。白底黑线。
// 已掌握是实心黑，能学是黑框，还够不着是浅灰。悬停或选中时，前置路线和它解锁的保持清楚，其余变淡。
// 平移缩放不走 React：直接改 <g> 的 transform。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { layoutWeb, NODE_R } from '../lib/webLayout'
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
  const cls = ['node', `s-${state}`, focused && 'focused', relation !== 'none' && `r-${relation}`, pulse && 'pulse'].filter(Boolean).join(' ')
  return (
    <g
      className={cls}
      transform={`translate(${x},${y})`}
      data-node={id}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <circle className="box" r={NODE_R} />
      <foreignObject x={-12} y={-12} width="24" height="24">
        <div className="glyph">
          <SkillGlyph icon={icon} size={24} />
        </div>
      </foreignObject>
      {next && <path className="next-mark" d={`M-6,${-NODE_R - 13} L6,${-NODE_R - 13} L0,${-NODE_R - 6}Z`} />}
      <text className="lbl" y={NODE_R + 18}>{name}</text>
    </g>
  )
})

export function SkillTree() {
  const { tree, states, focus, setFocus, hover, setHover, pulse, progress, quick, readOnly, change, toast, lightWithPrerequisites, flyRequest } = useApp()
  const layout = useMemo(() => layoutWeb(tree), [tree])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  const anim = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [areaHover, setAreaHover] = useState<string | null>(null)
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
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

  const fit = useCallback((ms?: number) => {
    const b = layout.bounds
    if (!size.w) return
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(size.w / (b.maxX - b.minX), size.h / (b.maxY - b.minY))))
    flyTo({ x: size.w / 2 - ((b.minX + b.maxX) / 2) * k, y: size.h / 2 - ((b.minY + b.maxY) / 2) * k, k }, ms)
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
    if (size.w && !touched.current) fit(0)
  }, [size, fit])

  // 搜索、下一个、面板里的链接：飞到那颗节点
  useEffect(() => {
    if (!flyRequest || focus?.kind !== 'skill') return
    const n = layout.nodes.get(focus.id)!
    touched.current = true
    centerOn(n.x, n.y)
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
  const lens = hover ?? focusedSkill
  const anc = useMemo(() => (lens ? tree.ancestors(lens) : new Set<string>()), [tree, lens])
  const unlocks = useMemo(() => new Set(lens ? tree.skill(lens).dependents : []), [tree, lens])
  const areaLens = areaHover ?? focusedArea
  const relation = (id: string): Relation => {
    if (lens) {
      if (lens === id) return 'none'
      if (anc.has(id)) return 'path'
      if (unlocks.has(id)) return 'unlock'
      return 'dim'
    }
    if (areaLens) return tree.skill(id).areaId === areaLens ? 'none' : 'dim'
    return 'none'
  }
  const nextId = progress.goalSubId ? frontier(tree, states, progress.goalSubId).find((f) => f.inGoal)?.id ?? null : null

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
          {/* 领域名：淡淡地写在每一支的末端 */}
          <g className="area-labels">
            {layout.areas.map((a) => (
              <text
                key={a.id}
                x={a.x}
                y={a.y}
                className={`area-label${areaLens === a.id ? ' on' : ''}`}
                onPointerEnter={() => setAreaHover(a.id)}
                onPointerLeave={() => setAreaHover(null)}
                onClick={(e) => { e.stopPropagation(); setFocus({ kind: 'area', id: a.id }) }}
              >
                {a.name}
              </text>
            ))}
          </g>
          {/* 树干：中心到每个没有前置的技能 */}
          <g className="trunks">
            {layout.trunks.map((id) => {
              const n = layout.nodes.get(id)!
              const r = Math.hypot(n.x, n.y) || 1
              const done = states.get(id) === 'done'
              return <line key={id} x1={0} y1={0} x2={n.x - (n.x / r) * (NODE_R + 3)} y2={n.y - (n.y / r) * (NODE_R + 3)} className={`trunk${done ? ' done' : ''}${lens && relation(id) === 'dim' ? ' dim' : ''}`} />
            })}
            <circle r="5" className="root-dot" />
          </g>
          <g className="edges">
            {layout.edges.map((e) => {
              const a = states.get(e.from)!
              const b = states.get(e.to)!
              let cls = a === 'done' && b === 'done' ? 'e-done' : a === 'done' ? 'e-open' : 'e-locked'
              if (lens) {
                if ((e.to === lens || anc.has(e.to)) && anc.has(e.from)) cls += ' e-path'
                else if (e.from === lens) cls += ' e-unlock'
                else cls += ' e-dim'
              } else if (areaLens) {
                const inArea = tree.skill(e.to).areaId === areaLens
                if (!inArea) cls += ' e-dim'
              }
              return <path key={`${e.from}>${e.to}`} d={e.d} className={`edge ${cls}`} />
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
