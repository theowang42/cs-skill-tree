// 星图：全屏 SVG。你在圆心，技能是星，点亮的星照亮周围，亮区的边缘就是你的能力边界。
//
// 性能上的安排：平移缩放不走 React，直接改 <g> 的 transform 和 svg 上的 CSS 变量；
// 只有缩放跨过档位（影响哪些文字显示）时才 setState。星和文字用 CSS 变量做反向缩放，
// 缩放时在屏幕上大小基本不变。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { arcPath, layoutStarMap } from '../lib/starmap'
import { computeStates, missingPrerequisites } from '../lib/tree'
import { STATE_LABEL } from '../lib/format'

interface View {
  x: number
  y: number
  k: number
}

const MIN_K = 0.18
const MAX_K = 3.2
const CLICK_SLOP = 5
/** 缩放档位：0 只显示重点标签，1 显示已知星域的标签，2 全部 */
const zoomLevel = (k: number) => (k < 0.55 ? 0 : k < 1.05 ? 1 : 2)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** 平滑闭合曲线（Catmull-Rom 转三次贝塞尔） */
function smoothClosed(points: { x: number; y: number }[]): string {
  const n = points.length
  if (n < 3) return ''
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d + 'Z'
}

interface StarFlags {
  state: SkillState
  focused: boolean
  hovered: boolean
  step: number | null
  choice: boolean
  path: boolean
  unlock: boolean
  dim: boolean
  pulse: boolean
  delay: number
  /** 回放时还没点亮 */
  future: boolean
}

const sameFlags = (a: StarFlags, b: StarFlags) =>
  a.state === b.state && a.focused === b.focused && a.hovered === b.hovered && a.step === b.step && a.choice === b.choice &&
  a.path === b.path && a.unlock === b.unlock && a.dim === b.dim && a.pulse === b.pulse && a.delay === b.delay && a.future === b.future

const Star = memo(function Star({
  id, x, y, name, tool, flags, onClick, onEnter, onLeave,
}: {
  id: string; x: number; y: number; name: string; tool: boolean; flags: StarFlags
  onClick: (id: string, e: RPointerEvent<SVGGElement>) => void; onEnter: (id: string) => void; onLeave: () => void
}) {
  const cls = [
    'star', `s-${flags.state}`, tool && 'tool', flags.focused && 'focused', flags.hovered && 'hovered',
    flags.step !== null && 'goal', flags.choice && 'choice', flags.path && 'path', flags.unlock && 'unlock',
    flags.dim && 'dim', flags.pulse && 'pulse', flags.future && 'future',
  ].filter(Boolean).join(' ')
  // 标签分三档：选中 / 悬停总显示；目标路线和已知星域中等缩放时显示；其余要放大才显示
  const always = flags.focused || flags.hovered || flags.path || flags.unlock
  const known = flags.state !== 'locked' || flags.step !== null || flags.choice
  return (
    <g className={cls} transform={`translate(${x},${y})`} data-star={id} style={{ '--d': `${flags.delay}ms` } as React.CSSProperties}>
      <g className="star-body" onPointerUp={(e) => onClick(id, e)} onPointerEnter={() => onEnter(id)} onPointerLeave={onLeave}>
        <circle className="hit" r="16" />
        <circle className="halo" r="14" />
        <circle className="ring" r="7" />
        <circle className="core" r="4.2" />
        {tool && <circle className="tool-mark" r="1.6" />}
        {flags.step !== null && (
          <g className="step" transform="translate(7,-9)">
            <circle r="6" />
            <text>{flags.step}</text>
          </g>
        )}
      </g>
      <g className={`lbl${always ? ' lbl-always' : known ? ' lbl-known' : ''}`}>
        <text y="19">{name}</text>
      </g>
    </g>
  )
}, (a, b) => a.id === b.id && a.onClick === b.onClick && a.onEnter === b.onEnter && a.onLeave === b.onLeave && sameFlags(a.flags, b.flags))

