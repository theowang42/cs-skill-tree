import { useEffect, useRef, useState } from 'react'
import type { Progress, Roadmap } from './types'
import { Tree, enforcePrerequisites } from './lib/tree'
import { createStore, roadmapUrl, sanitize, USE_API, type ProgressStore } from './lib/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { decodeShare } from './lib/share'
import { AppProvider, useApp, type Focus, type FocusKind } from './state'
import { SkillTree } from './components/SkillTree'
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
  if (!res.ok) throw new Error(`读不到数据（${res.status}）`)
  const tree = new Tree((await res.json()) as Roadmap)
  const store = createStore()
  const skills = new Set(tree.skills.keys())
  const subs = new Set(tree.subs.keys())
  // 内容更新后，存着的进度里可能有已删除的技能或方向、或者前置改了没点亮，清掉并写回
  const loaded = sanitize(await store.load(), skills, subs)
  const enforced = enforcePrerequisites(tree, loaded.progress)
  const progress = enforced.progress
  if ((loaded.dropped.length || enforced.dropped.length) && store.kind === 'local') await store.replace(progress, skills)
  const decoded = decodeShare(tree, location.hash)
  const shared = decoded && enforcePrerequisites(tree, sanitize(decoded, skills, subs).progress).progress
  // 地址栏里的 #/skill/http 这类链接
  const m = /^#\/(skill|area|sub|category)\/([a-z0-9-]+)$/.exec(location.hash)
  const known = m && { skill: tree.skills, area: tree.areas, sub: tree.subs, category: tree.categories }[m[1] as FocusKind].has(m[2])
  return { tree, store, progress, shared, focus: known ? { kind: m![1] as FocusKind, id: m![2] } : null }
}

/** 全局快捷键：Esc 返回；选中技能时 D 点亮、X 取消 */
function Shortcuts() {
  const { focus, setFocus, setStatus, readOnly } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]') !== null
      if (typing) return
      if (e.key === 'Escape') setFocus(null)
      else if (focus?.kind === 'skill' && !readOnly) {
        const k = e.key.toLowerCase()
        if (k === 'd') setStatus(focus.id, 'done')
        else if (k === 'x') setStatus(focus.id, null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, setStatus, readOnly])
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
  const { focus, setFocus } = useApp()
  // 面板默认收起：第一次来只看到星图和圆心旁的提示
  const [panelOpen, setPanelOpen] = useState(false)
  // 选中东西就打开面板，取消选中就收起；顶上的名字可以单独打开“我的进度”
  // 点圆心的“你”：回到“我的进度”并打开面板
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
      <SkillTree onCenter={openOverview} />
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
  if (!data) return <div className="boot">加载中</div>
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
