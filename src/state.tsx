// 全局状态：树、点亮了哪些、推导出的状态、当前焦点，以及所有会改进度的动作。组件通过 useApp() 拿到它们。
// 改进度一律走 setLit()：按规则算出新的点亮集合，存进浏览器，同时算出“新解锁了哪些”给树上做动画。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SkillState } from './types'
import { Tree, clean, computeStates, plan, subProgress, type Lit } from './lib/tree'
import { load, onOtherTab, save } from './lib/progress'
import { decodeShare } from './lib/share'

/** 选中了什么：一个技能、一个职业，或者全部职业的列表 */
type Focus = { kind: 'skill' | 'sub'; id: string } | { kind: 'careers' } | null

const hashOf = (f: Focus) => (!f ? '' : f.kind === 'careers' ? '#/careers' : `#/${f.kind}/${f.id}`)

/** 地址栏里的 #/skill/docker、#/sub/backend、#/careers */
function parseFocus(tree: Tree, hash: string): Focus {
  if (hash === '#/careers') return { kind: 'careers' }
  const m = /^#\/(skill|sub)\/([a-z0-9-]+)$/.exec(hash)
  if (!m) return null
  const kind = m[1] as 'skill' | 'sub'
  return (kind === 'skill' ? tree.skills : tree.subs).has(m[2]) ? { kind, id: m[2] } : null
}

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

interface AppState {
  tree: Tree
  /** 当前显示的：自己的，或者分享链接里别人的 */
  lit: Lit
  states: Map<string, SkillState>
  /** 每个职业要学的技能点亮了几个 */
  progressBySub: Map<string, { done: number; total: number }>
  /** 正在看别人的分享，不能改 */
  readOnly: boolean
  leaveShared: () => void
  adoptShared: () => void

  focus: Focus
  /** scroll：让树飞过去 */
  setFocus: (f: Focus, opts?: { scroll?: boolean }) => void
  /** 每次要求树飞到焦点时 +1，树据此触发动画 */
  flyRequest: number
  /** 刚刚点亮、解锁或达成的，树上闪一下；职业是 'sub:<id>' */
  pulse: Set<string>

