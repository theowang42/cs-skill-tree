// 学习者：点亮状态、目标方向、操作记录。状态推导（边界、就绪度）全部用数据库视图。
import { randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { Learner, LearnerEvent, ProgressEntry, Readiness, SkillState, Status, TimelineDay } from '../src/types.ts'

type Row = Record<string, unknown>

export const STATUSES: readonly Status[] = ['learning', 'done']
export const isStatus = (v: unknown): v is Status => STATUSES.includes(v as Status)

/** 在一个事务里跑，出错就回滚 */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function createLearner(db: DatabaseSync): Learner {
  const id = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO learners (id) VALUES (?)').run(id)
  return { id, goalSubId: null, skills: {} }
}

export function learnerExists(db: DatabaseSync, id: string): boolean {
  return db.prepare('SELECT 1 FROM learners WHERE id = ?').get(id) !== undefined
}

export function getLearner(db: DatabaseSync, id: string): Learner | undefined {
  const row = db.prepare('SELECT id, goal_sub_id FROM learners WHERE id = ?').get(id) as Row | undefined
  if (!row) return undefined
  db.prepare("UPDATE learners SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id)
  const skills: Record<string, ProgressEntry> = {}
  for (const r of db.prepare('SELECT skill_id, status, updated_at FROM learner_skills WHERE learner_id = ? ORDER BY skill_id').all(id) as Row[]) {
    skills[r.skill_id as string] = { status: r.status as Status, updatedAt: r.updated_at as string }
  }
  return { id, goalSubId: (row.goal_sub_id as string | null) ?? null, skills }
}

export function deleteLearner(db: DatabaseSync, id: string): boolean {
  return Number(db.prepare('DELETE FROM learners WHERE id = ?').run(id).changes) > 0
}

/** 返回 false 表示方向不存在 */
export function setGoal(db: DatabaseSync, learnerId: string, subId: string | null): boolean {
  if (subId !== null && !db.prepare('SELECT 1 FROM subs WHERE id = ?').get(subId)) return false
  db.prepare('UPDATE learners SET goal_sub_id = ? WHERE id = ?').run(subId, learnerId)
  return true
}

/** 不存在的技能 id，用来在写入前整体校验 */
export function unknownSkills(db: DatabaseSync, ids: string[]): string[] {
  const known = new Set((db.prepare('SELECT id FROM skills').all() as Row[]).map((r) => r.id as string))
  return ids.filter((id) => !known.has(id))
}

/**
 * 批量改状态。status 为 null 表示清掉（回到没学）。
 * 调用前先用 unknownSkills 校验；这里在一个事务里写，要么全成功要么全不变。
 */
export function setStatuses(db: DatabaseSync, learnerId: string, changes: Record<string, Status | null>, at?: string) {
  const upsert = db.prepare(`
    INSERT INTO learner_skills (learner_id, skill_id, status, updated_at)
    VALUES (?1, ?2, ?3, COALESCE(?4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
    ON CONFLICT (learner_id, skill_id) DO UPDATE
      SET status = excluded.status, updated_at = excluded.updated_at
      WHERE status IS NOT excluded.status
  `)
  const remove = db.prepare('DELETE FROM learner_skills WHERE learner_id = ? AND skill_id = ?')
  transaction(db, () => {
    for (const [skillId, status] of Object.entries(changes)) {
      if (status === null) remove.run(learnerId, skillId)
      else upsert.run(learnerId, skillId, status, at ?? null)
    }
  })
}

/** 用一份完整的进度替换学习者现在的进度（导入文件时用） */
export function replaceProgress(db: DatabaseSync, learnerId: string, goalSubId: string | null, skills: Record<string, ProgressEntry>) {
  transaction(db, () => {
    db.prepare('UPDATE learners SET goal_sub_id = ? WHERE id = ?').run(goalSubId, learnerId)
    const keep = new Set(Object.keys(skills))
    for (const r of db.prepare('SELECT skill_id FROM learner_skills WHERE learner_id = ?').all(learnerId) as Row[]) {
      if (!keep.has(r.skill_id as string)) db.prepare('DELETE FROM learner_skills WHERE learner_id = ? AND skill_id = ?').run(learnerId, r.skill_id as string)
    }
    const upsert = db.prepare(`
      INSERT INTO learner_skills (learner_id, skill_id, status, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (learner_id, skill_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
        WHERE status IS NOT excluded.status
    `)
    for (const [skillId, e] of Object.entries(skills)) upsert.run(learnerId, skillId, e.status, e.updatedAt)
  })
}

export function skillStates(db: DatabaseSync, learnerId: string): Record<string, SkillState> {
  const out: Record<string, SkillState> = {}
  for (const r of db.prepare('SELECT skill_id, state FROM learner_skill_state WHERE learner_id = ?').all(learnerId) as Row[]) {
    out[r.skill_id as string] = r.state as SkillState
  }
  return out
}

export function readinessAll(db: DatabaseSync, learnerId: string): Readiness[] {
  return (db.prepare(`
    SELECT r.sub_id, core_total, core_done, core_learning, choice_total, choice_done, percent
      FROM learner_sub_readiness r JOIN subs s ON s.id = r.sub_id JOIN categories c ON c.id = s.category_id
     WHERE learner_id = ?
     ORDER BY percent DESC, c.position, s.position
  `).all(learnerId) as Row[]).map((r) => ({
    subId: r.sub_id as string,
    coreTotal: r.core_total as number,
    coreDone: r.core_done as number,
    coreLearning: r.core_learning as number,
    choiceTotal: r.choice_total as number,
    choiceDone: r.choice_done as number,
    percent: r.percent as number,
  }))
}

export interface Summary {
  counts: Record<SkillState, number>
  /** 能力边界：现在就能学的技能，目标方向里的排前面 */
  frontier: { skillId: string; step: number | null }[]
  /** 目标方向的就绪度；没有目标时为 null */
  goal: Readiness | null
  /** 离得最近的几个方向 */
  closest: Readiness[]
}

export function summary(db: DatabaseSync, learnerId: string): Summary {
  const counts = { locked: 0, available: 0, learning: 0, done: 0 } as Record<SkillState, number>
  for (const r of db.prepare('SELECT state, COUNT(*) AS n FROM learner_skill_state WHERE learner_id = ? GROUP BY state').all(learnerId) as Row[]) {
    counts[r.state as SkillState] = r.n as number
  }
  const frontier = (db.prepare(`
    SELECT f.skill_id, p.step
      FROM learner_frontier f
      JOIN learners l ON l.id = f.learner_id
      JOIN skill_weight w ON w.skill_id = f.skill_id
      LEFT JOIN sub_learning_plan p ON p.sub_id = l.goal_sub_id AND p.skill_id = f.skill_id
     WHERE f.learner_id = ?
     ORDER BY p.step IS NULL, p.step, w.dependents DESC, f.skill_id
  `).all(learnerId) as Row[]).map((r) => ({ skillId: r.skill_id as string, step: (r.step as number | null) ?? null }))
  const all = readinessAll(db, learnerId)
  const goalId = (db.prepare('SELECT goal_sub_id FROM learners WHERE id = ?').get(learnerId) as Row).goal_sub_id
  return {
    counts,
    frontier,
    goal: all.find((r) => r.subId === goalId) ?? null,
    closest: all.slice(0, 5),
  }
}

export function events(db: DatabaseSync, learnerId: string, limit = 50): LearnerEvent[] {
  return (db.prepare('SELECT skill_id, from_status, to_status, at FROM learner_events WHERE learner_id = ? ORDER BY id DESC LIMIT ?').all(learnerId, limit) as Row[]).map((r) => ({
    skillId: r.skill_id as string,
    from: (r.from_status as Status | null) ?? null,
    to: (r.to_status as Status | null) ?? null,
    at: r.at as string,
  }))
}

export interface CommunityStats {
  learners: number
  popularGoals: { subId: string; learners: number }[]
  mostDone: { skillId: string; learners: number }[]
}

export function communityStats(db: DatabaseSync): CommunityStats {
  return {
    learners: (db.prepare('SELECT COUNT(*) AS n FROM learners').get() as Row).n as number,
    popularGoals: (db.prepare(`
      SELECT goal_sub_id AS subId, COUNT(*) AS learners FROM learners
       WHERE goal_sub_id IS NOT NULL GROUP BY goal_sub_id ORDER BY learners DESC, subId LIMIT 5
    `).all() as unknown) as CommunityStats['popularGoals'],
    mostDone: (db.prepare(`
      SELECT skill_id AS skillId, COUNT(*) AS learners FROM learner_skills
       WHERE status = 'done' GROUP BY skill_id ORDER BY learners DESC, skillId LIMIT 10
    `).all() as unknown) as CommunityStats['mostDone'],
  }
}

/** 成长时间线：每天点亮了什么、开始学什么、取消了什么。按时间正序。 */
export function timeline(db: DatabaseSync, learnerId: string): TimelineDay[] {
  const rows = db.prepare(`
    SELECT substr(at, 1, 10) AS date, skill_id, to_status
      FROM learner_events
     WHERE learner_id = ? AND skill_id IN (SELECT id FROM skills)
     ORDER BY id
  `).all(learnerId) as Row[]
  const days = new Map<string, TimelineDay>()
  for (const r of rows) {
    const date = r.date as string
    let day = days.get(date)
    if (!day) days.set(date, (day = { date, lit: [], learning: [], unlit: [] }))
    const id = r.skill_id as string
    // 同一天反复改，只记最后一次
    for (const list of [day.lit, day.learning, day.unlit]) {
      const i = list.indexOf(id)
      if (i >= 0) list.splice(i, 1)
    }
    if (r.to_status === 'done') day.lit.push(id)
    else if (r.to_status === 'learning') day.learning.push(id)
    else day.unlit.push(id)
  }
  return [...days.values()]
}
