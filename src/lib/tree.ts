// 技能树的纯逻辑：索引、四种状态、能力边界、离方向还有多远。
// 不依赖 React，也不依赖浏览器；服务端测试会拿它和数据库视图的结果逐个对比，保证两边一致。
import type { Area, Category, Layer, Progress, Readiness, Roadmap, Skill, SkillState, Status, Sub, ToolGroup } from '../types.ts'

export class Tree {
  readonly roadmap: Roadmap
  readonly skills = new Map<string, Skill>()
  readonly areas = new Map<string, Area>()
  readonly layers = new Map<string, Layer>()
  readonly groups = new Map<string, ToolGroup>()
  readonly subs = new Map<string, Sub>()
  readonly categories = new Map<string, Category>()
  /** 每个方向必学的全部技能 */
  readonly closures = new Map<string, Set<string>>()
  /** 每个方向里技能的学习步骤 */
  readonly steps = new Map<string, Map<string, number>>()
  private ancestorCache = new Map<string, Set<string>>()

  constructor(roadmap: Roadmap) {
    this.roadmap = roadmap
    for (const s of roadmap.skills) this.skills.set(s.id, s)
    for (const a of roadmap.areas) this.areas.set(a.id, a)
    for (const l of roadmap.layers) this.layers.set(l.id, l)
    for (const g of roadmap.toolGroups) this.groups.set(g.id, g)
    for (const c of roadmap.categories) this.categories.set(c.id, c)
    for (const s of roadmap.subs) {
      this.subs.set(s.id, s)
      this.closures.set(s.id, new Set(s.plan.map((p) => p.skillId)))
      this.steps.set(s.id, new Map(s.plan.map((p) => [p.skillId, p.step])))
    }
  }

  skill(id: string): Skill {
    const s = this.skills.get(id)
    if (!s) throw new Error(`没有技能 ${id}`)
    return s
  }

  /** 全部前置（直接 + 间接），不含自己 */
  ancestors(id: string): Set<string> {
    const cached = this.ancestorCache.get(id)
    if (cached) return cached
    const out = new Set<string>()
    const stack = [...this.skill(id).prerequisites]
    while (stack.length) {
      const x = stack.pop()!
      if (out.has(x)) continue
      out.add(x)
      stack.push(...this.skill(x).prerequisites)
    }
    this.ancestorCache.set(id, out)
    return out
  }

  /** 全部后继：直接或间接依赖它的技能 */
  descendants(id: string): Set<string> {
    const out = new Set<string>()
    const stack = [...this.skill(id).dependents]
    while (stack.length) {
      const x = stack.pop()!
      if (out.has(x)) continue
      out.add(x)
      stack.push(...this.skill(x).dependents)
    }
    return out
  }

  /** 一组技能里，按依赖顺序排好（前置在前）。点亮一串前置时用，动画也按这个顺序走。 */
  topoSort(ids: Iterable<string>): string[] {
    const want = new Set(ids)
    const out: string[] = []
    const seen = new Set<string>()
    const visit = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      for (const p of this.skill(id).prerequisites) if (want.has(p)) visit(p)
      out.push(id)
    }
    // 按导出顺序（层、领域、行）遍历，结果稳定
    for (const s of this.roadmap.skills) if (want.has(s.id)) visit(s.id)
    return out
  }

  /** 技能所在领域或工具组的名字 */
  containerName(id: string): string {
    const s = this.skill(id)
    return s.areaId ? this.areas.get(s.areaId)!.name : this.groups.get(s.groupId!)!.name
  }
}

/** 每个技能对这个学习者显示成什么状态 */
export function computeStates(tree: Tree, progress: Progress): Map<string, SkillState> {
  const states = new Map<string, SkillState>()
  const done = (id: string) => progress.skills[id]?.status === 'done'
  for (const s of tree.roadmap.skills) {
    const own = progress.skills[s.id]?.status
    if (own) states.set(s.id, own)
    else states.set(s.id, s.prerequisites.every(done) ? 'available' : 'locked')
  }
  return states
}

/** 离某个方向还有多远。必学部分按技能数算，任选组每组算 1 份。和视图 learner_sub_readiness 的算法一致。 */
export function readiness(tree: Tree, subId: string, progress: Progress): Readiness {
  const sub = tree.subs.get(subId)!
  const closure = tree.closures.get(subId)!
  let coreDone = 0
  for (const id of closure) if (progress.skills[id]?.status === 'done') coreDone++
  const choiceDone = sub.choices.filter((c) => c.options.some((o) => progress.skills[o]?.status === 'done')).length
  const total = closure.size + sub.choices.length
  return {
    subId,
    coreTotal: closure.size,
    coreDone,
    choiceTotal: sub.choices.length,
    choiceDone,
    percent: total ? Math.round((1000 * (coreDone + choiceDone)) / total) / 10 : 0,
  }
}

export interface FrontierItem {
  id: string
  /** 在目标方向的必学里 */
  inGoal: boolean
  /** 在目标方向里第几步，不在目标里是 null */
  step: number | null
}

/**
 * 能力边界：前置都 done、自己还没标的技能。
 * 排序：目标方向里的排前面（按步骤），其余按“分量”（被多少技能依赖）从大到小。
 */
