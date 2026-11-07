import { useApp } from '../state'
import { Dashboard } from './Dashboard'
import { SkillPanel } from './SkillPanel'
import { SubPanel } from './SubPanel'
import { CareersPanel } from './CareersPanel'

export function Panel() {
  const { focus, setFocus, readOnly, leaveShared, adoptShared } = useApp()
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
      {focus && (
        <button className="back-link" onClick={() => setFocus(null)}>
          ← 我的进度
        </button>
      )}
      {!focus && <Dashboard />}
      {focus?.kind === 'skill' && <SkillPanel id={focus.id} />}
      {focus?.kind === 'sub' && <SubPanel id={focus.id} />}
      {focus?.kind === 'careers' && <CareersPanel />}
    </>
  )
}
