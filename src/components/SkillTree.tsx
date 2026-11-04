// 技能树：白底黑线。行是等级，列是分支，节点是带图标的方块，线从前置指向它解锁的技能。
// 全图都看得见：已掌握是实心黑，能学的是黑框，还够不着的是浅灰。
// 平移缩放不走 React：直接改 <g> 的 transform；只有缩放跨过档位时才 setState。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { GAP_Y, LEVEL_NAMES, layoutTree, NODE } from '../lib/treeLayout'
import { AREA_ICONS } from '../lib/areaIcons'
import { ICONS, MONOGRAMS, STROKE_ICONS } from '../lib/icons'
import { frontier, missingPrerequisites } from '../lib/tree'
import { STATE_LABEL } from '../lib/format'

interface View {
  x: number
  y: number
  k: number
}

const MIN_K = 0.12
const MAX_K = 2.5
const CLICK_SLOP = 5
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const zoomLevel = (k: number) => (k < 0.45 ? 0 : 1)

interface NodeFlags {
  state: SkillState
  focused: boolean
  hovered: boolean
  inGoal: boolean
  next: boolean
  path: boolean
  unlock: boolean
  dim: boolean
  pulse: boolean
  delay: number
}

const same = (a: NodeFlags, b: NodeFlags) =>
  a.state === b.state && a.focused === b.focused && a.hovered === b.hovered && a.inGoal === b.inGoal && a.next === b.next &&
  a.path === b.path && a.unlock === b.unlock && a.dim === b.dim && a.pulse === b.pulse && a.delay === b.delay

function Icon({ id, area, tool }: { id: string; area: string; tool: boolean }) {
  if (tool) {
    const si = ICONS[id]
    if (si) return <path className="ico-fill" d={si.path} />
    const st = STROKE_ICONS[id]
    if (st) return <>{st.map((d) => <path key={d} className="ico" d={d} />)}</>
    return <text className="ico-text" y="4">{MONOGRAMS[id] ?? id.slice(0, 2).toUpperCase()}</text>
  }
  const paths = AREA_ICONS[area] ?? AREA_ICONS.programming
  return <>{paths.map((d) => <path key={d} className="ico" d={d} />)}</>
}

const Node = memo(function Node({
  id, x, y, name, area, tool, flags, onClick, onEnter, onLeave,
}: {
  id: string; x: number; y: number; name: string; area: string; tool: boolean; flags: NodeFlags
  onClick: (id: string, e: RMouseEvent<SVGGElement>) => void; onEnter: (id: string) => void; onLeave: () => void
}) {
  const cls = [
    'node', `s-${flags.state}`, tool && 'tool', flags.focused && 'focused', flags.hovered && 'hovered', flags.inGoal && 'goal',
    flags.next && 'next', flags.path && 'path', flags.unlock && 'unlock', flags.dim && 'dim', flags.pulse && 'pulse',
  ].filter(Boolean).join(' ')
  return (
    <g className={cls} transform={`translate(${x},${y})`} data-node={id} style={{ '--d': `${flags.delay}ms` } as React.CSSProperties} onClick={(e) => onClick(id, e)} onPointerEnter={() => onEnter(id)} onPointerLeave={onLeave}>
      <rect className="box" width={NODE} height={NODE} rx="4" />
      <g transform={`translate(${NODE / 2 - 12},${NODE / 2 - 12})`}>
        <Icon id={id} area={area} tool={tool} />
      </g>
      {flags.next && <path className="next-mark" d={`M${NODE / 2 - 5},-9 L${NODE / 2},-3 L${NODE / 2 + 5},-9Z`} />}
      <text className="lbl" x={NODE / 2} y={NODE + 15}>{name}</text>
    </g>
  )
}, (a, b) => a.id === b.id && a.onClick === b.onClick && a.onEnter === b.onEnter && a.onLeave === b.onLeave && same(a.flags, b.flags))

