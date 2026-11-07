// 全局状态：树、点亮了哪些、推导出的状态、当前焦点，以及所有会改进度的动作。组件通过 useApp() 拿到它们。
// 改进度一律走 setLit() 或 setStep()：按规则算出新的点亮集合，存进浏览器，同时算出“新解锁了哪些”给树上做动画。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SkillState } from './types'
import { Tree, clean, cleanSteps, computeStates, plan, subProgress, type Lit } from './lib/tree'
import { EMPTY, load, onOtherTab, save, type Progress } from './lib/progress'
import { decodeShare } from './lib/share'

/** 选中了什么：一个技能，或者一个职业 */
type Focus = { kind: 'skill' | 'sub'; id: string } | null

const hashOf = (f: Focus) => (f ? `#/${f.kind}/${f.id}` : '')

/** 地址栏里的 #/skill/docker、#/sub/backend */
function parseFocus(tree: Tree, hash: string): Focus {
  const m = /^#\/(skill|sub)\/([a-z0-9-]+)$/.exec(hash)
  if (!m) return null
  const kind = m[1] as 'skill' | 'sub'
  return (kind === 'skill' ? tree.skills : tree.subs).has(m[2]) ? { kind, id: m[2] } : null
}

/**
 * 技能树的目录（tree/）和站点首页。职业页、技能页也加载同一份脚本，所以按脚本自己在哪找，不按页面地址：
 * 打包后脚本在 tree/assets/ 里，开发时这个文件在 src/ 里，往上一级都是技能树的目录
 */
export const TREE_URL = import.meta.url.replace(/[^/]+\/[^/]+$/, '')
/** 链接写全 index.html：有的托管（比如 claude.ai 的 artifact）不会把目录自动打开成 index.html */
export const HOME_URL = `${TREE_URL}../index.html`

/** 职业页（career/<id>/）打开这个职业自己的天赋树；技能页（skill/<id>/）打开大图，选中这个技能 */
function parsePage(tree: Tree, path: string): Focus {
  const m = /\/(career|skill)\/([a-z0-9-]+)(?:\/|\/index\.html)?$/.exec(path)
  if (!m) return null
  const kind = m[1] === 'career' ? 'sub' : 'skill'
  return (kind === 'sub' ? tree.subs : tree.skills).has(m[2]) ? { kind, id: m[2] } : null
}

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

