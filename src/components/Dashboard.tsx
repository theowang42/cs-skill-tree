// 我的进度：几个数、目标、下一个、数据。就这些。
import { useRef, useState } from 'react'
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'
import { parseFile, toFile } from '../lib/store'
import { encodeShare } from '../lib/share'
import { Meter } from './common'

export function Dashboard() {
  const { tree, states, progress, readinessBySub, setFocus, readOnly, replaceProgress, resetProgress, store, toast } = useApp()
  const t = totals(states)
  const goal = progress.goalSubId ? tree.subs.get(progress.goalSubId)! : null
  const r = goal ? readinessBySub.get(goal.id)! : null
  const next = frontier(tree, states, progress.goalSubId).slice(0, 5)
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
      toast('链接已复制，别人打开能看到你点亮的技能')
    } catch {
      window.prompt('复制这个链接：', url)
    }
  }

  return (
    <div className="detail">
      <p className="eyebrow">我的进度</p>
      <div className="stats">
        <div><b>{t.done}</b><span>已掌握</span></div>
        <div><b>{t.learning}</b><span>在学</span></div>
        <div><b>{t.available}</b><span>能学</span></div>
        <div><b>{t.locked}</b><span>还够不着</span></div>
      </div>
      <Meter value={t.done} partial={t.learning} max={t.total} />

      <h4>目标</h4>
      {goal && r ? (
        <>
          <button className="row-link big" onClick={() => setFocus({ kind: 'sub', id: goal.id }, { scroll: true })}>
            <span>{goal.name}</span>
            <small>{Math.round(r.percent)}%</small>
          </button>
          <Meter value={r.coreDone + r.choiceDone} partial={r.coreLearning} max={r.coreTotal + r.choiceTotal} />
        </>
      ) : (
        <ul className="plain-list">
          {tree.roadmap.subs.filter((s) => s.isHot).map((s) => (
            <li key={s.id}>
              <button className="row-link" onClick={() => setFocus({ kind: 'sub', id: s.id }, { scroll: true })}>
                <span>{s.name}</span>
              </button>
            </li>
          ))}
          <li>
            <button className="row-link" onClick={() => setFocus({ kind: 'category', id: tree.roadmap.categories[0].id })}>
              <span>全部方向（也画在树的枝头 ◇）→</span>
            </button>
          </li>
        </ul>
      )}

      {next.length > 0 && (
        <>
          <h4>下一个可以学</h4>
          <ul className="plain-list">
            {next.map((f) => (
              <li key={f.id}>
                <button className="row-link" onClick={() => setFocus({ kind: 'skill', id: f.id }, { scroll: true })}>
                  <span>{tree.skill(f.id).name}</span>
                  <small>{tree.containerName(f.id)}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!readOnly && (
        <>
          <h4>数据</h4>
          <p className="note">{store.where}</p>
          <div className="row-actions wrap">
            <button onClick={share}>分享链接</button>
            <button onClick={exportFile}>导出</button>
            <button onClick={() => file.current?.click()}>导入</button>
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
        </>
      )}
    </div>
  )
}
