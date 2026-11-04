// 一个技能：一句话、去哪学、点亮。没有别的。
import { useApp } from '../state'
import { STATE_LABEL } from '../lib/format'
import { LEVEL_NAMES } from '../lib/treeLayout'
import { Links, StatusControl } from './common'
import { ToolIcon } from './ToolIcon'

export function SkillPanel({ id }: { id: string }) {
  const { tree, states, setFocus } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  const area = s.areaId ? tree.areas.get(s.areaId) : undefined
  const group = s.groupId ? tree.groups.get(s.groupId) : undefined
  const links = [...s.resources, ...(area?.courses ?? [])]

  return (
    <div className="detail" key={id}>
      <p className="eyebrow">
        {area ? (
          <button className="link-button" onClick={() => setFocus({ kind: 'area', id: area.id }, { scroll: true })}>{area.name}</button>
        ) : (
          group!.name
        )}
        {' · '}
        {LEVEL_NAMES[s.level]}
      </p>
      <h2 className={s.kind === 'tool' ? 'with-icon' : ''}>
        {s.kind === 'tool' && <ToolIcon id={id} />}
        <span>{s.name}</span>
      </h2>
      <p className="summary">{s.intro}</p>
      <StatusControl id={id} />
      <p className="state-line">{STATE_LABEL[state]}</p>
      {links.length > 0 && (
        <>
          <h4>去哪学</h4>
          <Links links={links} />
        </>
      )}
      {s.prerequisites.length > 0 && (
        <p className="prereq-line">
          先会：
          {s.prerequisites.map((p, i) => (
            <span key={p}>
              {i > 0 && '、'}
              <button className="link-button inline" onClick={() => setFocus({ kind: 'skill', id: p }, { scroll: true })}>{tree.skill(p).name}</button>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