interface AppState {
  tree: Tree
  /** 只看一个职业的天赋树时是它的 id；看整棵大图时是 null */
  career: string | null
  /** 什么都不选时回到哪：大图是“我的进度”，职业天赋树是这个职业 */
  home: Focus
  /** 当前显示的：自己的，或者分享链接里别人的 */
  lit: Lit
  /** 还没点亮的技能完成了学习流程的第几步 */
  steps: ReadonlyMap<string, readonly number[]>
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
  /** 点亮或熄灭学习流程的第 n 步（从 1 开始）。最后一步做完，技能自动点亮 */
  setStep: (id: string, n: number, on: boolean) => void
  replace: (p: Progress) => void
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

const NO_STEPS: ReadonlyMap<string, readonly number[]> = new Map()

export function AppProvider({ tree, children }: { tree: Tree; children: ReactNode }) {
  /** 去掉已经不存在的技能、前置没点亮的点亮、对不上的步骤 */
  const tidy = useCallback((p: Progress) => {
    const { lit, dropped } = clean(tree, p.lit)
    return { progress: { lit, steps: cleanSteps(tree, lit, p.steps) }, dropped }
  }, [tree])
  const [own, setOwn] = useState<Progress>(() => tidy(load()).progress)
  const ownRef = useRef(own)
  const [shared, setShared] = useState<Lit | null>(() => {
    const s = decodeShare(tree, location.hash)
    return s && clean(tree, s).lit
  })
  const lit = shared ?? own.lit
  const steps = shared ? NO_STEPS : own.steps
  const readOnly = shared !== null
  const states = useMemo(() => computeStates(tree, lit), [tree, lit])
  const progressBySub = useMemo(() => new Map(tree.roadmap.subs.map((s) => [s.id, subProgress(tree, s.id, lit)])), [tree, lit])

  const [page] = useState(() => parsePage(tree, location.pathname))
  const career = page?.kind === 'sub' ? page.id : null
  const home: Focus = career ? page : null
  // 地址栏里的焦点要在第一次渲染前读出来：下面把焦点同步到地址栏时，空焦点会把它清掉
  const [focus, setFocusState] = useState<Focus>(() => parseFocus(tree, location.hash) ?? page)
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

  const commit = useCallback((next: Progress) => {
    // 立刻更新 ref：同一帧里连续两次改动（快速点击）要基于最新的进度算
    ownRef.current = next
    setOwn(next)
    save(next)
  }, [])

  // 别的标签页改了进度，这里跟着刷新
  useEffect(() => onOtherTab(() => commit(tidy(load()).progress)), [tidy, commit])

  /** 点亮或熄灭一个技能。熄灭时 keep 是这个技能还留着的步骤（只熄灭了其中一步） */
  const change = useCallback((id: string, on: boolean, keep: number[] = []) => {
    if (readOnly) return
    const { lit: before, steps: beforeSteps } = ownRef.current
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
    const afterSteps = new Map(beforeSteps)
    afterSteps.delete(id)
    if (!on && keep.length) afterSteps.set(id, keep)
    commit({ lit: after, steps: afterSteps })

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
        const next = new Set(ownRef.current.lit)
        const nextSteps = new Map(ownRef.current.steps)
        for (const x of changed) if (before.has(x)) {
          next.add(x)
          nextSteps.delete(x)
        } else next.delete(x)
        commit({ lit: next, steps: nextSteps })
      }
      toast(`依赖它的 ${p.cascaded.length} 个技能也一起熄灭了：${some(p.cascaded)}`, { label: '撤销', run: undo })
    } else if (unlocked.length) toast(`解锁了 ${unlocked.length} 个新技能：${some(unlocked)}`)
  }, [readOnly, tree, toast, setFocus, commit])

  const setLit = useCallback((id: string, on: boolean) => change(id, on), [change])

  const setStep = useCallback((id: string, n: number, on: boolean) => {
    if (readOnly) return
    const total = tree.skill(id).steps.length
    const { lit: l, steps: s } = ownRef.current
    const done = new Set(l.has(id) ? Array.from({ length: total }, (_, i) => i + 1) : s.get(id) ?? [])
    if (on) done.add(n)
    else done.delete(n)
    const list = [...done].sort((a, b) => a - b)
    if (list.length === total) return change(id, true)
    if (l.has(id)) return change(id, false, list)
    const nextSteps = new Map(s)
    if (list.length) nextSteps.set(id, list)
    else nextSteps.delete(id)
    commit({ lit: l, steps: nextSteps })
  }, [readOnly, tree, change, commit])

  /** 整体换掉进度，提示里可以撤销回原来的 */
  const replaceWith = useCallback((next: Progress, message: string) => {
    const backup = ownRef.current
    commit(next)
    toast(message, { label: '撤销', run: () => commit(backup) })
  }, [commit, toast])

  const replace = useCallback((p: Progress) => {
    const { progress, dropped } = tidy(p)
    replaceWith(progress, `已导入 ${progress.lit.size} 个技能的进度${dropped ? `，跳过了 ${dropped} 个（已不存在，或前置没点亮）` : ''}`)
  }, [tidy, replaceWith])

  const reset = useCallback(() => replaceWith(EMPTY, '进度已清空'), [replaceWith])

  const leaveShared = useCallback(() => {
    setShared(null)
    clearHash()
  }, [])
  const adoptShared = useCallback(() => {
    if (!shared) return
    setShared(null)
    clearHash()
    replace({ lit: shared, steps: NO_STEPS })
  }, [shared, replace])

  const value: AppState = {
    tree, career, home, lit, steps, states, progressBySub, readOnly, leaveShared, adoptShared,
    focus, setFocus, flyRequest, pulse,
    setLit, setStep, replace, reset,
    toasts, toast, dismissToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
