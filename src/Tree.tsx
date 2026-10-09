import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { BLOCKS, CATEGORIES, LAYERS, LEVELS, getBlock, type LayerId } from './data/roadmap'
import { goalDirections, isMastered, levelOf, readiness, stars, type Goal, type Levels } from './model'

// 7 列网格上的位置。核心层内部有依赖，所以拆成 3 排，前置在下、后续在上，
// 列号让上下有依赖的块尽量对齐，连线更直。
const ROWS: { layer: LayerId; cells: [string, number][] }[] = [
  { layer: 'advanced', cells: [['theory', 1], ['ml', 2], ['graphics', 3], ['architecture', 4], ['hpc', 5], ['security', 6], ['distributed', 7]] },
  { layer: 'core', cells: [['network', 5], ['database', 7]] },
  { layer: 'core', cells: [['plc', 3], ['os', 5]] },
  { layer: 'core', cells: [['dsa', 2], ['organization', 4], ['swe', 6]] },
  { layer: 'foundation', cells: [['math', 2], ['programming', 4], ['tooling', 6]] },
]

const catKey = (id: string) => `cat:${id}`

type Box = { cx: number; top: number; bottom: number }

interface Props {
  levels: Levels
  goal: Goal
  goalSet: Set<string>
  next: string[]
  focusBlock: string | null
  onSelectCategory: (catId: string) => void
  onSelectDirection: (catId: string, dir: number) => void
  onSelectBlock: (id: string) => void
}

export default function Tree({ levels, goal, goalSet, next, focusBlock, onSelectCategory, onSelectDirection, onSelectBlock }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const [boxes, setBoxes] = useState<Map<string, Box>>(new Map())
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<string | null>(null)

  const register = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(id, el)
      else nodes.current.delete(id)
    },
    [],
  )

  const measure = useCallback(() => {
    const root = container.current
    if (!root) return
    const origin = root.getBoundingClientRect()
    const next = new Map<string, Box>()
    for (const [id, el] of nodes.current) {
      const r = el.getBoundingClientRect()
      next.set(id, { cx: r.left - origin.left + r.width / 2, top: r.top - origin.top, bottom: r.bottom - origin.top })
    }
    setBoxes(next)
    setSize({ w: root.scrollWidth, h: root.scrollHeight })
  }, [])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (container.current) ro.observe(container.current)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [measure])

  useLayoutEffect(measure, [goal, levels, measure])

  const hasGoal = goal !== null
  const goalDirs = goalDirections(goal)

  // 连线：前置块的顶部 → 后续块（或目标大类）的底部
  const edges: { from: string; to: string; cls: string }[] = []
  for (const b of BLOCKS) {
    for (const r of b.requires) {
      let cls = 'edge'
      if (hasGoal) cls += goalSet.has(b.id) && goalSet.has(r) ? ' on' : ' dim'
      if (hover && (hover === b.id || hover === r)) cls += ' hover'
      edges.push({ from: r, to: b.id, cls })
    }
  }
  if (goal) {
    const direct = new Set(goalDirs.flatMap((d) => d.requires))
    for (const r of direct) edges.push({ from: r, to: catKey(goal.catId), cls: 'edge on goal' })
  }

  const path = (from: string, to: string) => {
    const a = boxes.get(from)
    const b = boxes.get(to)
    if (!a || !b) return null
    const y1 = a.top
    const y2 = b.bottom
    const dy = Math.max(24, (y1 - y2) * 0.5)
    return `M ${a.cx} ${y1} C ${a.cx} ${y1 - dy}, ${b.cx} ${y2 + dy}, ${b.cx} ${y2}`
  }

  const renderBlock = (id: string, col: number) => {
    const b = getBlock(id)
    const lv = levelOf(levels, id)
    const inGoal = goalSet.has(id)
    const cls = [
      'block',
      `lv${lv}`,
      hasGoal && (inGoal ? 'in-goal' : 'dimmed'),
      inGoal && isMastered(levels, id) && 'met',
      hasGoal && next.includes(id) && 'next',
      focusBlock === id && 'focused',
    ]
      .filter(Boolean)
      .join(' ')
    return (
      <button
        key={id}
        ref={register(id)}
        className={cls}
        style={{ gridColumn: col }}
        onClick={() => onSelectBlock(id)}
        onMouseEnter={() => setHover(id)}
        onMouseLeave={() => setHover(null)}
        title={b.summary}
      >
        {hasGoal && next.includes(id) && <span className="badge">下一步</span>}
        <span className="block-name">{b.name}</span>
        <span className="dots" aria-label={LEVELS[lv]}>
          {[1, 2, 3, 4].map((i) => (
            <i key={i} className={i <= lv ? 'filled' : ''} />
          ))}
          <em>{LEVELS[lv]}</em>
        </span>
      </button>
    )
  }

  return (
    <div className="tree" ref={container}>
      <svg className="edges" width={size.w} height={size.h} aria-hidden>
        {edges.map((e) => {
          const d = path(e.from, e.to)
          return d && <path key={`${e.from}-${e.to}`} d={d} className={e.cls} />
        })}
      </svg>

      <section className="band band-apps">
        <header className="band-label">
          <strong>应用层</strong>
          <span>开源方向：选一个目标</span>
        </header>
        <div className="grid7 cats">
          {CATEGORIES.map((cat, ci) => {
            const active = goal?.catId === cat.id
            return (
              <div
                key={cat.id}
                ref={register(catKey(cat.id))}
                className={['cat', cat.minor && 'minor', active && 'active', hasGoal && !active && 'dimmed'].filter(Boolean).join(' ')}
                style={{ gridColumn: ci + 1 }}
              >
                <button className="cat-head" onClick={() => onSelectCategory(cat.id)}>
                  <span className="cat-index">{cat.index}</span>
                  <span className="cat-name">{cat.name}</span>
                </button>
                <ul className="dirs">
                  {cat.directions.map((d, di) => {
                    const { met, total } = readiness(d, levels)
                    const selected = active && goal?.dir === di
                    return (
                      <li key={d.name}>
                        <button className={selected ? 'dir selected' : 'dir'} onClick={() => onSelectDirection(cat.id, di)}>
                          <span className="dir-name">{d.name}</span>
                          {!cat.minor && (
                            <span className="dir-meta">
                              <span className="stars">{stars(d.difficulty)}</span>
                              <span className="ready">
                                <span className="ready-bar">
                                  <span style={{ width: `${(met / total) * 100}%` }} />
                                </span>
                                {met}/{total}
                              </span>
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {LAYERS.map((layer) => (
        <section key={layer.id} className={`band band-${layer.id}`}>
          <header className="band-label">
            <strong>{layer.name}</strong>
            <span>{layer.desc}</span>
          </header>
          <div className="rows">
            {ROWS.filter((r) => r.layer === layer.id).map((row, i) => (
              <div key={i} className="grid7">
                {row.cells.map(([id, col]) => renderBlock(id, col))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
