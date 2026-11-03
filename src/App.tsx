import { useEffect, useState } from 'react'
import type { Progress, Roadmap } from './types'
import { Tree } from './lib/tree'
import { createStore, roadmapUrl, USE_API, type ProgressStore } from './lib/store'
import { decodeShare } from './lib/share'
import { AppProvider, useApp, type Focus, type FocusKind } from './state'
import { TreeView } from './components/TreeView'
import { Panel } from './components/Panel'
import { Toolbar } from './components/Toolbar'
import { Toasts } from './components/Toasts'

interface Loaded {
  tree: Tree
  store: ProgressStore
  progress: Progress
  shared: Progress | null
  focus: Focus
}

async function load(): Promise<Loaded> {
  const res = await fetch(roadmapUrl())
  if (!res.ok) throw new Error(`读不到技能树数据（${res.status}）`)
  const tree = new Tree((await res.json()) as Roadmap)
  const store = createStore()
  const progress = await store.load()
  const shared = decodeShare(tree, location.hash)
  // 地址栏里的 #/skill/http 这类链接
  const m = /^#\/(skill|area|sub|category)\/([a-z0-9-]+)$/.exec(location.hash)
  const known = m && { skill: tree.skills, area: tree.areas, sub: tree.subs, category: tree.categories }[m[1] as FocusKind].has(m[2])
  return { tree, store, progress, shared, focus: known ? { kind: m![1] as FocusKind, id: m![2] } : null }
}

/** 全局快捷键：Esc 返回；选中技能时 D / L / X 改状态；Q 切换快速点亮 */
function Shortcuts() {
  const { focus, setFocus, setStatus, readOnly, quick, setQuick } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]') !== null
      if (typing) return
      if (e.key === 'Escape') setFocus(null)
      else if ((e.key === 'q' || e.key === 'Q') && !readOnly) setQuick(!quick)
      else if (focus?.kind === 'skill' && !readOnly) {
        const k = e.key.toLowerCase()
        if (k === 'd') setStatus(focus.id, 'done')
        else if (k === 'l') setStatus(focus.id, 'learning')
        else if (k === 'x') setStatus(focus.id, null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, setStatus, readOnly, quick, setQuick])
  return null
}

function InitialFocus({ focus }: { focus: Focus }) {
  const { setFocus } = useApp()
  useEffect(() => {
    if (focus) setFocus(focus, { scroll: true })
    // 只在第一次加载时跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function Shell() {
  const { focus, quick, readOnly } = useApp()
  const [sheetOpen, setSheetOpen] = useState(false)
  // 窄屏上选中东西时自动拉起底部面板
  useEffect(() => {
    if (focus) setSheetOpen(true)
  }, [focus])
  return (
    <div className={`page${quick && !readOnly ? ' quick-mode' : ''}`}>
      <aside className={`panel${sheetOpen ? ' open' : ''}`} aria-label="详情">
        <header className="panel-head">
          <h1>
            <span aria-hidden>🌲</span> cs-skill-tree
          </h1>
          <span className="store-kind" title={USE_API ? '进度存在服务器数据库' : '进度存在这台设备的浏览器'}>{USE_API ? '云端' : '本地'}</span>
          <button className="sheet-toggle" onClick={() => setSheetOpen(!sheetOpen)} aria-label={sheetOpen ? '收起面板' : '展开面板'}>
            {sheetOpen ? '▾' : '▴'}
          </button>
        </header>
        <div className="panel-body">
          <Panel />
        </div>
      </aside>
      <main className="main">
        <Toolbar />
        {quick && !readOnly && (
          <p className="quick-banner">
            快速点亮中：点技能直接切换 <b>没学 → 学会了 → 在学 → 没学</b>。从最下面的基础层开始最顺。
          </p>
        )}
        <TreeView />
      </main>
      <Toasts />
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    load().then(setData, (e: Error) => setError(e.message))
  }, [])
  if (error) {
    return (
      <div className="boot error">
        <p>加载失败：{error}</p>
        <button onClick={() => location.reload()}>重试</button>
      </div>
    )
  }
  if (!data) return <div className="boot">🌲 正在加载技能树…</div>
  return (
    <AppProvider tree={data.tree} store={data.store} initial={data.progress} shared={data.shared}>
      <InitialFocus focus={data.focus} />
      <Shortcuts />
      <Shell />
    </AppProvider>
  )
}
