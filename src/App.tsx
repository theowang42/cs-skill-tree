import { useEffect, useMemo, useRef, useState } from 'react'
import type { Roadmap } from './types'
import { Tree } from './lib/tree'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppProvider, TREE_URL, useApp } from './state'
import { SkillTree } from './components/SkillTree'
import { Panel } from './components/Panel'
import { Hud } from './components/Hud'
import { Toasts } from './components/Toasts'
import { layoutTree, type Layout } from './lib/layout'

/** 全局快捷键：Esc 取消选中、收起卡片；选中技能时 D 点亮、X 熄灭 */
function Shortcuts() {
  const { focus, setFocus, setLit } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') setFocus(null)
      else if (focus?.kind === 'skill') {
        const k = e.key.toLowerCase()
        if (k === 'd') setLit(focus.id, true)
        else if (k === 'x') setLit(focus.id, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, setLit])
  return null
}

/** 窗口多大：挑树的方向要用 */
function useWindowSize() {
  const [size, setSize] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const on = () => setSize({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  return size
}

function Shell() {
  const { tree, career, route, area, openArea, states, focus, setFocus } = useApp()
  const mine = route ? tree.closures.get(route)! : null
  // 往上长和往右长各排一遍，挑在这块屏幕上画得更大的（树的地方大约是窗口减去顶栏和页签；都能按原大小画就往上长）
  const win = useWindowSize()
  const layouts = useMemo(() => {
    const view = career ? { career } : { area: area! }
    return [layoutTree(tree, view, 'up'), layoutTree(tree, view, 'right')]
  }, [tree, career, area])
  const scale = ({ bounds: b }: Layout) => Math.min(1, win.w / (b.maxX - b.minX), (win.h - 100) / (b.maxY - b.minY))
  const layout = scale(layouts[1]) > scale(layouts[0]) ? layouts[1] : layouts[0]
  // 选中东西就打开面板，取消选中就收起；最下面的“你”可以单独打开“我的进度”
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
      <Hud />
      {area && (
        <nav className="tabs" aria-label="领域">
          {tree.roadmap.areas.map((a) => {
            // 选定了路线：数的是路线要学的；这个领域路线一个都不要，就不写数、字变浅
            const ids = mine ? a.skillIds.filter((id) => mine.has(id)) : a.skillIds
            return (
              <button key={a.id} className={`${a.id === area ? 'on' : ''}${ids.length ? '' : ' off'}`} onClick={() => openArea(a.id)}>
                {a.name}
                {ids.length > 0 && <small>{ids.filter((id) => states.get(id) === 'done').length} / {ids.length}</small>}
              </button>
            )
          })}
        </nav>
      )}
      {/* 换一个领域或者换了方向就换一棵树：重新长一遍，镜头回到开头 */}
      <SkillTree key={`${career ?? area}-${layout.orient}`} layout={layout} onCenter={openOverview} />
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
