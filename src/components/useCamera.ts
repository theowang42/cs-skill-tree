// 技能树的镜头：滚轮平移、缩放、拖动、双指缩放、飞到某处。不走 React，直接改 <g> 的 transform。
// “你”在 (0, 0)，整张图在 bounds 这个框里。
//   - 打开时：整棵装得下就整棵居中（最多原大小）；装不下就让横着的那一边装满（往上长的树装满宽度、往右长的装满高度），
//     停在“你”那一头，往外滚着读；
//   - 点“看全图”时整张图装进屏幕，这也是最小的缩放；
//   - 任何缩放下都能拖，屏幕中心能到图上任何一点，图不会整个拖出屏幕。
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Layout, Orient } from '../lib/layout'

interface View {
  x: number
  y: number
  k: number
}

const MAX_K = 2.5
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function useCamera({ minX, minY, maxX, maxY }: Layout['bounds'], orient: Orient) {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const rx = (maxX - minX) / 2
  const ry = (maxY - minY) / 2
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const world = useRef<SVGGElement>(null)
  const view = useRef<View>({ x: 0, y: 0, k: 1 })
  const anim = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // 最小缩放：整张图装进屏幕，但小图不放大过原大小。窗口还没量出尺寸时是 0，给个下限免得除以 0
  const minK = Math.max(0.05, Math.min(1, size.w / (2 * rx), size.h / (2 * ry)))
  const limits = useRef({ minK, ...size })
  limits.current = { minK, ...size }
  /** 用户动过镜头之后，窗口大小变了就不再自动回到开头的位置 */
  const touched = useRef(false)

  const apply = useCallback((raw: View) => {
    const { minK: lo, w, h } = limits.current
    const k = Math.min(MAX_K, Math.max(lo, raw.k))
    // 屏幕中心对着的那一点，不出整张图的框
    const x = Math.min(maxX, Math.max(minX, (w / 2 - raw.x) / raw.k))
    const y = Math.min(maxY, Math.max(minY, (h / 2 - raw.y) / raw.k))
    view.current = { x: w / 2 - x * k, y: h / 2 - y * k, k }
    world.current?.setAttribute('transform', `translate(${view.current.x},${view.current.y}) scale(${k})`)
  }, [minX, minY, maxX, maxY])

  /** 让世界坐标 (cx, cy) 对着宽 width 的那块屏幕的正中，缩放 k；ms 是动画时长 */
  const flyTo = useCallback((cx: number, cy: number, k: number, { ms = 550, width = limits.current.w } = {}) => {
    cancelAnimationFrame(anim.current)
    const to = { x: width / 2 - cx * k, y: limits.current.h / 2 - cy * k, k }
    if (ms <= 0) return apply(to)
    const from = { ...view.current }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const e = ease(p)
      apply({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e })
      if (p < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [apply])

  useEffect(() => {
    // 先量一次：有的环境里（比如无头浏览器）观察者开始时不报一次尺寸
    const { width, height } = wrap.current!.getBoundingClientRect()
    setSize({ w: width, h: height })
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(wrap.current!)
    return () => ro.disconnect()
  }, [])

  // 开头。窗口变了也重新来，除非用户已经动过
  useEffect(() => {
    if (!size.w || touched.current) return
    const across = orient === 'up' ? size.w / (2 * rx) : size.h / (2 * ry)
    const k = Math.max(limits.current.minK, Math.min(1, across))
    if (k <= limits.current.minK) flyTo(cx, cy, k, { ms: 0 })
    else if (orient === 'up') flyTo(cx, maxY - size.h / 2 / k, k, { ms: 0 })
    else flyTo(minX + size.w / 2 / k, cy, k, { ms: 0 })
  }, [size, flyTo, orient, cx, cy, rx, ry, minX, maxY])

  /** 以屏幕上的 (sx, sy) 为中心缩放到 k */
  const zoomAt = useCallback((sx: number, sy: number, k: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const px = sx - rect.left
    const py = sy - rect.top
    const v = view.current
    const nk = Math.min(MAX_K, Math.max(limits.current.minK, k))
    apply({ x: px - ((px - v.x) / v.k) * nk, y: py - ((py - v.y) / v.k) * nk, k: nk })
  }, [apply])

  useEffect(() => {
    const el = svg.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      touched.current = true
      // 滚轮和触控板双指滑动是平移（树很宽，Shift + 滚轮左右移）；按住 Ctrl / ⌘ 或双指捏合才缩放（捏合是带 ctrl 的滚轮，幅度小，要放大一些）
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, view.current.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
      else apply({ ...view.current, x: view.current.x - e.deltaX, y: view.current.y - e.deltaY })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, apply])

  // ── 拖动、双指缩放 ──
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; k: number } | null>(null)

  const onPointerDown = (e: PointerEvent) => {
    cancelAnimationFrame(anim.current)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: view.current.x, vy: view.current.y, moved: false }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.current.k }
      drag.current = null
    }
  }
  const onPointerMove = (e: PointerEvent) => {
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
      svg.current!.setPointerCapture(e.pointerId)
    }
    if (d.moved) apply({ ...view.current, x: d.vx + dx, y: d.vy + dy })
  }
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    // 拖完松手时浏览器还会发一次 click：这一帧里还算在拖，click 就不会被当成点选
    const d = drag.current
    window.setTimeout(() => { if (drag.current === d) drag.current = null }, 0)
  }

  return {
    wrap, svg, world, size,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    /** 刚才是拖动，不是点击 */
    dragged: () => drag.current?.moved === true,
    /** 飞过去，并且之后窗口变了也不再回开头 */
    fly: (cx: number, cy: number, k: number, width?: number) => {
      touched.current = true
      flyTo(cx, cy, k, { width })
    },
    zoom: (factor: number) => zoomAt(limits.current.w / 2, limits.current.h / 2, view.current.k * factor),
    /** 看全图 */
    fit: () => flyTo(cx, cy, limits.current.minK),
    /** 现在的缩放 */
    scale: () => view.current.k,
  }
}
