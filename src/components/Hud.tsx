// 顶栏：左边名字和进度，右边达成了几个职业（职业天赋树里是回到大图）、下一个该学的。都是字，没有壳。
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, career, states, progressBySub, readOnly, setFocus } = useApp()
  const t = totals(states)
  const reached = [...progressBySub.values()].filter((p) => p.done === p.total).length
  const next = frontier(tree, states).find((id) => !career || tree.closures.get(career)!.has(id))

  return (
    <header className="hud">
      <button className={`brand${panelOpen ? ' open' : ''}`} onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
        <span className="brand-name">CS 技能树</span>
        <span className="brand-count">
          <b>{t.done}</b> / {t.total}
        </span>
      </button>
      <div className="hud-right">
        {career ? (
          <a className="hud-text hud-goal" href={import.meta.env.BASE_URL}>整棵树</a>
        ) : (
          <button className="hud-text hud-goal" onClick={() => setFocus({ kind: 'careers' })} title="最外圈的职业">
            职业 <b>{reached}</b> / {tree.roadmap.subs.length}
          </button>
        )}
        {next && !readOnly && (
          <button className="hud-text" onClick={() => setFocus({ kind: 'skill', id: next }, { scroll: true })} title="跳到最该学的那个">
            下一个 <b>{tree.skill(next).name}</b>
          </button>
        )}
      </div>
    </header>
  )
}
