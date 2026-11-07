// 顶栏：名字和点亮了几个，点一下打开“我的进度”。职业列表和下一步学什么都在“我的进度”里
import { useApp } from '../state'
import { totals } from '../lib/tree'

export function Hud({ onTogglePanel, panelOpen }: { onTogglePanel: () => void; panelOpen: boolean }) {
  const { states } = useApp()
  const t = totals(states)

  return (
    <header className="hud">
      <button className={`brand${panelOpen ? ' open' : ''}`} onClick={onTogglePanel} title={panelOpen ? '收起' : '打开我的进度'}>
        <span className="brand-name">CS 技能树</span>
        <span className="brand-count">
          <b>{t.done}</b> / {t.total}
        </span>
      </button>
    </header>
  )
}
