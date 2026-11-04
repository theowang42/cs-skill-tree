import { useApp } from '../state'
import { Dashboard } from './Dashboard'
import { SkillPanel } from './SkillPanel'
import { AreaPanel } from './AreaPanel'
import { SubPanel } from './SubPanel'
import { CategoryPanel } from './CategoryPanel'

export function Panel() {
  const { focus, setFocus, shared, leaveShared, adoptShared } = useApp()
  return (
    <>
      {shared && (
        <div className="shared-banner">
          <p>你在看别人分享的技能树（只读）。</p>
          <div className="row-actions">
            <button onClick={leaveShared}>回到我的</button>
            <button onClick={adoptShared}>用它覆盖我的进度</button>
          </div>
        </div>
      )}
      {focus && (
        <button className="back-link" onClick={() => setFocus(null)}>
          ← 我的星图
        </button>
      )}
      {!focus && <Dashboard />}
      {focus?.kind === 'skill' && <SkillPanel id={focus.id} />}
      {focus?.kind === 'area' && <AreaPanel id={focus.id} />}
      {focus?.kind === 'sub' && <SubPanel id={focus.id} />}
      {focus?.kind === 'category' && <CategoryPanel id={focus.id} />}
    </>
  )
}
