// 星图：全屏 SVG。你在圆心，技能是星。
//
// 迷雾：开局只看得见圆心和 7 颗起步星。点亮一颗，光照出它旁边的星：
//   亮星（已掌握）→ 边界星（现在能学）→ 影子（再往外一步，只有轮廓）→ 黑。
// 目标方向要学的星即使在黑暗里也画成淡淡的轮廓，是“前方的路”。
//
// 性能：平移缩放不走 React，直接改 <g> 的 transform 和 svg 上的 CSS 变量；
// 星和文字用变量反向缩放，屏幕上大小基本不变。看不见的星不渲染。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
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

const MIN_K = 0.16
const MAX_K = 3.2
const CLICK_SLOP = 5
const zoomLevel = (k: number) => (k < 0.5 ? 0 : k < 1.0 ? 1 : 2)
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
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`
  }
  return d + 'Z'
}

/** 一颗星在迷雾里的可见程度 */
type Visibility = 'full' | 'shadow' | 'ghost' | 'hidden'

interface StarFlags {
  state: SkillState
  vis: Visibility
  focused: boolean
  hovered: boolean
  step: number | null
  choice: boolean
  path: boolean
  unlock: boolean
  dim: boolean
  pulse: boolean
  reveal: boolean
  delay: number
  future: boolean
}

const sameFlags = (a: StarFlags, b: StarFlags) =>
  a.state === b.state && a.vis === b.vis && a.focused === b.focused && a.hovered === b.hovered && a.step === b.step &&
  a.choice === b.choice && a.path === b.path && a.unlock === b.unlock && a.dim === b.dim && a.pulse === b.pulse &&
  a.reveal === b.reveal && a.delay === b.delay && a.future === b.future

const Star = memo(function Star({
  id, x, y, name, tool, flags, onClick, onEnter, onLeave,
}: {
  id: string; x: number; y: number; name: string; tool: boolean; flags: StarFlags
  onClick: (id: string, e: RMouseEvent<SVGGElement>) => void; onEnter: (id: string) => void; onLeave: () => void
}) {
  const cls = [
    'star', `s-${flags.state}`, `v-${flags.vis}`, tool && 'tool', flags.focused && 'focused', flags.hovered && 'hovered',
    flags.step !== null && 'goal', flags.choice && 'choice', flags.path && 'path', flags.unlock && 'unlock',
    flags.dim && 'dim', flags.pulse && 'pulse', flags.reveal && 'reveal', flags.future && 'future',
  ].filter(Boolean).join(' ')
  const always = flags.focused || flags.hovered || flags.path || flags.unlock
  const known = flags.vis === 'full' || flags.step !== null
  const seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7)
  return (
    <g className={cls} transform={`translate(${x},${y})`} data-star={id} style={{ '--d': `${flags.delay}ms`, '--tw': `${-(seed / 997) * 5}s` } as React.CSSProperties}>
      <g className="star-body" onClick={(e) => onClick(id, e)} onPointerEnter={() => onEnter(id)} onPointerLeave={onLeave}>
        <circle className="hit" r="16" />
        <circle className="halo" r="16" />
        <circle className="ring" r="6.5" />
        <circle className="core" r="3.2" />
        {/* 四芒星：已掌握 / 在学时显示 */}
        <path className="spark" d="M0,-7 C0.5,-1.6 1.6,-0.5 7,0 C1.6,0.5 0.5,1.6 0,7 C-0.5,1.6 -1.6,0.5 -7,0 C-1.6,-0.5 -0.5,-1.6 0,-7Z" />
        {tool && <circle className="tool-mark" r="1.3" />}
        {flags.step !== null && flags.state !== 'done' && (
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
  const {
    tree, states, focus, setFocus, hover, setHover, activeSubId, fog, setFog, pulse, progress, readinessBySub,
    quick, setQuick, readOnly, change, lightWithPrerequisites, toast, flyRequest, setStatus,
  } = app
  const layout = useMemo(() => layoutStarMap(tree), [tree])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 0.8 })
  const [zoomTier, setZoomTier] = useState(1)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [replayAt, setReplayAt] = useState<number | null>(null)
  const anim = useRef<number>(0)
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null)
  const focusedSkill = focus?.kind === 'skill' ? focus.id : null
  const focusedPos = focusedSkill ? layout.skills.get(focusedSkill)! : null

  // ── 视图变换 ──
  const placeCard = useCallback((v: View) => {
    const el = card.current
    if (!el || !focusedPos) return
    el.style.left = `${v.x + focusedPos.x * v.k}px`
    el.style.top = `${v.y + focusedPos.y * v.k}px`
  }, [focusedPos])

  const applyView = useCallback((v: View) => {
    viewRef.current = v
    const g = world.current
    const s = svg.current
    if (!g || !s) return
    g.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`)
    s.style.setProperty('--inv', String(1 / v.k))
    s.style.setProperty('--sinv', String(Math.min(1.7, Math.pow(v.k, -0.72))))
    const tier = zoomLevel(v.k)
    s.dataset.zoom = String(tier)
    setZoomTier((t) => (t === tier ? t : tier))
    placeCard(v)
  }, [placeCard])
  useEffect(() => placeCard(viewRef.current), [placeCard])

  const flyTo = useCallback((target: View, ms = 700) => {
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

  const fitAll = useCallback((ms?: number) => fitBox(-layout.extent, -layout.extent, layout.extent, layout.extent, 20, ms), [fitBox, layout])

  // ── 回放 ──
  const litOrder = useMemo(
    () => Object.entries(progress.skills).filter(([, e]) => e.status === 'done' && e.updatedAt).map(([id, e]) => ({ id, t: Date.parse(e.updatedAt) })).filter((x) => !Number.isNaN(x.t)).sort((a, b) => a.t - b.t),
    [progress],
  )
  const replaying = replayAt !== null
  const shownStates = useMemo(() => {
    if (replayAt === null) return states
    const skills = Object.fromEntries(Object.entries(progress.skills).filter(([, e]) => e.status === 'done' && Date.parse(e.updatedAt) <= replayAt))
    return computeStates(tree, { goalSubId: progress.goalSubId, skills })
  }, [replayAt, states, progress, tree])

  // ── 迷雾：谁看得见 ──
  const visibility = useMemo(() => {
    const vis = new Map<string, Visibility>()
    const goal = activeSubId ? tree.closures.get(activeSubId)! : null
    const lens = hover ?? focusedSkill
    const lensSet = new Set<string>()
    if (lens) {
      lensSet.add(lens)
      for (const a of tree.ancestors(lens)) lensSet.add(a)
      for (const d of tree.skill(lens).dependents) lensSet.add(d)
    }
    for (const s of tree.roadmap.skills) {
      const st = shownStates.get(s.id)!
      if (!fog || st !== 'locked') {
        vis.set(s.id, 'full')
        continue
      }
      // 影子：至少一个前置已经看得见（亮着或在边界上）
      const nearLight = s.prerequisites.some((p) => shownStates.get(p) !== 'locked')
      if (nearLight) vis.set(s.id, 'shadow')
      else if (lensSet.has(s.id)) vis.set(s.id, 'ghost')
      else vis.set(s.id, 'hidden')
    }
    // 目标路线：从已看见的地方再往前露两步，像红笔圈出前方的路，而不是一口气全标出来
    if (goal) {
      for (let round = 0; round < 2; round++) {
        for (const id of goal) {
          if (vis.get(id) !== 'hidden') continue
          if (tree.skill(id).prerequisites.some((p) => vis.get(p) !== 'hidden')) vis.set(id, 'ghost')
        }
      }
    }
    return vis
  }, [tree, shownStates, fog, activeSubId, hover, focusedSkill])

  // 新出现的星：淡入
  const seen = useRef(new Set<string>())
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  useEffect(() => {
    const fresh = new Set<string>()
    for (const [id, v] of visibility) {
      if (v !== 'hidden' && !seen.current.has(id)) {
        if (seen.current.size) fresh.add(id)
        seen.current.add(id)
      }
    }
    if (fresh.size) {
      setRevealed(fresh)
      const t = window.setTimeout(() => setRevealed(new Set()), 1800)
      return () => window.clearTimeout(t)
    }
  }, [visibility])

  /** 聚焦到看得见的星：第一次打开看到的就是“你的星域” */
  const fitKnown = useCallback((ms?: number) => {
    const pts = [...visibility].filter(([, v]) => v === 'full').map(([id]) => layout.skills.get(id)!)
    if (pts.length < 3) return fitAll(ms)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const r0 = layout.rings[0]
    fitBox(Math.min(...xs, -r0), Math.min(...ys, -r0), Math.max(...xs, r0), Math.max(...ys, r0), 110, ms)
  }, [visibility, layout, fitBox, fitAll])

  const replay = useCallback(() => {
    if (litOrder.length < 2) {
      toast('点亮的星还太少，多亮几颗再回放')
      return
    }
    cancelAnimationFrame(anim.current)
    fitKnown(500)
    const t1 = litOrder[litOrder.length - 1].t
    const ms = Math.min(12000, 1500 + litOrder.length * 180)
    const start = performance.now() + 500
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / ms))
      const idx = Math.floor(p * litOrder.length)
      setReplayAt(idx >= litOrder.length ? t1 + 1 : litOrder[Math.max(0, idx)].t - 1)
      if (p < 1) requestAnimationFrame(tick)
      else window.setTimeout(() => setReplayAt(null), 1200)
    }
    requestAnimationFrame(tick)
  }, [litOrder, fitKnown, toast])

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
    if (booted.current || !size.w) return
    booted.current = true
    fitKnown(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  // 要求飞到焦点
  useEffect(() => {
    if (!flyRequest || !focus) return
    const k = Math.max(viewRef.current.k, 1.2)
    if (focus.kind === 'skill') {
      const p = layout.skills.get(focus.id)!
      centerOn(p.x, p.y, k)
    } else if (focus.kind === 'area') {
      const pts = tree.areas.get(focus.id)!.skillIds.map((id) => layout.skills.get(id)!)
      fitBox(Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)), 80)
    } else if (focus.kind === 'sub') {
      const b = layout.subs.get(focus.id)!
      const pts = [...tree.closures.get(focus.id)!].map((id) => layout.skills.get(id)!)
      fitBox(Math.min(b.x, ...pts.map((p) => p.x)), Math.min(b.y, ...pts.map((p) => p.y)), Math.max(b.x, ...pts.map((p) => p.x)), Math.max(b.y, ...pts.map((p) => p.y)), 60)
    } else if (focus.kind === 'category') {
      const subs = tree.categories.get(focus.id)!.subIds.map((id) => layout.subs.get(id)!)
      const a = Math.atan2(subs.reduce((s, b) => s + Math.sin(b.angle), 0), subs.reduce((s, b) => s + Math.cos(b.angle), 0))
      centerOn(Math.cos(a) * layout.rimRadius * 0.85, Math.sin(a) * layout.rimRadius * 0.85, Math.max(viewRef.current.k, 0.5))
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
    // 不在这里抓指针：抓了之后 click 会落到 svg 上，星就点不中。真开始拖动时再抓
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
      setTooltip(null)
      try {
        svg.current?.setPointerCapture(e.pointerId)
      } catch {
        // 指针已经没了，无所谓
      }
    }
    if (dr.moved) applyView({ ...viewRef.current, x: dr.vx + dx, y: dr.vy + dy })
  }
  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const dr = drag.current
    if (dr && dr.id === e.pointerId) {
      // click 事件随后才到；留着 moved 给它判断，下一帧再清
      window.setTimeout(() => { if (drag.current === dr) drag.current = null }, 0)
    }
  }
  const onSvgClick = (e: RMouseEvent<SVGSVGElement>) => {
    if (drag.current?.moved) return
    if (!(e.target as Element).closest('[data-star], [data-beacon], [data-sector]')) setFocus(null)
  }
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016))
      zoomAt(e.clientX, e.clientY, Math.min(MAX_K, Math.max(MIN_K, viewRef.current.k * factor)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.key === '+' || e.key === '=') zoomAt(size.w / 2, size.h / 2, Math.min(MAX_K, viewRef.current.k * 1.3))
      else if (e.key === '-') zoomAt(size.w / 2, size.h / 2, Math.max(MIN_K, viewRef.current.k / 1.3))
      else if (e.key === '0') fitAll()
      else if (e.key === '1') fitKnown()
      else if (e.key === 'f' || e.key === 'F') setFog(!fog)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [size, fitAll, fitKnown, zoomAt, fog, setFog])

  // ── 每颗星的标志 ──
  const flags = useMemo(() => {
    const steps = activeSubId ? tree.steps.get(activeSubId)! : null
    const choices = new Set(activeSubId ? tree.subs.get(activeSubId)!.choices.flatMap((c) => c.options) : [])
    const lens = hover ?? focusedSkill
    const path = lens ? tree.ancestors(lens) : new Set<string>()
    const unlock = new Set(lens ? tree.skill(lens).dependents : [])
    const order = new Map<string, number>()
    if (pulse.size) tree.topoSort(pulse).forEach((id, i) => order.set(id, Math.min(i * 70, 1400)))
    const revealOrder = new Map<string, number>()
    if (revealed.size) tree.topoSort(revealed).forEach((id, i) => revealOrder.set(id, 250 + Math.min(i * 60, 900)))
    const m = new Map<string, StarFlags>()
    for (const s of tree.roadmap.skills) {
      const vis = visibility.get(s.id)!
      if (vis === 'hidden') continue
      const state = shownStates.get(s.id)!
      const step = steps?.get(s.id) ?? null
      m.set(s.id, {
        state, vis, focused: focusedSkill === s.id, hovered: hover === s.id, step, choice: choices.has(s.id),
        path: path.has(s.id), unlock: unlock.has(s.id),
        dim: hover !== null && hover !== s.id && !path.has(s.id) && !unlock.has(s.id) && focusedSkill !== s.id,
        pulse: pulse.has(s.id), reveal: revealed.has(s.id),
        delay: order.get(s.id) ?? revealOrder.get(s.id) ?? 0,
        future: replaying && states.get(s.id) === 'done' && state !== 'done',
      })
    }
    return m
  }, [tree, shownStates, states, visibility, focusedSkill, hover, activeSubId, pulse, revealed, replaying])

  // ── 已探索的星域 ──
  const territory = useMemo(() => {
    let any = false
    const pts = layout.sectors.map((sec) => {
      const mid = (sec.start + sec.end) / 2
      let maxR = layout.rings[0] * 0.5
      for (const [id, p] of layout.skills) {
        if (p.sector === sec.id && shownStates.get(id) === 'done') {
          maxR = Math.max(maxR, p.r + 36)
          any = true
        }
      }
      return { x: Math.cos(mid) * maxR, y: Math.sin(mid) * maxR }
    })
    return any ? smoothClosed(pts) : ''
  }, [layout, shownStates])

  // ── 连线：只画看得见的 ──
  const edges = useMemo(() => {
    const lens = hover ?? focusedSkill
    const goal = activeSubId ? tree.closures.get(activeSubId)! : null
    const out: { key: string; x1: number; y1: number; x2: number; y2: number; cls: string; delay: number }[] = []
    for (const s of tree.roadmap.skills) {
      const vb = visibility.get(s.id)!
      if (vb === 'hidden') continue
      const b = layout.skills.get(s.id)!
      const sb = shownStates.get(s.id)!
      for (const p of s.prerequisites) {
        const va = visibility.get(p)!
        if (va === 'hidden') continue
        const a = layout.skills.get(p)!
        const sa = shownStates.get(p)!
        let cls: string
        if (sa === 'done' && sb === 'done') cls = 'e-lit'
        else if (sa === 'done' && sb !== 'locked') cls = 'e-known'
        else if (sa === 'done' || sb !== 'locked') cls = 'e-shadow'
        else cls = 'e-dark'
        if (goal && goal.has(s.id) && goal.has(p)) cls += ' e-goal'
        if (lens) {
          const anc = tree.ancestors(lens)
          if ((lens === s.id || anc.has(s.id)) && anc.has(p)) cls += ' e-path'
          else if (p === lens) cls += ' e-unlock'
          else cls += ' e-faded'
        }
        const f = flags.get(s.id)!
        if (f.pulse && sa === 'done') cls += ' e-pulse'
        if (f.reveal) cls += ' e-reveal'
        out.push({ key: `${p}>${s.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, cls, delay: f.delay })
      }
    }
    return out
  }, [tree, layout, visibility, shownStates, focusedSkill, hover, activeSubId, flags])

  // ── 点击 ──
  // 用 click 而不是 pointerup：拖动时 svg 抓住了指针，pointerup 不会落到星上，click 会
  const onStar = useCallback((id: string, e: RMouseEvent<SVGGElement>) => {
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
    if (focusedSkill === id) setFocus(null)
    else {
      setFocus({ kind: 'skill', id })
      if (viewRef.current.k < 0.8) centerOn(layout.skills.get(id)!.x, layout.skills.get(id)!.y, 1.2)
    }
  }, [quick, readOnly, states, change, tree, progress, toast, lightWithPrerequisites, focusedSkill, setFocus, layout, centerOn, replaying])

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

  // ── 方向信标：只显示目标、看过的方向（就绪度 > 0）和当前焦点 ──
  const beacons = tree.roadmap.subs.map((s) => {
    const b = layout.subs.get(s.id)!
    const r = readinessBySub.get(s.id)!
    const isGoal = progress.goalSubId === s.id
    const active = activeSubId === s.id
    const far = fog && !isGoal && !active && r.percent === 0
    const outside = b.angle > Math.PI / 2 && b.angle < (3 * Math.PI) / 2
    return { s, b, r, isGoal, active, far, outside }
  })

  const litCount = [...states.values()].filter((s) => s === 'done').length
  const tipSkill = tooltip ? tree.skill(tooltip.id) : null
  const tipState = tooltip ? shownStates.get(tooltip.id)! : null
  const labelRadius = layout.rings[layout.rings.length - 1] + 58
  // 扇区名：有看得见的星才显示
  const litSectors = new Set([...visibility].filter(([, v]) => v === 'full').map(([id]) => layout.skills.get(id)!.sector))
  const firstRun = litCount === 0 && !readOnly
  // 星盘画到看得见的最远一圈再外一圈
  const dialRings = fog
    ? Math.min(layout.rings.length, Math.max(2, ...[...visibility].filter(([, v]) => v !== 'hidden').map(([id]) => layout.skills.get(id)!.depth)) + 1)
    : layout.rings.length
  const focusedState = focusedSkill ? states.get(focusedSkill)! : null
  const focusedOwn = focusedSkill ? progress.skills[focusedSkill]?.status ?? null : null
  const focusedMissing = focusedSkill && focusedState === 'locked' ? missingPrerequisites(tree, focusedSkill, progress) : []

  return (
    <div className={`map-wrap${quick && !readOnly ? ' quick' : ''}${replaying ? ' replaying' : ''}${fog ? ' fog' : ''}`} ref={wrap}>
      <svg
        ref={svg}
        className="map"
        width={size.w || 1}
        height={size.h || 1}
        data-zoom={zoomTier}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onSvgClick}
        role="application"
        aria-label="技能星图"
      >
        <defs>
          <radialGradient id="g-territory">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.14" />
            <stop offset="0.75" stopColor="var(--lit)" stopOpacity="0.05" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-halo-lit">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="var(--lit)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-halo-frontier">
            <stop offset="0" stopColor="var(--edge)" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="var(--edge)" stopOpacity="0.08" />
            <stop offset="1" stopColor="var(--edge)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-center">
            <stop offset="0" stopColor="var(--lit)" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="var(--lit)" stopOpacity="0.08" />
            <stop offset="1" stopColor="var(--lit)" stopOpacity="0" />
          </radialGradient>
          {layout.sectors.map((sec) => {
            const mid = (sec.start + sec.end) / 2
            const flip = Math.sin(mid) > 0
            return <path key={sec.id} id={`arc-${sec.id}`} d={arcPath(labelRadius + (flip ? 14 : 0), sec.start + 0.012, sec.end - 0.012, flip)} />
          })}
        </defs>
        <g ref={world}>
          {/* 星盘的圈和刻度：只画到已探索的范围外一圈 */}
          <g className="dial">
            {layout.rings.slice(0, Math.min(layout.rings.length, dialRings)).map((r, i) => (
              <circle key={r} r={r} className={i === dialRings - 1 ? 'dial-outer' : ''} />
            ))}
            {dialRings > 0 && Array.from({ length: 72 }, (_, i) => {
              const a = (i / 72) * Math.PI * 2
              const r = layout.rings[dialRings - 1]
              const len = i % 9 === 0 ? 10 : 5
              return <line key={i} x1={Math.cos(a) * r} y1={Math.sin(a) * r} x2={Math.cos(a) * (r + len)} y2={Math.sin(a) * (r + len)} />
            })}
          </g>
          <g className="sectors">
            {layout.sectors.map((sec) => (
              <g key={sec.id} data-sector={sec.id} className={`sector${focus?.kind === 'area' && focus.id === sec.id ? ' focused' : ''}${litSectors.has(sec.id) || !fog ? ' lit' : ''}`}>
                <text className="sector-name" onClick={(e) => { if (!drag.current?.moved) { e.stopPropagation(); setFocus({ kind: 'area', id: sec.id }, { scroll: true }) } }}>
                  <textPath href={`#arc-${sec.id}`} startOffset="50%" textAnchor="middle">
                    {sec.name}
                  </textPath>
                </text>
              </g>
            ))}
          </g>
          {territory && <path className="territory" d={territory} />}
          <g className="edges">
            {edges.map((e) => (
              <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className={`edge ${e.cls}`} style={{ '--d': `${e.delay}ms` } as React.CSSProperties} />
            ))}
          </g>
          <g className="beacons">
            {beacons.map(({ s, b, r, isGoal, active, far, outside }) => (
              <g
                key={s.id}
                data-beacon={s.id}
                className={`beacon${isGoal ? ' is-goal' : ''}${active ? ' active' : ''}${far ? ' far' : ''}${r.percent >= 100 ? ' complete' : ''}`}
                transform={`translate(${b.x},${b.y})`}
                onClick={(e) => { if (!drag.current?.moved) { e.stopPropagation(); setFocus(focus?.kind === 'sub' && focus.id === s.id ? null : { kind: 'sub', id: s.id }) } }}
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
          <g className={`center${firstRun ? ' first' : ''}`}>
            <circle r="90" fill="url(#g-center)" />
            <circle r="30" className="center-ring" />
            <circle r="30" className="center-pulse" />
            <text className="center-you" y="-2">你</text>
            <text className="center-sub" y="14">{litCount} 颗星</text>
          </g>
          <g className="stars">
            {tree.roadmap.skills.map((s) => {
              const f = flags.get(s.id)
              if (!f) return null
              const p = layout.skills.get(s.id)!
              return <Star key={s.id} id={s.id} x={p.x} y={p.y} name={s.name} tool={s.kind === 'tool'} flags={f} onClick={onStar} onEnter={onEnter} onLeave={onLeave} />
            })}
          </g>
        </g>
      </svg>

      {tooltip && tipSkill && tipState && focusedSkill !== tooltip.id && (
        <div className={`tip t-${tipState}`} style={{ left: tooltip.x, top: tooltip.y }}>
          <b>{tipSkill.name}</b>
          <span>{STATE_LABEL[tipState]} · {tree.containerName(tipSkill.id)}</span>
        </div>
      )}

      {/* 选中一颗星：在星旁边直接点亮 */}
      {focusedSkill && !readOnly && !replaying && (
        <div className={`star-card c-${focusedState}`} ref={card}>
          <b>{tree.skill(focusedSkill).name}</b>
          <span>{STATE_LABEL[focusedState!]} · {tree.containerName(focusedSkill)}</span>
          {tree.skill(focusedSkill).checks[0] && focusedState !== 'done' && <em>{tree.skill(focusedSkill).checks[0]}</em>}
          <div className="star-card-actions">
            {focusedState === 'locked' ? (
              <button className="primary" onClick={() => lightWithPrerequisites(focusedSkill)}>连同 {focusedMissing.length} 个前置一起点亮</button>
            ) : focusedOwn === 'done' ? (
              <button onClick={() => setStatus(focusedSkill, null)}>取消点亮</button>
            ) : (
              <button className="primary" onClick={() => setStatus(focusedSkill, 'done')}>✦ 点亮</button>
            )}
            {focusedOwn !== 'done' && (
              <button className={focusedOwn === 'learning' ? 'on' : ''} onClick={() => setStatus(focusedSkill, focusedOwn === 'learning' ? null : 'learning')}>
                {focusedOwn === 'learning' ? '在学中' : '标为在学'}
              </button>
            )}
          </div>
        </div>
      )}

      {firstRun && !focusedSkill && (
        <div className="coach">
          <b>这是你的星图。</b>
          圆心旁边的 {[...visibility].filter(([, v]) => v === 'full').length} 颗星是起点，点一颗你已经会的，把它点亮。
        </div>
      )}

      <div className="map-tools">
        <button className={fog ? '' : 'on'} onClick={() => setFog(!fog)} title={fog ? '显示全图（F）' : '回到迷雾（F）'}>{fog ? '◌' : '●'}</button>
        <button className={quick ? 'on' : ''} onClick={() => setQuick(!quick)} title="快速点亮：点星直接切换状态（Q）" disabled={readOnly}>✦</button>
        <button onClick={() => fitKnown()} title="回到我的星域（1）">◎</button>
        <button onClick={() => fitAll()} title="看整张图的范围（0）">⊙</button>
        <button onClick={replay} disabled={replaying} title="回放我的成长">▶</button>
      </div>
      {replaying && <div className="replay-badge">回放 · {new Date(replayAt!).toLocaleDateString('zh-CN')}</div>}
    </div>
  )
}
