// 顶栏：左边名字（回首页）和进度（打开“我的进度”），右边达成了几个职业（职业天赋树里是回到大图）、下一个该学的。都是字，没有壳。
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'

/** 站点首页：技能树在它下面的 tree/ */
export const HOME = `${import.meta.env.BASE_URL}../`

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, career, states, progressBySub, readOnly, setFocus } = useApp()
  const t = totals(states)
  const reached = [...progressBySub.values()].filter((p) => p.done === p.total).length
  const next = frontier(tree, states).find((id) => !career || tree.closures.get(career)!.has(id))

  return (
    <header className="hud">
      <div className="brand">
        <a className="brand-name" href={HOME}>CS 技能树</a>
        <button className="brand-count" onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
          <b>{t.done}</b> / {t.total}
        </button>
      </div>
      <div className="hud-right">
        {career ? (
          <a className="hud-text hud-goal" href={import.meta.env.BASE_URL}>整棵树</a>
        ) : (
          <a className="hud-text hud-goal" href={`${HOME}#careers`} title="全部职业">
            职业 <b>{reached}</b> / {tree.roadmap.subs.length}
          </a>
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