  setLit: (id: string, on: boolean) => void
  replace: (lit: Lit) => void
  reset: () => void

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

const clearHash = () => history.replaceState(null, '', location.pathname + location.search)

export function AppProvider({ tree, children }: { tree: Tree; children: ReactNode }) {
  const [own, setOwn] = useState<Lit>(() => clean(tree, load()).lit)
  const ownRef = useRef(own)
  const [shared, setShared] = useState<Lit | null>(() => {
    const s = decodeShare(tree, location.hash)
    return s && clean(tree, s).lit
  })
  const lit = shared ?? own
  const readOnly = shared !== null
  const states = useMemo(() => computeStates(tree, lit), [tree, lit])
  const progressBySub = useMemo(() => new Map(tree.roadmap.subs.map((s) => [s.id, subProgress(tree, s.id, lit)])), [tree, lit])

  // 地址栏里的焦点要在第一次渲染前读出来：下面把焦点同步到地址栏时，空焦点会把它清掉
  const [focus, setFocusState] = useState<Focus>(() => parseFocus(tree, location.hash))
  const [flyRequest, setFlyRequest] = useState(0)
  const [pulse, setPulse] = useState<Set<string>>(new Set())
  const pulseTimer = useRef(0)
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
    if (f && opts?.scroll) setFlyRequest((n) => n + 1)
  }, [])

  // 焦点同步到地址栏，方便复制链接和刷新后回到原处（看分享时不动地址栏）
  useEffect(() => {
    if (readOnly) return
    const hash = hashOf(focus)
    if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search)
  }, [focus, readOnly])

  // 打开时地址栏里带着焦点：等树量好了尺寸再飞过去
  const focusAtStart = useRef(focus)
  useEffect(() => {
    if (!focusAtStart.current) return
    const t = window.setTimeout(() => setFlyRequest((n) => n + 1), 50)
    return () => window.clearTimeout(t)
  }, [])

  // 之后改地址栏（粘贴链接、前进后退）：分享链接，或者飞到某个技能、职业
  useEffect(() => {
    const onHash = () => {
      const s = decodeShare(tree, location.hash)
      if (s) setShared(clean(tree, s).lit)
      const f = parseFocus(tree, location.hash)
      if (f) setFocus(f, { scroll: true })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [tree, setFocus])

  const commit = useCallback((next: Lit) => {
    // 立刻更新 ref：同一帧里连续两次改动（快速点击）要基于最新的进度算
    ownRef.current = next
    setOwn(next)
    save(next)
  }, [])

  // 别的标签页改了进度，这里跟着刷新
  useEffect(() => onOtherTab(() => commit(clean(tree, load()).lit)), [tree, commit])

  const setLit = useCallback((id: string, on: boolean) => {
    if (readOnly) return
    const before = ownRef.current
    const p = plan(tree, before, { [id]: on })
    if (p.blocked) {
      const { id: want, missing } = p.blocked
      const names = missing.map((m) => `「${tree.skill(m).name}」`).join('')
      toast(`先点亮${names}，才能点亮「${tree.skill(want).name}」`, { label: '去前置', run: () => setFocus({ kind: 'skill', id: missing[0] }, { scroll: true }) })
      return
    }
    const after = p.next
    const changed = [...new Set([...before, ...after])].filter((x) => before.has(x) !== after.has(x))
    if (!changed.length) return
    commit(after)

    // 新点亮的和新解锁的闪一下；新达成的职业放一次大的庆祝
    const was = computeStates(tree, before)
    const unlocked = [...computeStates(tree, after)].filter(([x, s]) => s === 'available' && was.get(x) === 'locked').map(([x]) => x)
    const isReached = (subId: string, l: Lit) => [...tree.closures.get(subId)!].every((x) => l.has(x))
    const reached = tree.roadmap.subs.filter((s) => isReached(s.id, after) && !isReached(s.id, before))
    setPulse(new Set([...changed.filter((x) => after.has(x)), ...unlocked, ...reached.map((s) => `sub:${s.id}`)]))
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => setPulse(new Set()), 1600)

    const some = (ids: string[]) => ids.slice(0, 3).map((x) => tree.skill(x).name).join('、') + (ids.length > 3 ? ' 等' : '')
    if (reached.length) toast(`达成职业：${reached.map((s) => `「${s.name}」`).join('')}`)
    else if (p.cascaded.length) {
      // 熄灭会连带一串：给个撤销，只把这次改的换回来
      const undo = () => {
        const next = new Set(ownRef.current)
        for (const x of changed) if (before.has(x)) next.add(x)
        else next.delete(x)
        commit(next)
      }
      toast(`依赖它的 ${p.cascaded.length} 个技能也一起熄灭了：${some(p.cascaded)}`, { label: '撤销', run: undo })
    } else if (unlocked.length) toast(`解锁了 ${unlocked.length} 个新技能：${some(unlocked)}`)
  }, [readOnly, tree, toast, setFocus, commit])

  /** 整体换掉进度，提示里可以撤销回原来的 */
  const replaceWith = useCallback((next: Lit, message: string) => {
    const backup = ownRef.current
    commit(next)
    toast(message, { label: '撤销', run: () => commit(backup) })
  }, [commit, toast])

  const replace = useCallback((l: Lit) => {
    const { lit: next, dropped } = clean(tree, l)
    replaceWith(next, `已导入 ${next.size} 个技能的进度${dropped ? `，跳过了 ${dropped} 个（已不存在，或前置没点亮）` : ''}`)
  }, [tree, replaceWith])

  const reset = useCallback(() => replaceWith(new Set(), '进度已清空'), [replaceWith])

  const leaveShared = useCallback(() => {
    setShared(null)
    clearHash()
  }, [])
  const adoptShared = useCallback(() => {
    if (!shared) return
    setShared(null)
    clearHash()
    replace(shared)
  }, [shared, replace])

  const value: AppState = {
    tree, lit, states, progressBySub, readOnly, leaveShared, adoptShared,
    focus, setFocus, flyRequest, pulse,
    setLit, replace, reset,
    toasts, toast, dismissToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
