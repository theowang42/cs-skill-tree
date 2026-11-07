// 顶栏：左边名字（回首页）和进度（打开“我的进度”）；职业天赋树里右边多一个回大图的入口。都是字，没有壳。
import { HOME_URL, TREE_URL, useApp } from '../state'
import { totals } from '../lib/tree'

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { career, states } = useApp()
  const t = totals(states)

  return (
    <header className="hud">
      <div className="brand">
        <a className="brand-name" href={HOME_URL}>CS 技能树</a>
        <button className="brand-count" onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
          <b>{t.done}</b> / {t.total}
        </button>
      </div>
      {career && <a className="hud-text" href={`${TREE_URL}index.html`}>整棵树</a>}
    </header>
  )
}
