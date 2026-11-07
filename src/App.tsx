import { useEffect, useRef, useState } from 'react'
import type { Roadmap } from './types'
import { Tree } from './lib/tree'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppProvider, TREE_URL, useApp } from './state'
import { SkillTree } from './components/SkillTree'
import { Panel } from './components/Panel'
import { Hud } from './components/Hud'
import { Toasts } from './components/Toasts'

/** 全局快捷键：Esc 返回；选中技能时 D 点亮、X 熄灭 */
function Shortcuts() {
  const { focus, home, setFocus, setLit } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') setFocus(home)
      else if (focus?.kind === 'skill') {
        const k = e.key.toLowerCase()
        if (k === 'd') setLit(focus.id, true)
        else if (k === 'x') setLit(focus.id, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, home, setFocus, setLit])
  return null
}

function Shell() {
  const { tree, career, area, openArea, states, focus, setFocus } = useApp()
  // 选中东西就打开面板，取消选中就收起；顶上的进度和最下面的“你”可以单独打开“我的进度”
  const [panelOpen, setPanelOpen] = useState(false)
  const wantOverview = useRef(false)
  useEffect(() => {
    setPanelOpen(focus !== null || wantOverview.current)
    wantOverview.current = false
  }, [focus])
  const openOverview = () => {
    if (focus) {
      wantOverview.current = true
      setFocus(null)
    } else setPanelOpen(true)
  }
  return (
    <div className={`page${panelOpen ? ' panel-open' : ''}`}>
      <Hud onTogglePanel={() => setPanelOpen((o) => !o)} panelOpen={panelOpen} />
      {area && (
        <nav className="tabs" aria-label="领域">
          {tree.roadmap.areas.map((a) => (
            <button key={a.id} className={a.id === area ? 'on' : ''} onClick={() => openArea(a.id)}>
              {a.name}
              <small>{a.skillIds.filter((id) => states.get(id) === 'done').length} / {a.skillIds.length}</small>
            </button>
          ))}
        </nav>
      )}
      {/* 换一个领域就换一棵树：重新长一遍，镜头回到开头 */}
      <SkillTree key={career ?? area} onCenter={openOverview} />
      <aside className="panel" aria-label="详情" aria-hidden={!panelOpen}>
        <div className="panel-body">
          <Panel />
        </div>
        <button className="panel-close" onClick={() => setPanelOpen(false)} aria-label="收起面板">×</button>
      </aside>
      <Toasts />
    </div>
  )
}

export default function App() {
  const [tree, setTree] = useState<Tree | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch(`${TREE_URL}data/roadmap.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`读不到数据（${res.status}）`)
        return res.json() as Promise<Roadmap>
      })
      .then((r) => setTree(new Tree(r)), (e: Error) => setError(e.message))
  }, [])
  if (error) {
    return (
      <div className="boot error">
        <p>加载失败：{error}</p>
        <button onClick={() => location.reload()}>重试</button>
      </div>
    )
  }
  if (!tree) return <div className="boot">加载中</div>
  return (
    <ErrorBoundary>
      <AppProvider tree={tree}>
        <Shortcuts />
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  )
}
