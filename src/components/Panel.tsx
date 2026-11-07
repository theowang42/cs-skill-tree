import { useApp } from '../state'
import { Dashboard } from './Dashboard'
import { SkillPanel } from './SkillPanel'
import { SubPanel } from './SubPanel'

export function Panel() {
  const { tree, focus, home, setFocus, readOnly, leaveShared, adoptShared } = useApp()
  const atHome = JSON.stringify(focus) === JSON.stringify(home)
  return (
    <>
      {readOnly && (
        <div className="shared-banner">
          <p>你在看别人分享的技能树（只读）。</p>
          <div className="row-actions">
            <button onClick={leaveShared}>回到我的</button>
            <button onClick={adoptShared}>用它覆盖我的进度</button>
          </div>
        </div>
      )}
      {!atHome && (
        <button className="back-link" onClick={() => setFocus(home)}>
          ← {home?.kind === 'sub' ? tree.subs.get(home.id)!.name : '我的进度'}
        </button>
      )}
      {!focus && <Dashboard />}
      {focus?.kind === 'skill' && <SkillPanel id={focus.id} />}
      {focus?.kind === 'sub' && <SubPanel id={focus.id} />}
    </>
  )
}
