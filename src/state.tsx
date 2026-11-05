// 全局状态：树、进度、推导出的四种状态、当前焦点，以及所有会改进度的动作。
// 组件通过 useApp() 拿到它们。改进度一律走 change()：先乐观更新界面，再写进存储；
// 同时算出“新解锁了哪些技能”给树上做动画，并留一份撤销。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Progress, Readiness, SkillState, Status } from './types'
import { Tree, computeStates, enforcePrerequisites, isReached, planFor, readiness } from './lib/tree'
import { applyChanges, sanitize, type Changes, type ProgressStore } from './lib/store'
import { decodeShare } from './lib/share'

export type FocusKind = 'skill' | 'area' | 'sub' | 'category'
export type Focus = { kind: FocusKind; id: string } | null

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

interface ChangeOptions {
  /** 提示里显示的话；不给就自动生成 */
  message?: string
  /** 是否在提示里给“撤销” */
  undo?: boolean
}

export interface AppState {
  tree: Tree
  store: ProgressStore
  /** 当前显示的进度：自己的，或者分享链接里别人的 */
  progress: Progress
  states: Map<string, SkillState>
  readinessBySub: Map<string, Readiness>
  /** 正在看别人的分享，不能改 */
  readOnly: boolean
  shared: Progress | null
  leaveShared: () => void
  adoptShared: () => void

  focus: Focus
  /** opts.scroll：让星图飞过去 */
  setFocus: (f: Focus, opts?: { scroll?: boolean }) => void
  /** 每次要求星图飞到焦点时 +1，星图据此触发动画 */
  flyRequest: number
  hover: string | null
  setHover: (id: string | null) => void
  /** 页面上高亮的方向：正在看的细分方向，否则是目标 */
  activeSubId: string | null
  openCategory: string | null
  setOpenCategory: (id: string | null) => void

  /** 刚刚解锁或点亮的技能，树上闪一下 */
  pulse: Set<string>

  change: (changes: Changes, opts?: ChangeOptions) => void
  setStatus: (id: string, status: Status | null) => void
  /** 连同所有没点亮的前置一起点亮 */
  setGoal: (subId: string | null) => void
  replaceProgress: (p: Progress) => Promise<void>
  resetProgress: () => Promise<void>

  toasts: Toast[]
  toast: (text: string, action?: Toast['action']) => void
  dismissToast: (id: number) => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp 必须在 AppProvider 里用')
  return v
}

