// 我的进度：几个数、离得最近的职业、下一个可以学的、数据。
import { useRef, useState } from 'react'
import { useApp } from '../state'
import { frontier, totals } from '../lib/tree'
import { parseFile, toFile } from '../lib/progress'
import { encodeShare } from '../lib/share'
import { Meter } from './common'
import { HOME } from './Hud'

export function Dashboard() {
  const { tree, lit, steps, states, progressBySub, setFocus, readOnly, replace, reset, toast } = useApp()
  const t = totals(states)
  // 还差得最少的三个职业
  const closest = tree.roadmap.subs
    .map((sub) => ({ sub, p: progressBySub.get(sub.id)! }))
    .sort((a, b) => a.p.total - a.p.done - (b.p.total - b.p.done) || b.p.done - a.p.done)
    .slice(0, 3)
  const next = frontier(tree, states).slice(0, 5)
  const file = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportFile = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([toFile({ lit, steps })], { type: 'application/json' }))
    a.download = `cs-skill-tree-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importFile = async (f: File) => {
    try {
      replace(parseFile(await f.text()))
    } catch (e) {
      toast(`导入失败：${(e as Error).message}`)
    }
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}${encodeShare(tree, lit)}`
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
        <div><b>{t.done}</b><span>已点亮</span></div>
        <div><b>{t.available}</b><span>能点亮</span></div>
        <div><b>{t.locked}</b><span>还够不着</span></div>
      </div>
      <Meter value={t.done} max={t.total} />

      <h4>离得最近的职业</h4>
      <ul className="plain-list">
        {closest.map(({ sub, p }) => (
          <li key={sub.id}>
            <button className="row-link" onClick={() => setFocus({ kind: 'sub', id: sub.id }, { scroll: true })}>
              <span>{p.done === p.total ? '★ ' : ''}{sub.name}</span>
              <small>{p.done === p.total ? '已达成' : `${p.done} / ${p.total}`}</small>
            </button>
          </li>
        ))}
        <li>
          <a className="row-link" href={`${HOME}#careers`}>
            <span>全部职业 →</span>
          </a>
        </li>
      </ul>

      {next.length > 0 && (
        <>
          <h4>下一个可以学</h4>
          <ul className="plain-list">
            {next.map((id) => (
              <li key={id}>
                <button className="row-link" onClick={() => setFocus({ kind: 'skill', id }, { scroll: true })}>
                  <span>{tree.skill(id).name}</span>
                  <small>{tree.areas.get(tree.skill(id).areaId)!.name}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!readOnly && (
        <>
          <h4>数据</h4>
          <p className="note">进度保存在这台设备的浏览器里。换设备前记得导出。</p>
          <div className="row-actions wrap">
            <button onClick={share}>分享链接</button>
            <button onClick={exportFile}>导出</button>
            <button onClick={() => file.current?.click()}>导入</button>
            {confirmReset ? (
              <>
                <button className="danger" onClick={() => { setConfirmReset(false); reset() }}>确定清空</button>
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
