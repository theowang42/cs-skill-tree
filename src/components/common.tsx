// 面板里反复用到的小部件
import type { ReactNode } from 'react'
import type { SkillState } from '../types'
import { useApp } from '../state'
import { STATE_LABEL } from '../lib/format'

/** 进度条。value / max */
export function Meter({ value, max, label }: { value: number; max: number; label?: string }) {
  const w = max ? (100 * value) / max : 0
  return (
    <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span className="meter-done" style={{ width: `${w}%` }} />
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

/** 点亮 / 取消点亮：只有这两种状态 */
export function StatusControl({ id }: { id: string }) {
  const { progress, setStatus, readOnly } = useApp()
  const lit = progress.skills[id]?.status === 'done'
  return (
    <button
      className={`light-toggle${lit ? ' on' : ''}`}
      aria-pressed={lit}
      disabled={readOnly}
      onClick={() => setStatus(id, lit ? null : 'done')}
    >
      {lit ? '已点亮 · 点一下取消' : '点亮'}
    </button>
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