export function AppProvider({
  tree, store, initial, shared: initialShared, children,
}: { tree: Tree; store: ProgressStore; initial: Progress; shared: Progress | null; children: ReactNode }) {
  const [own, setOwn] = useState<Progress>(initial)
  const [shared, setShared] = useState<Progress | null>(initialShared)
  const progress = shared ?? own
  const readOnly = shared !== null
  const states = useMemo(() => computeStates(tree, progress), [tree, progress])
  const readinessBySub = useMemo(
    () => new Map(tree.roadmap.subs.map((s) => [s.id, readiness(tree, s.id, progress)])),
    [tree, progress],
  )

  const [focus, setFocusState] = useState<Focus>(null)
  const [flyRequest, setFlyRequest] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const [pulse, setPulse] = useState<Set<string>>(new Set())
  const pulseTimer = useRef<number>(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((text: string, action?: Toast['action']) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-1), { id, text, action }])
    window.setTimeout(() => dismissToast(id), action ? 7000 : 3500)
  }, [dismissToast])

  const setFocus = useCallback((f: Focus, opts?: { scroll?: boolean }) => {
    setFocusState(f)
    if (f?.kind === 'sub') setOpenCategory(tree.subs.get(f.id)!.categoryId)
    if (f?.kind === 'category') setOpenCategory(f.id)
    if (f && opts?.scroll) setFlyRequest((n) => n + 1)
  }, [tree])

  // 当前焦点同步到地址栏，方便复制链接和刷新后回到原处（看分享时不动地址栏）
  useEffect(() => {
    if (readOnly) return
    const hash = focus ? `#/${focus.kind}/${focus.id}` : ''
    if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search)
  }, [focus, readOnly])


  const ownRef = useRef(own)
  ownRef.current = own
  // 去掉已删除的技能，再去掉前置没点亮的点亮记录
  const clean = useCallback((p: Progress) => {
    const a = sanitize(p, new Set(tree.skills.keys()), new Set(tree.subs.keys()))
    const b = enforcePrerequisites(tree, a.progress)
    return { progress: b.progress, dropped: [...a.dropped, ...b.dropped] }
  }, [tree])
  const setOwnNow = useCallback((p: Progress) => {
    ownRef.current = p
    setOwn(p)
  }, [])

  // 存储失败时，用存储里的真实数据纠正界面
  const resync = useCallback((e: unknown) => {
    toast(`保存失败：${(e as Error).message}`)
    store.load().then((p) => setOwnNow(clean(p).progress)).catch(() => undefined)
  }, [store, toast, clean, setOwnNow])

  // 别的标签页改了进度，这里跟着刷新
  useEffect(() => store.subscribe?.(() => {
    store.load().then((p) => setOwnNow(clean(p).progress)).catch(() => undefined)
  }), [store, clean, setOwnNow])

  // 加载后再改地址栏（粘贴链接、前进后退）也要生效
  useEffect(() => {
    const onHash = () => {
      const h = location.hash
      const s = decodeShare(tree, h)
      if (s) {
        setShared(clean(s).progress)
        return
      }
      const m = /^#\/(skill|area|sub|category)\/([a-z0-9-]+)$/.exec(h)
      if (m) {
        const kind = m[1] as FocusKind
        const known = { skill: tree.skills, area: tree.areas, sub: tree.subs, category: tree.categories }[kind].has(m[2])
        if (known) setFocus({ kind, id: m[2] }, { scroll: true })
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [tree, clean, setFocus])

  const change = useCallback((changes: Changes, opts: ChangeOptions = {}) => {
    if (readOnly) return
    const before = ownRef.current
    // 按规则算：前置没点亮的不能点亮；取消一个，依赖它的一起熄灭
    const plan = planFor(tree, before, changes)
    if (plan.blocked.length) {
      const { id, missing } = plan.blocked[0]
      const names = missing.map((m) => `「${tree.skill(m).name}」`).join('')
      toast(`先点亮${names}，才能点亮「${tree.skill(id).name}」`, { label: '去前置', run: () => setFocus({ kind: 'skill', id: missing[0] }, { scroll: true }) })
      return
    }
    const real: Changes = plan.diff
    const ids = Object.keys(real)
    if (!ids.length) return
    const after = applyChanges(before, real)
    const prevStates = computeStates(tree, before)
    const nextStates = computeStates(tree, after)
    // 立刻更新 ref：同一帧里连续两次改动（快速点击、点亮前置）要基于最新的进度算
    ownRef.current = after
    setOwn(after)
    store.apply(real).catch(resync)

    // 新点亮的和新解锁的，闪一下；新达成的职业放一次大的庆祝
    const lit = ids.filter((id) => real[id] === 'done')
    const unlocked = [...nextStates].filter(([id, s]) => s === 'available' && prevStates.get(id) === 'locked').map(([id]) => id)
    const reached = tree.roadmap.subs.filter((s) => isReached(tree, s.id, after) && !isReached(tree, s.id, before))
    setPulse(new Set([...lit, ...unlocked, ...reached.map((s) => `sub:${s.id}`)]))
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => setPulse(new Set()), 1600)

    const inverse: Changes = {}
    for (const id of ids) inverse[id] = before.skills[id]?.status ?? null
    const undo = () => {
      setOwnNow(applyChanges(ownRef.current, inverse))
      store.apply(inverse).catch(resync)
    }
    let text = opts.message
    if (!text && reached.length) text = `达成职业：${reached.map((s) => `「${s.name}」`).join('')}`
    const undoable = opts.undo || plan.cascaded.length > 0
    if (!text && plan.cascaded.length) {
      const names = plan.cascaded.slice(0, 3).map((id) => tree.skill(id).name).join('、')
      text = `依赖它的 ${plan.cascaded.length} 个技能也一起熄灭了：${names}${plan.cascaded.length > 3 ? ' 等' : ''}`
    }
    if (!text && unlocked.length) {
      const names = unlocked.slice(0, 3).map((id) => tree.skill(id).name).join('、')
      text = `解锁了 ${unlocked.length} 个新技能：${names}${unlocked.length > 3 ? ' 等' : ''}`
    }
    if (text || undoable) toast(text ?? `改了 ${ids.length} 个技能`, undoable ? { label: '撤销', run: undo } : undefined)
  }, [readOnly, tree, store, resync, toast, setOwnNow, setFocus])

  const setStatus = useCallback((id: string, status: Status | null) => change({ [id]: status }), [change])

  const setGoal = useCallback((subId: string | null) => {
    if (readOnly) return
    setOwn((p) => ({ ...p, goalSubId: subId }))
    store.setGoal(subId).catch(resync)
    if (subId) toast(`目标设为「${tree.subs.get(subId)!.name}」`)
  }, [readOnly, store, resync, toast, tree])

  /** 整体换掉进度，提示里可以撤销回原来的 */
  const restore = useCallback((backup: Progress) => {
    store.replace(backup, new Set(tree.skills.keys()))
      .then(() => store.load())
      .then((p) => setOwnNow(clean(p).progress))
      .catch(resync)
  }, [store, tree, clean, setOwnNow, resync])

  const replaceProgress = useCallback(async (p: Progress) => {
    const backup = ownRef.current
    const { progress: cleaned, dropped } = clean(p)
    await store.replace(cleaned, new Set(tree.skills.keys()))
    setOwnNow(clean(await store.load()).progress)
    const n = Object.keys(cleaned.skills).length
    toast(`已导入 ${n} 个技能的进度${dropped.length ? `，跳过了 ${dropped.length} 个（已不存在，或前置没点亮）` : ''}`, { label: '撤销', run: () => restore(backup) })
  }, [store, tree, toast, clean, setOwnNow, restore])

  const resetProgress = useCallback(async () => {
    const backup = ownRef.current
    await store.reset()
    setOwnNow(await store.load())
    toast('进度已清空', { label: '撤销', run: () => restore(backup) })
  }, [store, toast, setOwnNow, restore])

  const leaveShared = useCallback(() => {
    setShared(null)
    history.replaceState(null, '', location.pathname + location.search)
  }, [])
  const adoptShared = useCallback(() => {
    if (!shared) return
    // 分享链接里没有时间，按现在算
    const now = new Date().toISOString()
    const p: Progress = { ...shared, skills: Object.fromEntries(Object.entries(shared.skills).map(([k, e]) => [k, { ...e, updatedAt: now }])) }
    setShared(null)
    history.replaceState(null, '', location.pathname + location.search)
    // 导入的提示里带“撤销”，点错了能换回来
    replaceProgress(p).catch((e: Error) => toast(`导入失败：${e.message}`))
  }, [shared, replaceProgress, toast])

  const activeSubId = focus?.kind === 'sub' ? focus.id : progress.goalSubId

  const value: AppState = {
    tree, store, progress, states, readinessBySub, readOnly, shared, leaveShared, adoptShared,
    focus, setFocus, flyRequest, hover, setHover, activeSubId, openCategory, setOpenCategory,
    pulse,
    change, setStatus, setGoal, replaceProgress, resetProgress,
    toasts, toast, dismissToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
