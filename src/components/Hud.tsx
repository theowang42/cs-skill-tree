// 顶栏：左边名字（回首页）和进度（打开“我的进度”）；右边在“这条路线”和“全部技能”之间切换，正选中的技能跟着过去。都是字，没有壳。
import { TREE_URL, HOME_URL, useApp } from '../state'
import { totals } from '../lib/tree'

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { tree, career, route, focus, states } = useApp()
  const t = totals(states)
  // 职业天赋树里切的是这个职业；技能树页里切的是选定的路线；都没有就不显示开关
  const mine = career ?? route
  const skill = focus?.kind === 'skill' ? focus.id : null
  const at = (keep: boolean) => (skill && keep ? `#/skill/${skill}` : '')

  return (
    <header className="hud">
      <div className="brand">
        <a className="brand-name" href={HOME_URL}>CS 技能树</a>
        <button className="brand-count" onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
          <b>{t.done}</b> / {t.total}
        </button>
      </div>
      {mine && (
        <nav className="switch" aria-label="看哪棵树">
          <a
            className={career ? 'on' : ''}
            aria-current={career ? 'page' : undefined}
            href={`${TREE_URL}../career/${mine}/index.html${at(tree.closures.get(mine)!.has(skill ?? ''))}`}
          >
            {tree.subs.get(mine)!.name.replace(/工程师$/, '')}
          </a>
          <a className={career ? '' : 'on'} aria-current={career ? undefined : 'page'} href={`${TREE_URL}index.html${at(true)}`}>
            全部
          </a>
        </nav>
      )}
    </header>
  )
}
