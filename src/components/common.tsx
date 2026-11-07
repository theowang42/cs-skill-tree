// 面板里反复用到的小部件
import type { CSSProperties } from 'react'
import { Check, ChevronsUp, Lock } from 'lucide-react'
import type { Link } from '../types'
import { labelWidth } from '../lib/layout'
import { useApp } from '../state'
import { SkillSlot } from './glyphs'

/** 卡片上的名字：一行放下，不在词中间断开；放不下就缩小（--len 是名字有几个字宽） */
export function CardName({ name }: { name: string }) {
  return <h2 className="card-name" style={{ '--len': labelWidth(name) / 14 } as CSSProperties}>{name}</h2>
}

/** 进度条 */
export function Meter({ value, max }: { value: number; max: number }) {
  return (
    <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className="meter-done" style={{ width: `${max ? (100 * value) / max : 0}%` }} />
    </span>
  )
}

/** 点亮 / 熄灭。前置没点亮时按不了 */
export function StatusControl({ id }: { id: string }) {
  const { states, setLit, readOnly } = useApp()
  const lit = states.get(id) === 'done'
  const locked = states.get(id) === 'locked'
  return (
    <button className={`light-toggle${lit ? ' on' : ''}${locked ? ' locked' : ''}`} aria-pressed={lit} disabled={readOnly || locked} onClick={() => setLit(id, !lit)}>
      {lit ? (
        <>
          <Check size={18} strokeWidth={3} />
          <span className="lt-main">已点亮</span>
          <span className="lt-off">熄灭</span>
        </>
      ) : locked ? (
        <>
          <Lock size={16} strokeWidth={2.4} />
          <span className="lt-main">先点亮上一级</span>
        </>
      ) : (
        <>
          <ChevronsUp size={20} strokeWidth={2.6} />
          <span className="lt-main">点亮</span>
          <kbd>D</kbd>
        </>
      )}
    </button>
  )
}

/** 列表里的一个技能：小技能槽、名字、点亮了没有。点了飞过去 */
export function MiniSkill({ id, from }: { id: string; from: string }) {
  const { tree, states, setFocus } = useApp()
  const s = tree.skill(id)
  const st = states.get(id)!
  return (
    <button className={`mini s-${st}`} onClick={() => setFocus({ kind: 'skill', id }, { scroll: true })}>
      <SkillSlot uid={`${from}-${id}`} icon={s.icon} language={s.language} state={st} size={52} />
      <span className="mini-name">{s.name}</span>
      <span className="mini-state">{st === 'done' ? '已点亮' : '未点亮'}</span>
    </button>
  )
}

export function Links({ links }: { links: Link[] }) {
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
