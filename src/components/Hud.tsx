// 顶栏：左边名字和进度，右边达成了几个职业、下一个该学的。都是字，没有壳。
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, states, readinessBySub, readOnly, setFocus } = useApp()
  const t = totals(states)
  // 职业不用选：点够了自己达成。顶栏只显示达成了几个
  const reachedCount = tree.roadmap.subs.filter((s) => { const r = readinessBySub.get(s.id)!; return r.coreDone >= r.coreTotal }).length
  const next = frontier(tree, states, null)[0]

  return (
    <header className="hud">
      <button className={`brand${panelOpen ? ' open' : ''}`} onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
        <span className="brand-name">CS 技能树</span>
        <span className="brand-count">
          <b>{t.done}</b> / {t.total}
        </span>
      </button>
      <div className="hud-right">
        <button className="hud-text hud-goal" onClick={() => setFocus({ kind: 'category', id: tree.roadmap.categories[0].id })} title="最外圈的终极节点">
          职业 <b>{reachedCount}</b> / {tree.roadmap.subs.length}
        </button>
        {next && !readOnly && (
          <button className="hud-text" onClick={() => setFocus({ kind: 'skill', id: next.id }, { scroll: true })} title="跳到最该学的那个">
            下一个 <b>{tree.skill(next.id).name}</b>
          </button>
        )}
      </div>
    </header>
  )
}
