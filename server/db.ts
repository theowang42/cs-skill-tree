// 数据库的打开、迁移、播种和体检。CLI（scripts/db.ts）和 API 服务（server/index.ts）都用它。
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const MIGRATIONS_DIR = join(ROOT, 'db', 'migrations')
export const SEED_DIR = join(ROOT, 'db', 'seed')
/** 默认的数据库文件；跑服务时可以用环境变量 CS_SKILL_TREE_DB 换一个 */
export const DEFAULT_DB_PATH = process.env.CS_SKILL_TREE_DB ?? join(ROOT, 'data', 'cs-skill-tree.db')

export function openDatabase(path: string = DEFAULT_DB_PATH): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')
  return db
}

export function removeDatabase(path: string = DEFAULT_DB_PATH) {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(path + suffix)) rmSync(path + suffix)
  }
}

/** 按文件名顺序读取一个目录里的 .sql 文件 */
function sqlFiles(dir: string): { name: string; sql: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))
}

// ───────────── 迁移 ─────────────

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

/** 把 db/migrations 里还没跑过的文件按顺序跑一遍。重复执行是安全的。 */
export function migrate(db: DatabaseSync): MigrationResult {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT
  `)
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name as string))
  const result: MigrationResult = { applied: [], skipped: [] }
  const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)')
  for (const { name, sql } of sqlFiles(MIGRATIONS_DIR)) {
    if (done.has(name)) {
      result.skipped.push(name)
      continue
    }
    db.exec('BEGIN')
    try {
      db.exec(sql)
      record.run(name)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw new Error(`迁移 ${name} 失败：${(e as Error).message}`)
    }
    result.applied.push(name)
  }
  return result
}

// ───────────── 播种 ─────────────

/** 内容表，按“先删谁”的顺序。学习者的表不在这里，重新播种不会动它们。 */
export const CONTENT_TABLES = [
  'sub_requirements', 'sub_projects', 'sub_topics', 'sub_items', 'subs', 'category_items', 'categories',
  'skill_resources', 'skill_topics', 'skill_checks', 'skill_prerequisites', 'skills',
  'tool_groups', 'area_courses', 'areas', 'layers',
] as const

export interface SeedResult {
  files: string[]
  /** 内容换掉后，指向已不存在的技能或方向的学习记录被清掉了多少条 */
  orphaned: number
}

/**
 * 清空内容表，按 db/seed 里的文件重新灌一遍。整个过程在一个事务里，失败就全部回滚。
 * 播种时关掉外键检查，这样学习者的记录能保留；结束前把指向已删除内容的记录清掉，再整体核对外键。
 */
export function seed(db: DatabaseSync): SeedResult {
  const files = sqlFiles(SEED_DIR)
  db.exec('PRAGMA foreign_keys = OFF')
  db.exec('BEGIN')
  try {
    for (const t of CONTENT_TABLES) db.exec(`DELETE FROM ${t}`)
    for (const { name, sql } of files) {
      try {
        db.exec(sql)
      } catch (e) {
        throw new Error(`种子文件 ${name} 出错：${(e as Error).message}`)
      }
    }
    // 清理失效记录会触发删除触发器写一条“取消点亮”的操作记录，但那不是用户做的，事后删掉
    const lastEvent = (db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM learner_events').get() as { id: number }).id
    const orphaned =
      Number(db.prepare('DELETE FROM learner_skills WHERE skill_id NOT IN (SELECT id FROM skills)').run().changes) +
      Number(db.prepare('UPDATE learners SET goal_sub_id = NULL WHERE goal_sub_id IS NOT NULL AND goal_sub_id NOT IN (SELECT id FROM subs)').run().changes)
    db.prepare('DELETE FROM learner_events WHERE id > ?').run(lastEvent)
    const broken = db.prepare('PRAGMA foreign_key_check').all() as { table: string; parent: string; rowid: number }[]
    if (broken.length) {
      const sample = broken.slice(0, 5).map((b) => `${b.table} 第 ${b.rowid} 行 → ${b.parent}`).join('；')
      throw new Error(`种子数据里有 ${broken.length} 处引用对不上（多半是 id 拼错了）：${sample}`)
    }
    db.exec('COMMIT')
    return { files: files.map((f) => f.name), orphaned }
  } catch (e) {
    db.exec('ROLLBACK')
    // 临时视图可能留在连接上，清掉免得下次播种报“已存在”
    for (const v of ['area_rows', 'skill_rows', 'category_rows', 'sub_rows']) {
      db.exec(`DROP VIEW IF EXISTS temp.${v}`)
    }
    throw e
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
}

/** 一步到位：删掉旧文件、建表、灌数据 */
export function rebuild(path: string = DEFAULT_DB_PATH): DatabaseSync {
  if (path !== ':memory:') removeDatabase(path)
  const db = openDatabase(path)
  migrate(db)
  seed(db)
  return db
}

// ───────────── 体检 ─────────────

export interface Finding {
  level: 'error' | 'warning'
  rule: string
  message: string
}

type Row = Record<string, unknown>

/**
 * 检查表约束管不到的事情：前置有没有成环、有没有连反、编号有没有断、内容有没有缺、有没有多余的写法。
 * error 会让构建失败；warning 只是提醒。
 */
export function check(db: DatabaseSync): Finding[] {
  const findings: Finding[] = []
  const error = (rule: string, message: string) => findings.push({ level: 'error', rule, message })
  const warning = (rule: string, message: string) => findings.push({ level: 'warning', rule, message })
  const all = (sql: string) => db.prepare(sql).all() as Row[]

  for (const r of all('PRAGMA foreign_key_check')) error('foreign-key', `${r.table} 里有一行引用了不存在的 ${r.parent}`)
  for (const r of all('PRAGMA integrity_check')) if (r.integrity_check !== 'ok') error('integrity', String(r.integrity_check))

  // ── 前置关系 ──
  for (const r of all('SELECT skill_id FROM skill_ancestors WHERE skill_id = ancestor_id')) {
    error('prerequisite-cycle', `技能 ${r.skill_id} 的前置绕了一圈又回到了自己`)
  }
  // 前置的等级不能比它高：技能树上线一律从上往下（或同一行横着）走
  for (const r of all(`
    SELECT p.skill_id, p.prerequisite_id, a.level AS la, b.level AS lb
      FROM skill_prerequisites p
      JOIN skills a ON a.id = p.skill_id
      JOIN skills b ON b.id = p.prerequisite_id
     WHERE b.level > a.level
  `)) {
    error('prerequisite-level', `技能 ${r.skill_id}（${r.la} 级）的前置 ${r.prerequisite_id} 是 ${r.lb} 级，比它还高`)
  }
  for (const r of all('SELECT id FROM skills WHERE level IS NULL OR icon IS NULL')) {
    error('missing-level-or-icon', `技能 ${r.id} 没写等级或图标`)
  }
  for (const r of all('SELECT icon, group_concat(id) AS ids, COUNT(*) AS n FROM skills GROUP BY icon HAVING n > 1')) {
    error('duplicate-icon', `图标 ${r.icon} 被 ${r.ids} 共用，每个技能要有自己的图标`)
  }
  // 直接前置里写了另一个直接前置的祖先，多余
  for (const r of all(`
    SELECT p.skill_id, p.prerequisite_id, o.prerequisite_id AS via
      FROM skill_prerequisites p
      JOIN skill_prerequisites o ON o.skill_id = p.skill_id AND o.prerequisite_id <> p.prerequisite_id
      JOIN skill_ancestors a ON a.skill_id = o.prerequisite_id AND a.ancestor_id = p.prerequisite_id
  `)) {
    warning('redundant-prerequisite', `技能 ${r.skill_id} 的前置 ${r.prerequisite_id} 已经是 ${r.via} 的前置，可以不写`)
  }
  // 既不依赖别人、也没人依赖的知识点，在树上是一座孤岛
  for (const r of all(`
    SELECT id FROM skills
     WHERE id NOT IN (SELECT skill_id FROM skill_prerequisites)
       AND id NOT IN (SELECT prerequisite_id FROM skill_prerequisites)
       AND id NOT IN (SELECT skill_id FROM sub_requirements)
  `)) {
    warning('isolated-skill', `技能 ${r.id} 既没有前置，也不是任何技能的前置`)
  }

  // ── 编号必须从 1 连续 ──
  const sequences: [string, string][] = [
    ['layers', "'*'"], ['areas', 'layer_id'], ['tool_groups', "'*'"], ['categories', "'*'"], ['subs', 'category_id'],
    ['area_courses', 'area_id'], ['skill_checks', 'skill_id'], ['skill_topics', 'skill_id'], ['skill_resources', 'skill_id'],
    ['category_items', 'category_id'], ['sub_items', 'sub_id'], ['sub_topics', 'sub_id'], ['sub_projects', 'sub_id'],
  ]
  for (const [table, group] of sequences) {
    for (const r of all(`SELECT ${group} AS g, COUNT(*) AS n, MIN(position) AS lo, MAX(position) AS hi FROM ${table} GROUP BY ${group} HAVING lo <> 1 OR hi <> n`)) {
      error('position-gap', `${table} 里 ${r.g} 的 position 不是从 1 连续编号（共 ${r.n} 行，最大 ${r.hi}）`)
    }
  }
  for (const r of all(`SELECT COALESCE(area_id, group_id) AS g, COUNT(*) AS n, MAX(position) AS hi FROM skills GROUP BY g HAVING MIN(position) <> 1 OR hi <> n`)) {
    error('position-gap', `skills 里 ${r.g} 的 position 不是从 1 连续编号（共 ${r.n} 行，最大 ${r.hi}）`)
  }

  // ── 内容齐不齐 ──
  const required: [string, string, string, string][] = [
    ['skills', 'skill_resources', 'skill_id', '去哪学的链接'],
    ['areas', "(SELECT area_id FROM skills WHERE area_id IS NOT NULL)", 'area_id', '技能'],
    ['categories', 'category_items', 'category_id', '方块文字'],
    ['categories', 'subs', 'category_id', '细分方向'],
    ['subs', 'sub_items', 'sub_id', '方块文字'],
    ['subs', 'sub_projects', 'sub_id', '代表项目'],
    ['subs', '(SELECT sub_id FROM sub_requirements WHERE choice IS NULL)', 'sub_id', '必学技能'],
  ]
  for (const [parent, child, fk, what] of required) {
    for (const r of all(`SELECT id FROM ${parent} WHERE id NOT IN (SELECT ${fk} FROM ${child})`)) {
      error('missing-content', `${r.id} 没有“${what}”`)
    }
  }
  for (const r of all("SELECT id, length(intro) AS n FROM skills WHERE length(intro) > 50")) {
    warning('long-intro', `技能 ${r.id} 的介绍有 ${r.n} 个字，一句话最好控制在 50 字以内`)
  }
  // 名字的显示宽度：中文算 2，英文数字算 1。技能树的节点下面放得下 16
  const width = (t: string) => [...t].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
  for (const r of all('SELECT id, name FROM skills')) {
    if (width(r.name as string) > 16) warning('long-name', `技能 ${r.id} 的名字“${r.name}”太长，技能树上放不下`)
  }

  // ── 方向的要求写得对不对 ──
  for (const r of all(`
    SELECT r.sub_id, r.skill_id, o.skill_id AS via
      FROM sub_requirements r
      JOIN sub_requirements o ON o.sub_id = r.sub_id AND o.skill_id <> r.skill_id AND o.choice IS NULL
      JOIN skill_ancestors a ON a.skill_id = o.skill_id AND a.ancestor_id = r.skill_id
     WHERE r.choice IS NULL
  `)) {
    warning('redundant-requirement', `方向 ${r.sub_id} 必学的 ${r.skill_id} 已经是 ${r.via} 的前置，可以不写`)
  }
  for (const r of all(`
    SELECT ch.sub_id, ch.choice, ch.skill_id
      FROM sub_choices ch
      JOIN sub_skill_closure c ON c.sub_id = ch.sub_id AND c.skill_id = ch.skill_id
  `)) {
    error('choice-in-core', `方向 ${r.sub_id} 的任选组“${r.choice}”里的 ${r.skill_id} 已经是必学的了`)
  }
  for (const r of all("SELECT id FROM skills WHERE id NOT IN (SELECT skill_id FROM sub_skill_closure) AND id NOT IN (SELECT skill_id FROM sub_choices)")) {
    warning('unused-skill', `技能 ${r.id} 没有任何方向用到`)
  }
  const hot = (db.prepare('SELECT COUNT(*) AS n FROM subs WHERE is_hot = 1').get() as Row).n as number
  if (hot < 1 || hot > 4) warning('hot-count', `热门方向有 ${hot} 个，首页放 1~4 个比较合适`)

  // ── 链接 ──
  for (const r of all(`
    SELECT url, COUNT(*) AS n FROM (
      SELECT url FROM area_courses UNION ALL SELECT url FROM skill_resources UNION ALL SELECT url FROM sub_projects
    ) GROUP BY url HAVING n > 1
  `)) {
    warning('duplicate-url', `链接 ${r.url} 出现了 ${r.n} 次`)
  }

  return findings
}

/** 每张表的行数，给 stats 命令和 /api/stats 用 */
export function tableCounts(db: DatabaseSync): Record<string, number> {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Row[]
  const out: Record<string, number> = {}
  for (const t of tables) {
    out[t.name as string] = (db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get() as Row).n as number
  }
  return out
}