export function frontier(tree: Tree, states: Map<string, SkillState>, goalSubId: string | null): FrontierItem[] {
  const steps = goalSubId ? tree.steps.get(goalSubId) : undefined
  const items: FrontierItem[] = []
  for (const [id, st] of states) {
    if (st !== 'available') continue
    const step = steps?.get(id) ?? null
    items.push({ id, inGoal: step !== null, step })
  }
  return items.sort((a, b) => {
    if (a.inGoal !== b.inGoal) return a.inGoal ? -1 : 1
    if (a.step !== b.step) return (a.step ?? 0) - (b.step ?? 0)
    return tree.skill(b.id).weight - tree.skill(a.id).weight
  })
}

/** 点亮一个技能前，还有哪些前置没 done（按依赖顺序） */
export function missingPrerequisites(tree: Tree, id: string, progress: Progress): string[] {
  return tree.topoSort([...tree.ancestors(id)].filter((a) => progress.skills[a]?.status !== 'done'))
}

/** 取消点亮时，哪些已点亮的后继会变成“前置没满足”（只是提示，不会自动取消） */
export function litDescendants(tree: Tree, id: string, progress: Progress): string[] {
  return tree.topoSort([...tree.descendants(id)].filter((d) => progress.skills[d]?.status === 'done'))
}

export interface Totals {
  total: number
  done: number
  available: number
  locked: number
}

export function totals(states: Map<string, SkillState>, filter?: (id: string) => boolean): Totals {
  const t: Totals = { total: 0, done: 0, available: 0, locked: 0 }
  for (const [id, st] of states) {
    if (filter && !filter(id)) continue
    t.total++
    t[st]++
  }
  return t
}

// ───────────── 规则：前置都点亮了才能点亮 ─────────────

type Changes = Record<string, Status | null>

export interface Plan {
  /** 真正要写的改动（含连带熄灭的） */
  diff: Changes
  /** 想点亮但前置没点亮的：一个都不写 */
  blocked: { id: string; missing: string[] }[]
  /** 因为取消了前置而一起熄灭的（不是直接要求的） */
  cascaded: string[]
}

/**
 * 按规则把一批改动算成真正要写的东西。服务端和浏览器用同一份：
 *   - 取消点亮一个技能，所有依赖它的已点亮技能一起熄灭；
 *   - 点亮一个技能，它的直接前置必须都已点亮（同一批里先点亮的前置也算）。
 */
export function planChanges(
  prerequisitesOf: (id: string) => readonly string[],
  dependentsOf: (id: string) => readonly string[],
  lit: ReadonlySet<string>,
  changes: Changes,
): Plan {
  const next = new Set(lit)
  const cascaded: string[] = []
  for (const [id, st] of Object.entries(changes)) {
    if (st !== null || !next.has(id)) continue
    const stack = [id]
    while (stack.length) {
      const x = stack.pop()!
      if (!next.delete(x)) continue
      if (x !== id && !(x in changes)) cascaded.push(x)
      stack.push(...dependentsOf(x))
    }
  }
  let pending = Object.entries(changes).filter(([id, st]) => st === 'done' && !next.has(id)).map(([id]) => id)
  for (let moved = true; moved && pending.length; ) {
    moved = false
    pending = pending.filter((id) => {
      if (!prerequisitesOf(id).every((p) => next.has(p))) return true
      next.add(id)
      moved = true
      return false
    })
  }
  const blocked = pending.map((id) => ({ id, missing: prerequisitesOf(id).filter((p) => !next.has(p)) }))
  if (blocked.length) return { diff: {}, blocked, cascaded: [] }
  const diff: Changes = {}
  for (const id of new Set([...lit, ...next])) {
    if (lit.has(id) && !next.has(id)) diff[id] = null
    else if (!lit.has(id) && next.has(id)) diff[id] = 'done'
  }
  return { diff, blocked, cascaded }
}

export function planFor(tree: Tree, progress: Progress, changes: Changes): Plan {
  const lit = new Set(Object.keys(progress.skills).filter((id) => progress.skills[id].status === 'done'))
  return planChanges((id) => tree.skill(id).prerequisites, (id) => tree.skill(id).dependents, lit, changes)
}

/** 去掉前置没点亮的点亮记录（旧数据、导入的文件、分享链接、内容改过前置之后） */
export function enforcePrerequisites(tree: Tree, progress: Progress): { progress: Progress; dropped: string[] } {
  const dropped = Object.keys(progress.skills).filter((id) => tree.skills.has(id) && [...tree.ancestors(id)].some((a) => !progress.skills[a]))
  if (!dropped.length) return { progress, dropped }
  const skills = { ...progress.skills }
  for (const id of dropped) delete skills[id]
  return { progress: { ...progress, skills }, dropped }
}

/** 职业达成了吗：它要学的全部技能（不算加分项）都点亮了。职业不用手动点，点够了自己亮 */
export function isReached(tree: Tree, subId: string, progress: Progress): boolean {
  for (const id of tree.closures.get(subId)!) if (progress.skills[id]?.status !== 'done') return false
  return true
}
