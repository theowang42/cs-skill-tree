// 顶部的仪表：进度、目标、视图、快速点亮、“带我去下一颗”、搜索
import { useEffect, useRef, useState } from 'react'
import { useApp, type View } from '../state'
import { searchTree, snippet, type Hit } from '../lib/search'
import { frontier, totals } from '../lib/tree'

function Search() {
  const { tree, setFocus } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const hits = searchTree(tree, q)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]') !== null
      if (e.key === '/' && !typing) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (h: Hit) => {
    setFocus({ kind: h.kind, id: h.id }, { scroll: true })
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="search" role="combobox" aria-expanded={open && hits.length > 0} aria-haspopup="listbox">
      <input
        ref={input}
        id="search-input"
        type="search"
        placeholder="找一颗星（/）"
        value={q}
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.max(0, Math.min(s + 1, hits.length - 1))) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
          else if (e.key === 'Enter' && hits[sel]) go(hits[sel])
          else if (e.key === 'Escape') { setQ(''); input.current?.blur() }
        }}
        aria-label="搜索"
      />
      {open && q && (
        <ul className="search-results" role="listbox">
          {hits.length === 0 && <li className="empty">没有找到“{q}”</li>}
          {hits.map((h, i) => (
            <li key={`${h.kind}:${h.id}`} role="option" aria-selected={i === sel}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)} onMouseEnter={() => setSel(i)}>
                <span className="hit-name">{h.name}</span>
                <small className="hit-where">{h.where}</small>
                {h.matched && <small className="hit-match">{snippet(h.matched, q)}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const VIEWS: [View, string, string][] = [
  ['all', '全部', '显示所有星'],
  ['goal', '目标', '只亮出当前方向要学的'],
  ['frontier', '边界', '只亮出已掌握和现在能学的'],
]

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, states, progress, readinessBySub, view, setView, quick, setQuick, readOnly, setFocus, activeSubId, focus } = useApp()
  const t = totals(states)
  const goal = progress.goalSubId ? tree.subs.get(progress.goalSubId) : null
  const r = goal ? readinessBySub.get(goal.id)! : null
  const next = frontier(tree, states, progress.goalSubId)[0]

  return (
    <header className="hud">
      <button className={`brand${panelOpen ? ' open' : ''}`} onClick={onTogglePanel} title={panelOpen ? '收起面板' : '打开面板'}>
        <span className="brand-mark" aria-hidden />
        <span className="brand-name">CS 星图</span>
      </button>
      <div className="hud-stats" title={`已掌握 ${t.done}，在学 ${t.learning}，能力边界 ${t.available}，还够不着 ${t.locked}`}>
        <span className="st st-done"><b>{t.done}</b>已掌握</span>
        <span className="st st-available"><b>{t.available}</b>能学</span>
        <span className="st st-total"><b>{t.total}</b>颗星</span>
      </div>
      <button
        className={`hud-goal${goal ? '' : ' empty'}`}
        onClick={() => (goal ? setFocus({ kind: 'sub', id: goal.id }, { scroll: true }) : setFocus({ kind: 'category', id: tree.roadmap.categories[0].id }, { scroll: true }))}
      >
        {goal && r ? (
          <>
            <span className="goal-dot" aria-hidden />
            {goal.name} <b>{Math.round(r.percent)}%</b>
          </>
        ) : (
          '选一个目标方向'
        )}
      </button>
      {next && !readOnly && (
        <button className="hud-next" onClick={() => setFocus({ kind: 'skill', id: next.id }, { scroll: true })} title="飞到最该学的那颗星">
          下一颗 → {tree.skill(next.id).name}
        </button>
      )}
      <div className="segmented views" role="radiogroup" aria-label="显示">
        {VIEWS.map(([v, label, title]) => (
          <button key={v} role="radio" aria-checked={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)} title={title} disabled={v === 'goal' && !activeSubId}>
            {label}
          </button>
        ))}
      </div>
      {!readOnly && (
        <label className={`quick-toggle${quick ? ' on' : ''}`} title="打开后点星直接切换：没学 → 已掌握 → 在学 → 没学（快捷键 Q）">
          <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
          <span>快速点亮</span>
        </label>
      )}
      <Search />
      {focus && <span className="sr-only">当前选中 {focus.kind} {focus.id}</span>}
    </header>
  )
}
