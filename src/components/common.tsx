// 面板里反复用到的小部件
import type { ReactNode } from 'react'
import type { SkillState, Status } from '../types'
import { useApp } from '../state'
import { STATE_LABEL } from '../lib/format'

/** 进度条。value / max，可选第二段（在学） */
export function Meter({ value, max, partial = 0, label }: { value: number; max: number; partial?: number; label?: string }) {
  const w = max ? (100 * value) / max : 0
  const p = max ? (100 * partial) / max : 0
  return (
    <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span className="meter-done" style={{ width: `${w}%` }} />
      <span className="meter-partial" style={{ left: `${w}%`, width: `${p}%` }} />
    </span>
  )
}

export function StateDot({ state }: { state: SkillState }) {
  return <span className={`dot d-${state}`} aria-hidden />
}

/** 一个可点击的技能小标签，带状态点 */
export function SkillChip({ id, note }: { id: string; note?: ReactNode }) {
  const { tree, states, setFocus } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  return (
    <button className={`chip c-${state}`} onClick={() => setFocus({ kind: 'skill', id }, { scroll: true })} title={`${s.name} · ${STATE_LABEL[state]}`}>
      <StateDot state={state} />
      {s.name}
      {note && <small>{note}</small>}
    </button>
  )
}

export function SubChip({ id }: { id: string }) {
  const { tree, readinessBySub, setFocus, progress } = useApp()
  const s = tree.subs.get(id)!
  const r = readinessBySub.get(id)!
  return (
    <button className="chip sub-chip" onClick={() => setFocus({ kind: 'sub', id }, { scroll: true })}>
      {progress.goalSubId === id && <span aria-label="目标">★</span>}
      {s.name}
      <small>{Math.round(r.percent)}%</small>
    </button>
  )
}

/** 没学 / 在学 / 学会了 三段开关 */
export function StatusControl({ id, compact = false }: { id: string; compact?: boolean }) {
  const { progress, setStatus, readOnly } = useApp()
  const cur: Status | null = progress.skills[id]?.status ?? null
  const opts: [Status | null, string][] = [[null, '没学'], ['learning', '在学'], ['done', compact ? '会了' : '学会了']]
  return (
    <div className={`segmented status-control${compact ? ' compact' : ''}`} role="radiogroup" aria-label="学习状态">
      {opts.map(([v, label]) => (
        <button
          key={label}
          role="radio"
          aria-checked={cur === v}
          className={cur === v ? `on v-${v ?? 'none'}` : ''}
          disabled={readOnly}
          onClick={() => setStatus(id, v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Section({ title, children, aside }: { title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="p-section">
      <h4>
        <span>{title}</span>
        {aside}
      </h4>
      {children}
    </section>
  )
}

export function Links({ links }: { links: { label: string; url: string }[] }) {
  return (
    <ul className="links">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noreferrer">
            {l.label} <span aria-hidden>↗</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
