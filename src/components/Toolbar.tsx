import { useEffect, useRef, useState } from 'react'
import { useApp, type View } from '../state'
import { searchTree, snippet, type Hit } from '../lib/search'
import { totals } from '../lib/tree'
import { Meter } from './common'

function Search() {
  const { tree, setFocus } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const hits = searchTree(tree, q)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.closest('input, textarea, [contenteditable]') !== null)
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
        placeholder="搜索技能、领域、方向（/）"
        value={q}
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)) }
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
  ['all', '全部', '显示所有技能'],
  ['goal', '目标路线', '只突出当前方向要学的技能'],
  ['frontier', '能力边界', '只看已经点亮的和现在就能学的，暗掉还够不着的'],
]

export function Toolbar() {
  const { tree, states, progress, readinessBySub, view, setView, quick, setQuick, readOnly, setFocus, activeSubId } = useApp()
  const t = totals(states)
  const goal = progress.goalSubId ? tree.subs.get(progress.goalSubId) : null
  const r = goal ? readinessBySub.get(goal.id)! : null
  return (
    <div className="toolbar">
      <div className="tb-progress" title={`已掌握 ${t.done}，在学 ${t.learning}，能力边界 ${t.available}`}>
        <span>
          <b>{t.done}</b>/{t.total}
        </span>
        <Meter value={t.done} partial={t.learning} max={t.total} label="总进度" />
      </div>
      <button className={`tb-goal${goal ? '' : ' empty'}`} onClick={() => (goal ? setFocus({ kind: 'sub', id: goal.id }, { scroll: true }) : setFocus({ kind: 'category', id: tree.roadmap.categories[0].id }, { scroll: true }))}>
        {goal && r ? (
          <>
            ★ {goal.name} <b>{Math.round(r.percent)}%</b>
          </>
        ) : (
          '选一个目标方向'
        )}
      </button>
      <div className="segmented views" role="radiogroup" aria-label="显示">
        {VIEWS.map(([v, label, title]) => (
          <button key={v} role="radio" aria-checked={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)} title={title} disabled={v === 'goal' && !activeSubId}>
            {label}
          </button>
        ))}
      </div>
      {!readOnly && (
        <label className={`quick-toggle${quick ? ' on' : ''}`} title="打开后点树上的技能直接切换：没学 → 学会了 → 在学 → 没学（快捷键 Q）">
          <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
          <span>快速点亮</span>
        </label>
      )}
      <Search />
    </div>
  )
}