export function SkillTree() {
  const { tree, states, focus, setFocus, hover, setHover, activeSubId, pulse, progress, quick, readOnly, change, lightWithPrerequisites, toast, flyRequest, setStatus } = useApp()
  const layout = useMemo(() => layoutTree(tree), [tree])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  const [zoomTier, setZoomTier] = useState(1)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const anim = useRef<number>(0)
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const focusedPos = focusedSkill ? layout.nodes.get(focusedSkill)! : null
  // 放在 ref 里，镜头动画里的回调才拿得到最新的焦点
  const focusedPosRef = useRef(focusedPos)
  focusedPosRef.current = focusedPos

  // ── 视图 ──
  const placeCard = useCallback((v: View) => {
    const el = card.current
    const p = focusedPosRef.current
    if (!el || !p) return
    el.style.left = `${v.x + (p.x + NODE / 2) * v.k}px`
    el.style.top = `${v.y + (p.y + NODE) * v.k + 18}px`
  }, [])

  const applyView = useCallback((v: View) => {
    viewRef.current = v
    const g = world.current
    const s = svg.current
    if (!g || !s) return
    g.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`)
    const tier = zoomLevel(v.k)
    s.dataset.zoom = String(tier)
    setZoomTier((t) => (t === tier ? t : tier))
    placeCard(v)
  }, [placeCard])
  useEffect(() => placeCard(viewRef.current), [placeCard, focusedPos])

  const flyTo = useCallback((target: View, ms = 600) => {
    cancelAnimationFrame(anim.current)
    const from = { ...viewRef.current }
    if (ms <= 0) {
      applyView(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const e = ease(t)
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e)
      applyView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k })
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [applyView])

  const centerOn = useCallback((wx: number, wy: number, k: number, ms?: number) => {
    flyTo({ x: size.w / 2 - wx * k, y: size.h / 2 - wy * k, k }, ms)
  }, [size, flyTo])

  const fitBox = useCallback((minX: number, minY: number, maxX: number, maxY: number, pad = 60, ms?: number) => {
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min((size.w - pad * 2) / (maxX - minX || 1), (size.h - pad * 2) / (maxY - minY || 1))))
    centerOn((minX + maxX) / 2, (minY + maxY) / 2, k, ms)
  }, [size, centerOn])

  const fitAll = useCallback((ms?: number) => fitBox(-90, -40, layout.width + 20, layout.height + 40, 24, ms), [fitBox, layout])

  /** 聚焦到已掌握和能学的节点 */
  const fitKnown = useCallback((ms?: number) => {
    const pts = [...states].filter(([, s]) => s !== 'locked').map(([id]) => layout.nodes.get(id)!)
    if (pts.length < 4) return fitAll(ms)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs) + NODE, Math.max(...ys) + NODE + 20, 100, ms)
  }, [states, layout, fitBox, fitAll])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 第一次：还没点亮任何东西就看起点那片（入门和基础的前几个分支），否则看点亮的部分
  const booted = useRef(false)
  useEffect(() => {
    if (booted.current || !size.w) return
    booted.current = true
    const lit = [...states.values()].some((s) => s === 'done')
    if (lit) {
      fitKnown(0)
    } else {
      const upto = layout.branches.find((b) => b.id === 'tooling') ?? layout.branches[Math.min(6, layout.branches.length - 1)]
      const band = layout.bands[1]
      fitBox(-80, -40, upto.x + upto.width, band.y + band.height, 40, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  useEffect(() => {
    if (!flyRequest || !focus) return
    const k = Math.max(viewRef.current.k, 1)
    if (focus.kind === 'skill') {
      const p = layout.nodes.get(focus.id)!
      centerOn(p.x + NODE / 2, p.y + NODE / 2, k)
    } else if (focus.kind === 'area') {
      const b = layout.branches.find((x) => x.id === focus.id)
      if (b) fitBox(b.x, 0, b.x + b.width, layout.height, 80)
    } else if (focus.kind === 'sub') {
      const pts = [...tree.closures.get(focus.id)!].map((id) => layout.nodes.get(id)!)
      fitBox(Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)) + NODE, Math.max(...pts.map((p) => p.y)) + NODE, 60)
    } else if (focus.kind === 'category') {
      fitAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest])

  // ── 指针 ──
  const drag = useRef<{ id: number; x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const pinch = useRef<{ d: number; k: number; cx: number; cy: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const zoomAt = useCallback((sx: number, sy: number, k: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const px = sx - rect.left
    const py = sy - rect.top
    const v = viewRef.current
    const wx = (px - v.x) / v.k
    const wy = (py - v.y) / v.k
    applyView({ x: px - wx * k, y: py - wy * k, k })
  }, [applyView])

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    cancelAnimationFrame(anim.current)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: viewRef.current.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
      drag.current = null
      for (const id of pointers.current.keys()) {
        try {
          svg.current?.setPointerCapture(id)
        } catch {
          // 忽略
        }
      }
    }
  }
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomAt(pinch.current.cx, pinch.current.cy, Math.min(MAX_K, Math.max(MIN_K, (pinch.current.k * d) / pinch.current.d)))
      return
    }
    const dr = drag.current
    if (!dr || dr.id !== e.pointerId) return
    const dx = e.clientX - dr.x
    const dy = e.clientY - dr.y
    if (!dr.moved && Math.hypot(dx, dy) > CLICK_SLOP) {
      dr.moved = true
      try {
        svg.current?.setPointerCapture(e.pointerId)
      } catch {
        // 忽略
      }
    }
    if (dr.moved) applyView({ ...viewRef.current, x: dr.vx + dx, y: dr.vy + dy })
  }
  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const dr = drag.current
    if (dr && dr.id === e.pointerId) window.setTimeout(() => { if (drag.current === dr) drag.current = null }, 0)
  }
  const onSvgClick = (e: RMouseEvent<SVGSVGElement>) => {
    if (drag.current?.moved) return
    if (!(e.target as Element).closest('[data-node], [data-branch]')) setFocus(null)
  }
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01)
        zoomAt(e.clientX, e.clientY, Math.min(MAX_K, Math.max(MIN_K, viewRef.current.k * factor)))
      } else {
        // 普通滚轮是平移，像看一张大图；按住 Ctrl 才缩放
        const v = viewRef.current
        applyView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, applyView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.key === '+' || e.key === '=') zoomAt(size.w / 2, size.h / 2, Math.min(MAX_K, viewRef.current.k * 1.25))
      else if (e.key === '-') zoomAt(size.w / 2, size.h / 2, Math.max(MIN_K, viewRef.current.k / 1.25))
      else if (e.key === '0') fitAll()
      else if (e.key === '1') fitKnown()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [size, fitAll, fitKnown, zoomAt])

  // ── 标志 ──
  const flags = useMemo(() => {
    const goal = activeSubId ? tree.closures.get(activeSubId)! : null
    const lens = hover ?? focusedSkill
    const path = lens ? tree.ancestors(lens) : new Set<string>()
    const unlock = new Set(lens ? tree.skill(lens).dependents : [])
    const nextId = progress.goalSubId ? frontier(tree, states, progress.goalSubId).find((f) => f.inGoal)?.id ?? null : null
    const order = new Map<string, number>()
    if (pulse.size) tree.topoSort(pulse).forEach((id, i) => order.set(id, Math.min(i * 60, 1200)))
    const m = new Map<string, NodeFlags>()
    for (const s of tree.roadmap.skills) {
      const state = states.get(s.id)!
      m.set(s.id, {
        state, focused: focusedSkill === s.id, hovered: hover === s.id, inGoal: goal?.has(s.id) ?? false, next: nextId === s.id,
        path: path.has(s.id), unlock: unlock.has(s.id),
        dim: lens !== null && lens !== s.id && !path.has(s.id) && !unlock.has(s.id),
        pulse: pulse.has(s.id), delay: order.get(s.id) ?? 0,
      })
    }
    return m
  }, [tree, states, focusedSkill, hover, activeSubId, pulse, progress.goalSubId])

  // ── 线：同一分支里的一直画；跨分支的只在选中 / 悬停时画 ──
  const edges = useMemo(() => {
    const lens = hover ?? focusedSkill
    const anc = lens ? tree.ancestors(lens) : null
    const out: { key: string; d: string; cls: string; delay: number }[] = []
    for (const s of tree.roadmap.skills) {
      const b = layout.nodes.get(s.id)!
      const sb = states.get(s.id)!
      for (const p of s.prerequisites) {
        const a = layout.nodes.get(p)!
        const sa = states.get(p)!
        const sameBranch = a.branch === b.branch
        let onLens = false
        let cls = ''
        if (lens) {
          if ((lens === s.id || anc!.has(s.id)) && anc!.has(p)) {
            cls = 'e-path'
            onLens = true
          } else if (p === lens) {
            cls = 'e-unlock'
            onLens = true
          }
        }
        if (!sameBranch && !onLens) continue
        if (!cls) cls = sa === 'done' && sb === 'done' ? 'e-done' : sa === 'done' ? 'e-known' : 'e-locked'
        if (lens && !onLens) cls += ' e-faded'
        const f = flags.get(s.id)!
        if (f.pulse && sa === 'done') cls += ' e-pulse'
        let d: string
        if (a.y + NODE <= b.y) {
          // 前置在上面：从它的底边中点到后继的顶边中点；同一列竖直，不同列走一条平滑的 S 形
          const x1 = a.x + NODE / 2
          const y1 = a.y + NODE
          const x2 = b.x + NODE / 2
          const y2 = b.y - 7
          d = Math.abs(x1 - x2) < 1 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1},${y1 + GAP_Y / 2} ${x2},${y2 - GAP_Y / 2} ${x2},${y2}`
        } else {
          // 同一级里的前置：从侧边横着连
          const right = b.x > a.x
          const x1 = right ? a.x + NODE : a.x
          const x2 = right ? b.x - 7 : b.x + NODE + 7
          const y1 = a.y + NODE / 2
          const y2 = b.y + NODE / 2
          const c = Math.max(16, Math.abs(x2 - x1) / 2)
          d = `M${x1},${y1} C${x1 + (right ? c : -c)},${y1} ${x2 + (right ? -c : c)},${y2} ${x2},${y2}`
        }
        out.push({ key: `${p}>${s.id}`, d, cls, delay: f.delay })
      }
    }
    return out
  }, [tree, layout, states, focusedSkill, hover, flags])

  const onNode = useCallback((id: string, e: RMouseEvent<SVGGElement>) => {
    if (drag.current?.moved) return
    e.stopPropagation()
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
    if (focusedSkill === id) setFocus(null)
    else {
      setFocus({ kind: 'skill', id })
      if (viewRef.current.k < 0.7) {
        const p = layout.nodes.get(id)!
        centerOn(p.x + NODE / 2, p.y + NODE / 2, 1)
      }
    }
  }, [quick, readOnly, states, change, tree, progress, toast, lightWithPrerequisites, focusedSkill, setFocus, layout, centerOn])

  const onEnter = useCallback((id: string) => { if (!drag.current?.moved) setHover(id) }, [setHover])
  const onLeave = useCallback(() => setHover(null), [setHover])

  const litCount = [...states.values()].filter((s) => s === 'done').length
  const firstRun = litCount === 0 && !readOnly
  const focusedState = focusedSkill ? states.get(focusedSkill)! : null
  const focusedOwn = focusedSkill ? progress.skills[focusedSkill]?.status ?? null : null
  const focusedMissing = focusedSkill && focusedState === 'locked' ? missingPrerequisites(tree, focusedSkill, progress) : []

  return (
    <div className={`tree-wrap${quick && !readOnly ? ' quick' : ''}`} ref={wrap}>
      <svg
        ref={svg}
        className="tree"
        width={size.w || 1}
        height={size.h || 1}
        data-zoom={zoomTier}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onSvgClick}
        role="application"
        aria-label="技能树"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L7,4 L0,7Z" />
          </marker>
        </defs>
        <g ref={world}>
          {/* 等级：左侧的名字和一根横线 */}
          <g className="bands">
            {layout.bands.map((b) => (
              <g key={b.level} transform={`translate(0,${b.y})`}>
                <text className="band-name" x={-24} y={b.height / 2 + 5}>{LEVEL_NAMES[b.level]}</text>
                {b.level > 1 && <line className="band-line" x1={-8} y1={-30} x2={layout.width + 8} y2={-30} />}
              </g>
            ))}
          </g>
          {/* 分支名 */}
          <g className="branches">
            {layout.branches.map((b) => (
              <text
                key={b.id}
                data-branch={b.id}
                className={`branch-name${focus?.kind === 'area' && focus.id === b.id ? ' focused' : ''}`}
                x={b.x + b.width / 2}
                y={-16}
                onClick={(e) => { if (!drag.current?.moved) { e.stopPropagation(); setFocus({ kind: 'area', id: b.id }, { scroll: true }) } }}
              >
                {b.name}
              </text>
            ))}
          </g>
          <g className="edges">
            {edges.map((e) => (
              <path key={e.key} d={e.d} className={`edge ${e.cls}`} markerEnd="url(#arrow)" style={{ '--d': `${e.delay}ms` } as React.CSSProperties} />
            ))}
          </g>
          <g className="nodes">
            {tree.roadmap.skills.map((s) => {
              const p = layout.nodes.get(s.id)!
              return <Node key={s.id} id={s.id} x={p.x} y={p.y} name={s.name} area={p.branch} tool={s.kind === 'tool'} flags={flags.get(s.id)!} onClick={onNode} onEnter={onEnter} onLeave={onLeave} />
            })}
          </g>
        </g>
      </svg>

      {focusedSkill && !readOnly && (
        <div className={`node-card c-${focusedState}`} ref={card}>
          <b>{tree.skill(focusedSkill).name}</b>
          <span>{STATE_LABEL[focusedState!]}</span>
          <div className="node-card-actions">
            {focusedState === 'locked' ? (
              <button className="primary" onClick={() => lightWithPrerequisites(focusedSkill)}>连同 {focusedMissing.length} 个前置一起点亮</button>
            ) : focusedOwn === 'done' ? (
              <button onClick={() => setStatus(focusedSkill, null)}>取消</button>
            ) : (
              <button className="primary" onClick={() => setStatus(focusedSkill, 'done')}>点亮</button>
            )}
            {focusedOwn !== 'done' && (
              <button className={focusedOwn === 'learning' ? 'on' : ''} onClick={() => setStatus(focusedSkill, focusedOwn === 'learning' ? null : 'learning')}>
                {focusedOwn === 'learning' ? '在学中' : '在学'}
              </button>
            )}
          </div>
        </div>
      )}

      {firstRun && !focusedSkill && <div className="coach">点一个你已经会的技能，把它点亮。滚轮平移，Ctrl + 滚轮缩放。</div>}

      <div className="tree-tools">
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, Math.min(MAX_K, viewRef.current.k * 1.25))} title="放大（+）">+</button>
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, Math.max(MIN_K, viewRef.current.k / 1.25))} title="缩小（−）">−</button>
        <button onClick={() => fitKnown()} title="看我点亮的部分（1）">◎</button>
        <button onClick={() => fitAll()} title="看全图（0）">⊡</button>
      </div>
    </div>
  )
}
