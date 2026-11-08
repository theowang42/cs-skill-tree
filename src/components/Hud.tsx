// 顶栏：左边房子（回首页）、这一页是哪棵树（职业名或“全部技能”）和它的进度；右边一行小字，去另一棵树，正选中的技能跟着过去；职业树上还有一个“换岗位”按钮，回首页重新选。
// 职业天赋树是主角：进度数的是这个职业要学的；全部技能是次要的，入口只是一行灰字。
import { TREE_URL, HOME_URL, useApp } from '../state'
import { totals } from '../lib/tree'

export function Hud() {
  const { tree, career, route, focus, states, progressBySub } = useApp()
  const t = career ? progressBySub.get(career)! : totals(states)
  const skill = focus?.kind === 'skill' ? focus.id : null
  const at = (keep: boolean) => (skill && keep ? `#/skill/${skill}` : '')

  return (
    <header className="hud">
      <div className="brand">
        <a className="home-link" href={HOME_URL} aria-label="首页">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path d="M15 21v-8a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v8" />
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </a>
        <h1 className="brand-name">{career ? tree.subs.get(career)!.name : '全部技能'}</h1>
        <span className="brand-count">
          <b>{t.done}</b> / {t.total}
        </span>
      </div>
      {career ? (
        <nav className="hud-right">
          <a className="switch" href={`${TREE_URL}index.html${at(true)}`}>全部技能</a>
          <a className="repick" href={HOME_URL}>换岗位</a>
        </nav>
      ) : (
        route && (
          <a className="switch" href={`${TREE_URL}../career/${route}/index.html${at(tree.closures.get(route)!.has(skill ?? ''))}`}>
            回到{tree.subs.get(route)!.name}
          </a>
        )
      )}
    </header>
  )
}
