import { useEffect, useState } from 'react'
import type { Progress, Roadmap } from './types'
import { Tree } from './lib/tree'
import { createStore, roadmapUrl, sanitize, USE_API, type ProgressStore } from './lib/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { decodeShare } from './lib/share'
import { AppProvider, useApp, type Focus, type FocusKind } from './state'
import { StarMap } from './components/StarMap'
import { Panel } from './components/Panel'
import { Hud } from './components/Hud'
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
  if (!res.ok) throw new Error(`读不到星图数据（${res.status}）`)
  const tree = new Tree((await res.json()) as Roadmap)
  const store = createStore()
  const skills = new Set(tree.skills.keys())
  const subs = new Set(tree.subs.keys())
  // 内容更新后，存着的进度里可能有已删除的技能或方向，清掉并写回
  const loaded = sanitize(await store.load(), skills, subs)
  const progress = loaded.progress
  if (loaded.dropped.length && store.kind === 'local') await store.replace(progress, skills)
  const decoded = decodeShare(tree, location.hash)
  const shared = decoded && sanitize(decoded, skills, subs).progress
  // 地址栏里的 #/skill/http 这类链接
  const m = /^#\/(skill|area|sub|category)\/([a-z0-9-]+)$/.exec(location.hash)
  const known = m && { skill: tree.skills, area: tree.areas, sub: tree.subs, category: tree.categories }[m[1] as FocusKind].has(m[2])
  return { tree, store, progress, shared, focus: known ? { kind: m![1] as FocusKind, id: m![2] } : null }
}

/** 全局快捷键：Esc 返回；选中星时 D / L / X 改状态；Q 切换快速点亮 */
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
    if (focus) window.setTimeout(() => setFocus(focus, { scroll: true }), 50)
    // 只在第一次加载时跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function Shell() {
  const { focus } = useApp()
  // 面板默认收起：第一次来只看到星图和圆心旁的提示
  const [panelOpen, setPanelOpen] = useState(false)
  useEffect(() => {
    if (focus) setPanelOpen(true)
  }, [focus])
  return (
    <div className={`page${panelOpen ? ' panel-open' : ''}`}>
      <StarMap />
      <Hud onTogglePanel={() => setPanelOpen((o) => !o)} panelOpen={panelOpen} />
      <aside className="panel" aria-label="详情" aria-hidden={!panelOpen}>
        <div className="panel-body">
          <Panel />
        </div>
        <button className="panel-close" onClick={() => setPanelOpen(false)} aria-label="收起面板">×</button>
      </aside>
      <span className="store-kind" title={USE_API ? '进度存在服务器数据库' : '进度存在这台设备的浏览器'}>{USE_API ? '云端' : '本地'}</span>
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
  if (!data) return <div className="boot">正在展开星图…</div>
  return (
    <ErrorBoundary>
      <AppProvider tree={data.tree} store={data.store} initial={data.progress} shared={data.shared}>
        <InitialFocus focus={data.focus} />
        <Shortcuts />
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  )
}
