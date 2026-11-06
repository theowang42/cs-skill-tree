// 技能树的纯逻辑：索引、状态、规则。不依赖 React，也不依赖浏览器。
// 进度就是“点亮了哪些技能”的集合。
import type { Area, Category, Roadmap, Skill, SkillState, Sub } from '../types.ts'

export type Lit = ReadonlySet<string>

export class Tree {
  readonly roadmap: Roadmap
  readonly skills: Map<string, Skill>
  readonly areas: Map<string, Area>
  readonly subs: Map<string, Sub>
  readonly categories: Map<string, Category>
  /** 每个职业必学的全部技能（含前置） */
  readonly closures: Map<string, Set<string>>
  private ancestorCache = new Map<string, Set<string>>()

  constructor(roadmap: Roadmap) {
    this.roadmap = roadmap
    this.skills = new Map(roadmap.skills.map((s) => [s.id, s]))
    this.areas = new Map(roadmap.areas.map((a) => [a.id, a]))
    this.subs = new Map(roadmap.subs.map((s) => [s.id, s]))
    this.categories = new Map(roadmap.categories.map((c) => [c.id, c]))
    this.closures = new Map(roadmap.subs.map((s) => [s.id, new Set(s.plan.map((p) => p.skillId))]))
  }

  skill(id: string): Skill {
    const s = this.skills.get(id)
    if (!s) throw new Error(`没有技能 ${id}`)
    return s
  }

  /** 全部前置（直接 + 间接），不含自己 */
  ancestors(id: string): Set<string> {
    let out = this.ancestorCache.get(id)
    if (!out) {
      out = new Set()
      const stack = [...this.skill(id).prerequisites]
      while (stack.length) {
        const x = stack.pop()!
        if (out.has(x)) continue
        out.add(x)
        stack.push(...this.skill(x).prerequisites)
      }
      this.ancestorCache.set(id, out)
    }
    return out
  }
}

/** 点亮了就是 done；前置都点亮了是 available；否则 locked */
export function computeStates(tree: Tree, lit: Lit): Map<string, SkillState> {
  return new Map(tree.roadmap.skills.map((s) => [s.id, lit.has(s.id) ? 'done' : s.prerequisites.every((p) => lit.has(p)) ? 'available' : 'locked']))
}

/** 一个职业要学的技能点亮了几个 */
export function subProgress(tree: Tree, subId: string, lit: Lit): { done: number; total: number } {
  const closure = tree.closures.get(subId)!
  let done = 0
  for (const id of closure) if (lit.has(id)) done++
  return { done, total: closure.size }
}

/** 下一步能点亮的技能，被依赖得越多越靠前 */
export function frontier(tree: Tree, states: Map<string, SkillState>): string[] {
  return [...states].filter(([, s]) => s === 'available').map(([id]) => id).sort((a, b) => tree.skill(b).weight - tree.skill(a).weight)
}

export function totals(states: Map<string, SkillState>) {
  const t = { total: states.size, done: 0, available: 0, locked: 0 }
  for (const st of states.values()) t[st]++
  return t
}

interface Plan {
  next: Set<string>
  /** 想点亮但前置没点亮的：那就一个都不改 */
  blocked: { id: string; missing: string[] } | null
  /** 因为熄灭了前置而一起熄灭的（不是直接要求的） */
  cascaded: string[]
}

/**
 * 按规则把一批改动（true 点亮，false 熄灭）算成新的点亮集合：
 *   - 熄灭一个技能，所有依赖它的已点亮技能一起熄灭；
 *   - 点亮一个技能，它的直接前置必须都已点亮（同一批里先点亮的前置也算）。
 */
export function plan(tree: Tree, lit: Lit, changes: Record<string, boolean>): Plan {
  const next = new Set(lit)
  const cascaded: string[] = []
  for (const [id, on] of Object.entries(changes)) {
    if (on) continue
    const stack = [id]
    while (stack.length) {
      const x = stack.pop()!
      if (!next.delete(x)) continue
      if (x !== id && !(x in changes)) cascaded.push(x)
      stack.push(...tree.skill(x).dependents)
    }
  }
  let pending = Object.keys(changes).filter((id) => changes[id] && !next.has(id))
  for (let moved = true; moved; ) {
    moved = false
    pending = pending.filter((id) => {
      if (!tree.skill(id).prerequisites.every((p) => next.has(p))) return true
      next.add(id)
      moved = true
      return false
    })
  }
  if (pending.length) {
    const id = pending[0]
    return { next: new Set(lit), blocked: { id, missing: tree.skill(id).prerequisites.filter((p) => !next.has(p)) }, cascaded: [] }
  }
  return { next, blocked: null, cascaded }
}

/** 去掉内容里已经没有的技能，和前置没点亮的点亮记录（旧数据、导入的文件、分享链接、内容改过前置之后） */
export function clean(tree: Tree, lit: Lit): { lit: Set<string>; dropped: number } {
  const kept = new Set([...lit].filter((id) => tree.skills.has(id) && [...tree.ancestors(id)].every((a) => lit.has(a))))
  return { lit: kept, dropped: lit.size - kept.size }
}

/**
 * 徽章的星级：要点亮的技能越多越难拿。一星 ≤ 22 个，二星 23–29 个，三星 ≥ 30 个。
 * 像游戏里的稀有度：粒度一样的岗位，难度可以不一样。
 */
export function stars(total: number): string {
  const tier = total >= 30 ? 3 : total >= 23 ? 2 : 1
  return '★'.repeat(tier) + '☆'.repeat(3 - tier)
}
