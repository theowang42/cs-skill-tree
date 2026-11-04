// 什么都没选时左栏显示的“我的技能树”：总进度、目标、能力边界、最近的方向、最近点亮
import { useRef, useState } from 'react'
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'
import { ago } from '../lib/format'
import { parseFile, readStorage, toFile, writeStorage } from '../lib/store'
import { encodeShare } from '../lib/share'
import { Meter, Section, SkillChip, StateDot, SubChip } from './common'

const INTRO_KEY = 'cs-skill-tree:intro-done'

function Welcome({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const { tree } = useApp()
  return (
    <div className="welcome">
      <h3>你在星图的中心</h3>
      <p>
        黑暗里一共有 {tree.roadmap.skills.length} 颗星，越靠内越基础。点亮你会的，光会照出旁边能学的星，那就是你的<b>能力边界</b>。
      </p>
      <p>远处的信标是职业方向。哪片星域亮了，你就离哪个方向近。</p>
      <div className="row-actions">
        <button className="primary" onClick={onStart}>开始自评（约 3 分钟）</button>
        <button onClick={onClose}>先随便看看</button>
      </div>
    </div>
  )
}

function DataActions() {
  const { progress, replaceProgress, resetProgress, store, tree, toast, readOnly } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const exportFile = () => {
    const blob = new Blob([JSON.stringify(toFile(progress), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cs-skill-tree-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importFile = async (f: File) => {
    try {
      await replaceProgress(parseFile(await f.text()))
    } catch (e) {
      toast(`导入失败：${(e as Error).message}`)
    }
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}#${encodeShare(tree, progress)}`
    try {
      await navigator.clipboard.writeText(url)
      toast('分享链接已复制。别人打开会看到你点亮的技能（只读）')
    } catch {
      window.prompt('复制这个链接分享出去：', url)
    }
  }
  if (readOnly) return null
  return (
    <Section title="我的数据">
      <p className="muted small">{store.where}</p>
      <div className="row-actions wrap">
        <button onClick={share}>复制分享链接</button>
        <button onClick={exportFile}>导出进度</button>
        <button onClick={() => file.current?.click()}>导入进度</button>
        {confirmReset ? (
          <>
            <button className="danger" onClick={() => { setConfirmReset(false); void resetProgress() }}>确定清空</button>
            <button onClick={() => setConfirmReset(false)}>算了</button>
          </>
        ) : (
          <button onClick={() => setConfirmReset(true)}>清空</button>
        )}
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = '' }} />
    </Section>
  )
}

export function Dashboard() {
  const app = useApp()
  const { tree, states, progress, readinessBySub, setFocus, setQuick, readOnly, change } = app
  const [intro, setIntro] = useState(() => !readStorage(INTRO_KEY))
  const [showAllFrontier, setShowAllFrontier] = useState(false)
  const t = totals(states)
  const goal = progress.goalSubId ? tree.subs.get(progress.goalSubId)! : null
  const goalReady = goal ? readinessBySub.get(goal.id)! : null
  const front = frontier(tree, states, progress.goalSubId)
  const goalFront = front.filter((f) => f.inGoal)
  const learning = [...states].filter(([, s]) => s === 'learning').map(([id]) => id)
  const closest = [...readinessBySub.values()].filter((r) => r.subId !== progress.goalSubId && r.percent > 0).sort((a, b) => b.percent - a.percent).slice(0, 4)
  const recent = Object.entries(progress.skills).filter(([, e]) => e.status === 'done' && e.updatedAt).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)).slice(0, 6)
  const hot = tree.roadmap.subs.filter((s) => s.isHot)

  const closeIntro = () => {
    setIntro(false)
    writeStorage(INTRO_KEY, '1')
  }
  const startAssessment = () => {
    closeIntro()
    setQuick(true)
    setFocus({ kind: 'area', id: 'programming' }, { scroll: true })
  }

  const shownFront = showAllFrontier ? front : front.slice(0, goal ? 8 : 12)

  return (
    <div className="detail dashboard">
      {intro && t.done === 0 && !readOnly && <Welcome onStart={startAssessment} onClose={closeIntro} />}

      <div className="stats">
        <div>
          <b>{t.done}</b>
          <span>已掌握</span>
        </div>
        <div>
          <b>{t.learning}</b>
          <span>在学</span>
        </div>
        <div className="accent">
          <b>{t.available}</b>
          <span>能力边界</span>
        </div>
        <div>
          <b>{t.total}</b>
          <span>全部技能</span>
        </div>
      </div>
      <Meter value={t.done} partial={t.learning} max={t.total} label="总进度" />

      <Section title={readOnly ? '对方的目标' : '我的目标'}>
        {goal && goalReady ? (
          <div className="goal-card">
            <button className="goal-name" onClick={() => setFocus({ kind: 'sub', id: goal.id }, { scroll: true })}>
              <span>{tree.categories.get(goal.categoryId)!.name} ›</span> {goal.name}
            </button>
            <div className="goal-meter">
              <Meter value={goalReady.coreDone + goalReady.choiceDone} partial={goalReady.coreLearning} max={goalReady.coreTotal + goalReady.choiceTotal} />
              <b>{Math.round(goalReady.percent)}%</b>
            </div>
            <p className="muted small">
              必学 {goalReady.coreTotal} 个技能已掌握 {goalReady.coreDone} 个
              {goalReady.choiceTotal > 0 && `，任选 ${goalReady.choiceTotal} 组已满足 ${goalReady.choiceDone} 组`}
            </p>
            {goalFront.length > 0 ? (
              <>
                <p className="label">下一步可以学</p>
                <div className="chips">
                  {goalFront.slice(0, 6).map((f) => <SkillChip key={f.id} id={f.id} note={`第${f.step}步`} />)}
                </div>
              </>
            ) : goalReady.percent >= 100 ? (
              <p className="success">这个方向要求的技能你都掌握了。可以去做真实项目了！</p>
            ) : (
              <p className="muted small">目标里的技能要么在学，要么前置还没满足。先把在学的学完吧。</p>
            )}
          </div>
        ) : (
          <>
            <p className="muted">还没选目标。选一个想去的方向，树上会标出要学的技能和顺序。</p>
            <div className="chips">{hot.map((s) => <SubChip key={s.id} id={s.id} />)}</div>
          </>
        )}
      </Section>

      {learning.length > 0 && (
        <Section title={`正在学 · ${learning.length}`}>
          <div className="chips">{learning.map((id) => <SkillChip key={id} id={id} />)}</div>
        </Section>
      )}

      <Section
        title={`能力边界 · ${front.length}`}
        aside={<span className="muted small">前置都会了、自己还没学的</span>}
      >
        <ul className="frontier">
          {shownFront.map((f) => {
            const s = tree.skill(f.id)
            return (
              <li key={f.id}>
                <button className="frontier-name" onClick={() => setFocus({ kind: 'skill', id: f.id }, { scroll: true })}>
                  <StateDot state="available" />
                  <span>{s.name}</span>
                  <small>{f.inGoal ? `目标第 ${f.step} 步` : tree.containerName(f.id)}</small>
                </button>
                {!readOnly && (
                  <span className="frontier-actions">
                    <button title="标为在学" onClick={() => change({ [f.id]: 'learning' })}>在学</button>
                    <button title="标为已掌握" onClick={() => change({ [f.id]: 'done' })}>会了</button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        {front.length > shownFront.length && (
          <button className="link-button" onClick={() => setShowAllFrontier(true)}>显示全部 {front.length} 个</button>
        )}
      </Section>

      {closest.length > 0 && (
        <Section title="离你最近的方向">
          <ul className="readiness-list">
            {closest.map((r) => (
              <li key={r.subId}>
                <button onClick={() => setFocus({ kind: 'sub', id: r.subId }, { scroll: true })}>
                  <span>{tree.subs.get(r.subId)!.name}</span>
                  <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} />
                  <small>{Math.round(r.percent)}%</small>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="最近点亮">
          <ul className="recent">
            {recent.map(([id, e]) => (
              <li key={id}>
                <SkillChip id={id} />
                <small className="muted">{ago(e.updatedAt)}</small>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <DataActions />
    </div>
  )
}
