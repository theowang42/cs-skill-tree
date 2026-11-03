// 学习者：目标方向和每个能力块的学习状态。只在 API 服务里用。
import { randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { LearnerState, ProgressStatus } from '../src/types.ts'

type Row = Record<string, unknown>

export const STATUSES: ProgressStatus[] = ['learning', 'done']

export function createLearner(db: DatabaseSync): LearnerState {
  const id = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO learners (id) VALUES (?)').run(id)
  return { id, goalSubId: null, progress: {} }
}

export function getLearner(db: DatabaseSync, id: string): LearnerState | undefined {
  const row = db.prepare('SELECT id, goal_sub_id FROM learners WHERE id = ?').get(id) as Row | undefined
  if (!row) return undefined
  db.prepare("UPDATE learners SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id)
  const progress: Record<string, ProgressStatus> = {}
  for (const p of db.prepare('SELECT block_id, status FROM learner_progress WHERE learner_id = ?').all(id) as Row[]) {
    progress[p.block_id as string] = p.status as ProgressStatus
  }
  return { id, goalSubId: (row.goal_sub_id as string | null) ?? null, progress }
}

/** 返回 false 表示方向不存在 */
export function setGoal(db: DatabaseSync, learnerId: string, subId: string | null): boolean {
  if (subId !== null && !db.prepare('SELECT 1 FROM subs WHERE id = ?').get(subId)) return false
  db.prepare('UPDATE learners SET goal_sub_id = ? WHERE id = ?').run(subId, learnerId)
  return true
}

/** status 为 null 表示清掉这条记录。返回 false 表示能力块不存在。 */
export function setProgress(db: DatabaseSync, learnerId: string, blockId: string, status: ProgressStatus | null): boolean {
  if (!db.prepare('SELECT 1 FROM blocks WHERE id = ?').get(blockId)) return false
  if (status === null) {
    db.prepare('DELETE FROM learner_progress WHERE learner_id = ? AND block_id = ?').run(learnerId, blockId)
  } else {
    db.prepare(`
      INSERT INTO learner_progress (learner_id, block_id, status) VALUES (?, ?, ?)
      ON CONFLICT (learner_id, block_id) DO UPDATE SET status = excluded.status, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).run(learnerId, blockId, status)
  }
  return true
}

export interface CommunityStats {
  learners: number
  /** 被选为目标最多的方向 */
  popularGoals: { subId: string; name: string; learners: number }[]
  /** 被标记学完最多的能力块 */
  mostCompleted: { blockId: string; name: string; learners: number }[]
}

export function communityStats(db: DatabaseSync): CommunityStats {
  const learners = (db.prepare('SELECT COUNT(*) AS n FROM learners').get() as Row).n as number
  const popularGoals = (db.prepare(`
    SELECT l.goal_sub_id AS subId, s.name, COUNT(*) AS learners
      FROM learners l JOIN subs s ON s.id = l.goal_sub_id
     GROUP BY l.goal_sub_id ORDER BY learners DESC, s.name LIMIT 5
  `).all() as unknown) as CommunityStats['popularGoals']
  const mostCompleted = (db.prepare(`
    SELECT p.block_id AS blockId, b.name, COUNT(*) AS learners
      FROM learner_progress p JOIN blocks b ON b.id = p.block_id
     WHERE p.status = 'done'
     GROUP BY p.block_id ORDER BY learners DESC, b.name LIMIT 5
  `).all() as unknown) as CommunityStats['mostCompleted']
  return { learners, popularGoals, mostCompleted }
}