export function StarMap() {
  const app = useApp()
  const { tree, states, focus, setFocus, hover, setHover, activeSubId, view, pulse, progress, readinessBySub, quick, readOnly, change, lightWithPrerequisites, toast, flyRequest } = app
  const layout = useMemo(() => layoutStarMap(tree), [tree])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 0.4 })
  const [zoomTier, setZoomTier] = useState(0)
  const [size, setSize] = useState({ w: 1200, h: 800 })
  const [replayAt, setReplayAt] = useState<number | null>(null)
  const anim = useRef<number>(0)
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null)

  // ── 视图变换 ──
  const applyView = useCallback((v: View) => {
    viewRef.current = v
    const g = world.current
    const s = svg.current
    if (!g || !s) return
    g.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`)
    s.style.setProperty('--inv', String(1 / v.k))
    s.style.setProperty('--sinv', String(Math.pow(v.k, -0.75)))
    const tier = zoomLevel(v.k)
    s.dataset.zoom = String(tier)
    setZoomTier((t) => (t === tier ? t : tier))
  }, [])

  const flyTo = useCallback((target: View, ms = 650) => {
    cancelAnimationFrame(anim.current)
    const from = { ...viewRef.current }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const e = ease(t)
      // 缩放按对数插值，看起来匀速
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e)
      applyView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k })
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [applyView])

  /** 让世界坐标 (wx, wy) 出现在屏幕中央（可带偏移），缩放到 k */
  const centerOn = useCallback((wx: number, wy: number, k: number, ms?: number) => {
    const { w, h } = size
    // 右侧有抽屉时把焦点往左挪一点
    const cx = w / 2
    const cy = h / 2
    flyTo({ x: cx - wx * k, y: cy - wy * k, k }, ms)
  }, [size, flyTo])

  const fitBox = useCallback((minX: number, minY: number, maxX: number, maxY: number, pad = 60, ms?: number) => {
    const { w, h } = size
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2) / (maxY - minY || 1))))
    centerOn((minX + maxX) / 2, (minY + maxY) / 2, k, ms)
  }, [size, centerOn])

  const fitAll = useCallback((ms?: number) => fitBox(-layout.extent, -layout.extent, layout.extent, layout.extent, 20, ms), [fitBox, layout])

  /** 聚焦到已点亮 + 边界的星：第一次打开时看到的就是“你的星域” */
  const fitKnown = useCallback((ms?: number) => {
    const pts = [...states].filter(([, s]) => s !== 'locked').map(([id]) => layout.skills.get(id)!)
    if (pts.length < 3) return fitAll(ms)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    fitBox(Math.min(...xs, -layout.rings[0]), Math.min(...ys, -layout.rings[0]), Math.max(...xs, layout.rings[0]), Math.max(...ys, layout.rings[0]), 90, ms)
  }, [states, layout, fitBox, fitAll])

  // 尺寸
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 第一次：看自己的星域
  const booted = useRef(false)
  useEffect(() => {
    if (booted.current || size.w === 1200) return
    booted.current = true
    fitKnown(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  // 要求飞到焦点
  useEffect(() => {
    if (!flyRequest || !focus) return
    const k = Math.max(viewRef.current.k, 1.25)
    if (focus.kind === 'skill') {
      const p = layout.skills.get(focus.id)!
      centerOn(p.x, p.y, k)
    } else if (focus.kind === 'area') {
      const sec = layout.sectors.find((s) => s.id === focus.id)
      if (!sec) return
      const pts = tree.areas.get(focus.id)!.skillIds.map((id) => layout.skills.get(id)!)
      fitBox(Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)), 80)
    } else if (focus.kind === 'sub') {
      const b = layout.subs.get(focus.id)!
      const pts = [...tree.closures.get(focus.id)!].map((id) => layout.skills.get(id)!)
      fitBox(Math.min(b.x, ...pts.map((p) => p.x)), Math.min(b.y, ...pts.map((p) => p.y)), Math.max(b.x, ...pts.map((p) => p.x)), Math.max(b.y, ...pts.map((p) => p.y)), 60)
    } else if (focus.kind === 'category') {
      const subs = tree.categories.get(focus.id)!.subIds.map((id) => layout.subs.get(id)!)
      const a = subs.reduce((s, b) => s + b.angle, 0) / subs.length
      centerOn(Math.cos(a) * layout.rimRadius * 0.8, Math.sin(a) * layout.rimRadius * 0.8, Math.max(viewRef.current.k, 0.6))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest])

  // ── 指针：拖动平移、滚轮缩放、双指缩放 ──
  const drag = useRef<{ id: number; x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const pinch = useRef<{ d: number; k: number; cx: number; cy: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    cancelAnimationFrame(anim.current)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    if (pointers.current.size === 1) {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: viewRef.current.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
      drag.current = null
    }
  }
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const k = Math.min(MAX_K, Math.max(MIN_K, (pinch.current.k * d) / pinch.current.d))
      zoomAt(pinch.current.cx, pinch.current.cy, k)
      return
    }
    const dr = drag.current
    if (!dr || dr.id !== e.pointerId) return
    const dx = e.clientX - dr.x
    const dy = e.clientY - dr.y
    if (!dr.moved && Math.hypot(dx, dy) > CLICK_SLOP) {
      dr.moved = true
      setTooltip(null)
    }
    if (dr.moved) applyView({ ...viewRef.current, x: dr.vx + dx, y: dr.vy + dy })
  }
  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const dr = drag.current
    if (dr && dr.id === e.pointerId) {
      // 点在空白处：取消选中
      if (!dr.moved && !(e.target as Element).closest('[data-star], [data-beacon], [data-sector]')) setFocus(null)
      drag.current = null
    }
  }
  const zoomAt = (sx: number, sy: number, k: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const px = sx - rect.left
    const py = sy - rect.top
    const v = viewRef.current
    // 保持指针下的点不动
    const wx = (px - v.x) / v.k
    const wy = (py - v.y) / v.k
    applyView({ x: px - wx * k, y: py - wy * k, k })
  }
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016))
      zoomAt(e.clientX, e.clientY, Math.min(MAX_K, Math.max(MIN_K, v.k * factor)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 键盘：+ - 缩放，0 看全图，1 看我的星域
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      const { w, h } = size
      if (e.key === '+' || e.key === '=') zoomAt(w / 2, h / 2, Math.min(MAX_K, viewRef.current.k * 1.3))
      else if (e.key === '-') zoomAt(w / 2, h / 2, Math.max(MIN_K, viewRef.current.k / 1.3))
      else if (e.key === '0') fitAll()
      else if (e.key === '1') fitKnown()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, fitAll, fitKnown])

  // ── 回放：按点亮时间从头放一遍 ──
  const litOrder = useMemo(
    () => Object.entries(progress.skills).filter(([, e]) => e.status === 'done' && e.updatedAt).map(([id, e]) => ({ id, t: Date.parse(e.updatedAt) })).filter((x) => !Number.isNaN(x.t)).sort((a, b) => a.t - b.t),
    [progress],
  )
  const replaying = replayAt !== null
  const replay = useCallback(() => {
    if (litOrder.length < 2) {
      toast('点亮的技能还太少，等多亮几颗再回放')
      return
    }
    cancelAnimationFrame(anim.current)
    fitAll(500)
    const t0 = litOrder[0].t
    const t1 = litOrder[litOrder.length - 1].t
    const ms = Math.min(12000, 1500 + litOrder.length * 180)
    const start = performance.now() + 500
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / ms))
      // 按点亮的序号均匀推进，而不是按真实时间（真实时间可能几个月没动静）
      const idx = Math.floor(p * litOrder.length)
      setReplayAt(idx >= litOrder.length ? t1 + 1 : litOrder[Math.max(0, idx)].t - 1)
      if (p < 1) raf = requestAnimationFrame(tick)
      else window.setTimeout(() => setReplayAt(null), 1200)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // 没有 t0 的用处，只是为了可读
    void t0
  }, [litOrder, fitAll, toast])

  const shownStates = useMemo(() => {
    if (replayAt === null) return states
    const skills = Object.fromEntries(Object.entries(progress.skills).filter(([, e]) => e.status === 'done' && Date.parse(e.updatedAt) <= replayAt))
    return computeStates(tree, { goalSubId: progress.goalSubId, skills })
  }, [replayAt, states, progress, tree])

  // ── 每颗星的标志 ──
  const flags = useMemo(() => {
    const steps = activeSubId ? tree.steps.get(activeSubId)! : null
    const choices = new Set(activeSubId ? tree.subs.get(activeSubId)!.choices.flatMap((c) => c.options) : [])
    const focusedSkill = focus?.kind === 'skill' ? focus.id : null
    const lens = hover ?? focusedSkill
    const path = lens ? tree.ancestors(lens) : new Set<string>()
    const unlock = new Set(lens ? tree.skill(lens).dependents : [])
    const order = new Map<string, number>()
    if (pulse.size) tree.topoSort(pulse).forEach((id, i) => order.set(id, Math.min(i * 70, 1400)))
    const m = new Map<string, StarFlags>()
    for (const s of tree.roadmap.skills) {
      const state = shownStates.get(s.id)!
      const step = steps?.get(s.id) ?? null
      const choice = choices.has(s.id)
      let dim = false
      if (view === 'goal' && activeSubId) dim = step === null && !choice
      else if (view === 'frontier') dim = state === 'locked'
      if (lens && lens !== s.id && !path.has(s.id) && !unlock.has(s.id)) dim = dim || hover !== null
      m.set(s.id, {
        state, focused: focusedSkill === s.id, hovered: hover === s.id, step, choice,
        path: path.has(s.id), unlock: unlock.has(s.id), dim: dim && focusedSkill !== s.id, pulse: pulse.has(s.id),
        delay: order.get(s.id) ?? 0, future: replaying && states.get(s.id) === 'done' && state !== 'done',
      })
    }
    return m
  }, [tree, shownStates, states, focus, hover, activeSubId, view, pulse, replaying])

  // ── 已探索的星域：每个扇区点亮到第几圈，连成一片 ──
  const territory = useMemo(() => {
    const pts = layout.sectors.map((sec) => {
      const mid = (sec.start + sec.end) / 2
      let maxR = layout.rings[0] * 0.55
      for (const [id, p] of layout.skills) {
        if (p.sector === sec.id && shownStates.get(id) === 'done') maxR = Math.max(maxR, p.r + 34)
      }
      return { x: Math.cos(mid) * maxR, y: Math.sin(mid) * maxR }
    })
    return smoothClosed(pts)
  }, [layout, shownStates])

  // ── 连线 ──
  const edges = useMemo(() => {
    const focusedSkill = focus?.kind === 'skill' ? focus.id : null
    const lens = hover ?? focusedSkill
    const goal = activeSubId ? tree.closures.get(activeSubId)! : null
    const out: { key: string; x1: number; y1: number; x2: number; y2: number; cls: string; delay: number }[] = []
    for (const s of tree.roadmap.skills) {
      const b = layout.skills.get(s.id)!
      const sb = shownStates.get(s.id)!
      for (const p of s.prerequisites) {
        const a = layout.skills.get(p)!
        const sa = shownStates.get(p)!
        let cls = 'e-dark'
        if (sa === 'done' && sb === 'done') cls = 'e-lit'
        else if (sa === 'done' || sb !== 'locked') cls = 'e-known'
        if (goal && goal.has(s.id) && goal.has(p)) cls += ' e-goal'
        if (lens) {
          const onPath = (lens === s.id || tree.ancestors(lens).has(s.id)) && tree.ancestors(lens).has(p)
          if (onPath) cls += ' e-path'
          else if (p === lens) cls += ' e-unlock'
          else cls += ' e-faded'
        }
        const f = flags.get(s.id)!
        if (f.pulse && sa === 'done') cls += ' e-pulse'
        out.push({ key: `${p}>${s.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, cls, delay: f.delay })
      }
    }
    return out
  }, [tree, layout, shownStates, focus, hover, activeSubId, flags])

  // ── 点击 ──
  const onStar = useCallback((id: string, e: RPointerEvent<SVGGElement>) => {
    if (drag.current?.moved || replaying) return
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
    if (focus?.kind === 'skill' && focus.id === id) setFocus(null)
    else {
      setFocus({ kind: 'skill', id })
      // 看不清的时候拉近一点
      if (viewRef.current.k < 0.9) {
        const p = layout.skills.get(id)!
        centerOn(p.x, p.y, 1.25)
      }
    }
  }, [quick, readOnly, states, change, tree, progress, toast, lightWithPrerequisites, focus, setFocus, layout, centerOn, replaying])

  const onEnter = useCallback((id: string) => {
    if (drag.current?.moved) return
    setHover(id)
    const p = layout.skills.get(id)!
    const v = viewRef.current
    setTooltip({ id, x: v.x + p.x * v.k, y: v.y + p.y * v.k })
  }, [layout, setHover])
  const onLeave = useCallback(() => {
    setHover(null)
    setTooltip(null)
  }, [setHover])

  // ── 方向信标 ──
  const beacons = tree.roadmap.subs.map((s) => {
    const b = layout.subs.get(s.id)!
    const r = readinessBySub.get(s.id)!
    const isGoal = progress.goalSubId === s.id
    const active = activeSubId === s.id
    const dim = view === 'goal' && activeSubId !== null && !active
    // 名字放在信标外侧，左半边右对齐
    const outside = b.angle > Math.PI / 2 && b.angle < (3 * Math.PI) / 2
    return { s, b, r, isGoal, active, dim, outside }
  })

  const litCount = [...states.values()].filter((s) => s === 'done').length
  const frontierCount = [...states.values()].filter((s) => s === 'available').length
  const tipSkill = tooltip ? tree.skill(tooltip.id) : null
  const tipState = tooltip ? shownStates.get(tooltip.id)! : null
  const labelRadius = layout.rings[layout.rings.length - 1] + 58

  return (
    <div className={`map-wrap${quick && !readOnly ? ' quick' : ''}${replaying ? ' replaying' : ''}`} ref={wrap}>
      <svg
        ref={svg}
        className="map"
        width={size.w}
        height={size.h}
        data-zoom={zoomTier}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="技能星图"
      >
        <defs>
          <radialGradient id="g-territory">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.16" />
            <stop offset="0.7" stopColor="var(--lit)" stopOpacity="0.07" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id="g-halo-lit">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="var(--lit)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-halo-frontier">
            <stop offset="0" stopColor="var(--edge)" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="var(--edge)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--edge)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-center">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0" />
          </radialGradient>
          {layout.sectors.map((sec) => {
            // 下半圈的弧反着画，文字才是正的
            const mid = (sec.start + sec.end) / 2
            const flip = Math.sin(mid) > 0
            return <path key={sec.id} id={`arc-${sec.id}`} d={arcPath(labelRadius + (flip ? 14 : 0), sec.start + 0.012, sec.end - 0.012, flip)} />
          })}
        </defs>
        <g ref={world}>
          {/* 圈 */}
          <g className="rings">
            {layout.rings.map((r, i) => (
              <circle key={r} r={r} className={i % 2 ? 'ring-b' : 'ring-a'} />
            ))}
            <circle r={layout.rimRadius} className="rim" />
          </g>
          {/* 扇区分隔和名字 */}
          <g className="sectors">
            {layout.sectors.map((sec) => (
              <g key={sec.id} data-sector={sec.id} className={`sector${focus?.kind === 'area' && focus.id === sec.id ? ' focused' : ''}`}>
                <line x1={Math.cos(sec.start) * layout.rings[0] * 0.75} y1={Math.sin(sec.start) * layout.rings[0] * 0.75} x2={Math.cos(sec.start) * (labelRadius + 36)} y2={Math.sin(sec.start) * (labelRadius + 36)} />
                <text className="sector-name" onPointerUp={(e) => { if (!drag.current?.moved) { e.stopPropagation(); setFocus({ kind: 'area', id: sec.id }, { scroll: true }) } }}>
                  <textPath href={`#arc-${sec.id}`} startOffset="50%" textAnchor="middle">
                    {sec.name}
                  </textPath>
                </text>
              </g>
            ))}
          </g>
          {/* 已探索的星域 */}
          <path className="territory" d={territory} />
          {/* 连线 */}
          <g className="edges">
            {edges.map((e) => (
              <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className={`edge ${e.cls}`} style={{ '--d': `${e.delay}ms` } as React.CSSProperties} />
            ))}
          </g>
          {/* 方向信标 */}
          <g className="beacons">
            {beacons.map(({ s, b, r, isGoal, active, dim, outside }) => (
              <g
                key={s.id}
                data-beacon={s.id}
                className={`beacon${isGoal ? ' is-goal' : ''}${active ? ' active' : ''}${dim ? ' dim' : ''}${r.percent >= 100 ? ' complete' : ''}`}
                transform={`translate(${b.x},${b.y})`}
                onPointerUp={(e) => { if (!drag.current?.moved) { e.stopPropagation(); setFocus(focus?.kind === 'sub' && focus.id === s.id ? null : { kind: 'sub', id: s.id }) } }}
              >
                <g className="beacon-body">
                  <circle className="hit" r="26" />
                  <circle className="beacon-track" r="13" />
                  <circle className="beacon-arc" r="13" pathLength="100" strokeDasharray={`${r.percent} ${100 - r.percent}`} transform="rotate(-90)" />
                  <path className="beacon-core" d="M0,-6 L6,0 L0,6 L-6,0Z" />
                  <text className="beacon-name" x={outside ? -20 : 20} textAnchor={outside ? 'end' : 'start'} y="4">
                    {s.name}
                  </text>
                  <text className="beacon-pct" x={outside ? -20 : 20} textAnchor={outside ? 'end' : 'start'} y="19">
                    {Math.round(r.percent)}%{isGoal ? ' · 目标' : ''}
                  </text>
                </g>
              </g>
            ))}
          </g>
          {/* 圆心：你 */}
          <g className="center">
            <circle r="78" fill="url(#g-center)" />
            <circle r="30" className="center-ring" />
            <text className="center-you" y="-2">你</text>
            <text className="center-sub" y="14">{litCount} 颗星</text>
          </g>
          {/* 星 */}
          <g className="stars">
            {tree.roadmap.skills.map((s) => {
              const p = layout.skills.get(s.id)!
              return <Star key={s.id} id={s.id} x={p.x} y={p.y} name={s.name} tool={s.kind === 'tool'} flags={flags.get(s.id)!} onClick={onStar} onEnter={onEnter} onLeave={onLeave} />
            })}
          </g>
        </g>
      </svg>

      {tooltip && tipSkill && tipState && !(focus?.kind === 'skill' && focus.id === tooltip.id) && (
        <div className={`tip t-${tipState}`} style={{ left: tooltip.x, top: tooltip.y }}>
          <b>{tipSkill.name}</b>
          <span>{STATE_LABEL[tipState]} · {tree.containerName(tipSkill.id)} · 第 {tipSkill.depth} 圈</span>
          {tipSkill.checks[0] && <em>{tipSkill.checks[0]}</em>}
        </div>
      )}

      <div className="map-tools">
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, Math.min(MAX_K, viewRef.current.k * 1.3))} title="放大（+）">+</button>
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, Math.max(MIN_K, viewRef.current.k / 1.3))} title="缩小（-）">−</button>
        <button onClick={() => fitKnown()} title="看我的星域（1）">◎</button>
        <button onClick={() => fitAll()} title="看全图（0）">⊙</button>
        <button onClick={replay} disabled={replaying} title="按点亮的顺序回放一遍">▶</button>
      </div>

      <div className="legend" aria-hidden>
        <span className="lg lg-done">已掌握</span>
        <span className="lg lg-learning">在学</span>
        <span className="lg lg-available">能力边界 · 现在能学</span>
        <span className="lg lg-locked">还够不着</span>
      </div>
      {replaying && <div className="replay-badge">回放 · {new Date(replayAt!).toLocaleDateString('zh-CN')}</div>}
      <span className="sr-only">已点亮 {litCount}，能力边界 {frontierCount}</span>
    </div>
  )
}
