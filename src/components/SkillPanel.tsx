// 一个技能：像游戏里的技能卡。技能槽、名字、状态、一句话、点亮按钮、要先点亮的、去哪学。
import type { SkillState } from '../types'
import { useApp } from '../state'
import { SkillSlot } from './glyphs'
import { Links, MiniSkill, StatusControl } from './common'

const BADGE: Record<SkillState, string> = { locked: '未解锁', available: '可点亮', done: '已点亮' }

export function SkillPanel({ id }: { id: string }) {
  const { tree, states } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  let row = 1
  for (let p = s.parent; p; p = tree.skill(p).parent) row++

  return (
    <div className="detail" key={id}>
      <div className="card-head">
        <SkillSlot uid={`card-${id}`} icon={s.icon} language={s.language} state={state} />
        <div className="card-title">
          <p className="card-kind">
            {s.language ? '语言天赋' : '技能'} · {tree.areas.get(s.areaId)!.name} · 第 {row} 层
          </p>
          <h2>{s.name}</h2>
          <span className={`badge b-${state}`}>{BADGE[state]}</span>
        </div>
      </div>

      <p className="summary">{s.intro}</p>
      <StatusControl id={id} />

      {s.prerequisites.length > 0 && (
        <section className="card-sec">
          <h4>先点亮上一级</h4>
          <div className="mini-row">{s.prerequisites.map((p) => <MiniSkill key={p} id={p} from="req" />)}</div>
        </section>
      )}

      <section className="card-sec">
        <h4>去哪学</h4>
        <Links links={s.resources} />
      </section>
    </div>
  )
}
