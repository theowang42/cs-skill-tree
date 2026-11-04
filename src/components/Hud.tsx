// 顶栏：左边名字（开面板），右边目标、“下一颗”、进度、搜索。能少一个就少一个。
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
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
        setOpen(true)
        window.setTimeout(() => input.current?.focus(), 0)
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
    <div className={`search${open ? ' open' : ''}`} role="combobox" aria-expanded={open && hits.length > 0} aria-haspopup="listbox">
      <button className="search-btn" onClick={() => { setOpen(true); window.setTimeout(() => input.current?.focus(), 0) }} aria-label="搜索（/）">⌕</button>
      <input
        ref={input}
        id="search-input"
        type="search"
        placeholder="找一颗星"
        value={q}
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setSel(0) }}
        onBlur={() => window.setTimeout(() => { if (!q) setOpen(false) }, 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.max(0, Math.min(s + 1, hits.length - 1))) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
          else if (e.key === 'Enter' && hits[sel]) go(hits[sel])
          else if (e.key === 'Escape') { setQ(''); setOpen(false); input.current?.blur() }
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

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, states, progress, readinessBySub, readOnly, setFocus } = useApp()
  const t = totals(states)
  const goal = progress.goalSubId ? tree.subs.get(progress.goalSubId) : null
  const r = goal ? readinessBySub.get(goal.id)! : null
  const next = frontier(tree, states, progress.goalSubId)[0]

  return (
    <header className="hud">
      <button className={`brand${panelOpen ? ' open' : ''}`} onClick={onTogglePanel} title={panelOpen ? '收起面板' : '打开面板'}>
        <span className="brand-mark" aria-hidden />
        <span className="brand-name">CS 星图</span>
        <span className="brand-count">
          <b>{t.done}</b>/{t.total}
        </span>
      </button>
      <div className="hud-right">
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
            下一颗 <b>{tree.skill(next.id).name}</b>
          </button>
        )}
        <Search />
      </div>
    </header>
  )
}
