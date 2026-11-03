// 选中一个技能时，在树上画出它的前置路线（一直到根）和它直接解锁的技能。
// 线画在一张盖在树上的 SVG 里，坐标从 DOM 里量；树的大小一变就重新量。
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { useApp } from '../state'

interface Line {
  d: string
  kind: 'direct' | 'path' | 'unlock'
  key: string
}

function anchor(el: Element, box: DOMRect) {
  const r = el.getBoundingClientRect()
  return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
}

/** 从前置 a 连到后继 b 的曲线。b 在上面时竖着连，差不多一样高时横着连。 */
function curve(a: ReturnType<typeof anchor>, b: ReturnType<typeof anchor>): string {
  const ax = a.x + a.w / 2
  const bx = b.x + b.w / 2
  if (b.y + b.h <= a.y + 2) {
    const y1 = a.y
    const y2 = b.y + b.h
    const c = Math.max(24, (y1 - y2) / 2)
    return `M${ax},${y1} C${ax},${y1 - c} ${bx},${y2 + c} ${bx},${y2}`
  }
  if (a.y + a.h <= b.y + 2) {
    const y1 = a.y + a.h
    const y2 = b.y
    const c = Math.max(24, (y2 - y1) / 2)
    return `M${ax},${y1} C${ax},${y1 + c} ${bx},${y2 - c} ${bx},${y2}`
  }
  const right = bx > ax
  const x1 = right ? a.x + a.w : a.x
  const x2 = right ? b.x : b.x + b.w
  const y1 = a.y + a.h / 2
  const y2 = b.y + b.h / 2
  const c = Math.max(20, Math.abs(x2 - x1) / 2)
  return `M${x1},${y1} C${x1 + (right ? c : -c)},${y1} ${x2 + (right ? -c : c)},${y2} ${x2},${y2}`
}

export function Edges({ container }: { container: RefObject<HTMLElement | null> }) {
  // 目标或状态变了，节点上会多出步数角标、宽度会变，线也要跟着重量
  const { tree, focus, openCategory, activeSubId, states, view } = useApp()
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [tick, setTick] = useState(0)
  const skillId = focus?.kind === 'skill' ? focus.id : null

  // 树的尺寸变化（窗口缩放、展开方向、字体加载完）时重新量
  useEffect(() => {
    const el = container.current
    if (!el) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(el)
    document.fonts?.ready.then(() => setTick((t) => t + 1))
    return () => ro.disconnect()
  }, [container])

  useLayoutEffect(() => {
    const root = container.current
    if (!root || !skillId) {
      setLines([])
      return
    }
    const box = root.getBoundingClientRect()
    setSize({ w: root.scrollWidth, h: root.scrollHeight })
    const find = (id: string) => root.querySelector(`[data-node="skill:${CSS.escape(id)}"]`)
    const out: Line[] = []
    const seen = new Set<string>()
    // 前置路线：从选中的技能往下一直走到根
    const walk = (id: string, depth: number) => {
      const to = find(id)
      if (!to) return
      for (const p of tree.skill(id).prerequisites) {
        const key = `${p}>${id}`
        if (seen.has(key)) continue
        seen.add(key)
        const from = find(p)
        if (from) out.push({ d: curve(anchor(from, box), anchor(to, box)), kind: depth === 0 ? 'direct' : 'path', key })
        walk(p, depth + 1)
      }
    }
    walk(skillId, 0)
    const me = find(skillId)
    if (me) {
      for (const d of tree.skill(skillId).dependents) {
        const to = find(d)
        if (to) out.push({ d: curve(anchor(me, box), anchor(to, box)), kind: 'unlock', key: `${skillId}>${d}` })
      }
    }
    setLines(out)
  }, [tree, skillId, tick, openCategory, activeSubId, states, view, container])

  if (!lines.length) return null
  // 远的路线先画，直接相连的画在最上面
  const order = { path: 0, unlock: 1, direct: 2 }
  return (
    <svg className="edges" width={size.w} height={size.h} aria-hidden>
      <defs>
        <marker id="edge-end" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5">
          <circle cx="3" cy="3" r="2.4" />
        </marker>
      </defs>
      {[...lines].sort((a, b) => order[a.kind] - order[b.kind]).map((l) => (
        <path key={l.key} d={l.d} className={`edge e-${l.kind}`} markerEnd="url(#edge-end)" />
      ))}
    </svg>
  )
}
