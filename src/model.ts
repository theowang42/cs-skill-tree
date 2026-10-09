import { BLOCKS, CATEGORIES, MASTERED_LEVEL, closure, getBlock, type Direction } from './data/roadmap'

export type Levels = Record<string, number>

/** 当前目标：一个大类，或大类里的某个方向 */
export type Goal = { catId: string; dir?: number } | null

export function levelOf(levels: Levels, id: string): number {
  return levels[id] ?? 0
}

export function isMastered(levels: Levels, id: string): boolean {
  return levelOf(levels, id) >= MASTERED_LEVEL
}

export function goalDirections(goal: Goal): Direction[] {
  if (!goal) return []
  const cat = CATEGORIES.find((c) => c.id === goal.catId)
  if (!cat) return []
  return goal.dir === undefined ? cat.directions : [cat.directions[goal.dir]].filter(Boolean)
}

/** 目标需要的全部能力块（含所有前置） */
export function goalBlocks(goal: Goal): Set<string> {
  return closure(goalDirections(goal).flatMap((d) => d.requires))
}

/** 还没掌握、但前置都已掌握的块，也就是现在就可以开始学的 */
export function nextSteps(ids: Set<string>, levels: Levels): string[] {
  return BLOCKS.filter(
    (b) => ids.has(b.id) && !isMastered(levels, b.id) && getBlock(b.id).requires.every((r) => isMastered(levels, r)),
  ).map((b) => b.id)
}

export function readiness(dir: Direction, levels: Levels) {
  const ids = closure(dir.requires)
  let met = 0
  for (const id of ids) if (isMastered(levels, id)) met++
  return { met, total: ids.size }
}

export function overallProgress(levels: Levels) {
  const sum = BLOCKS.reduce((s, b) => s + levelOf(levels, b.id), 0)
  const mastered = BLOCKS.filter((b) => isMastered(levels, b.id)).length
  return { ratio: sum / (BLOCKS.length * 4), mastered, total: BLOCKS.length }
}

export function stars([lo, hi]: [number, number]): string {
  const s = (n: number) => '★'.repeat(n)
  return lo === hi ? s(lo) : `${s(lo)}～${s(hi)}`
}
