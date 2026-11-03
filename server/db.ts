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
  'sub_projects', 'sub_topics', 'sub_items', 'sub_tools', 'sub_requirements', 'subs',
  'category_items', 'categories',
  'tool_links', 'tool_topics', 'tools', 'tool_groups',
  'block_courses', 'block_topics', 'block_prerequisites', 'block_items', 'blocks', 'layers',
] as const

export interface SeedResult {
  files: string[]
  /** 内容换掉后，指向已不存在的块或方向的学习记录被清掉了多少条 */
  orphanedProgress: number
}

/**
 * 清空内容表，按 db/seed 里的文件重新灌一遍。整个过程在一个事务里，失败就全部回滚。
 * 播种时关掉外键检查，这样学习者的记录能保留；结束前再把指向已删除内容的记录清掉。
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
    const orphanedProgress =
      Number(db.prepare('DELETE FROM learner_progress WHERE block_id NOT IN (SELECT id FROM blocks)').run().changes) +
      Number(db.prepare('UPDATE learners SET goal_sub_id = NULL WHERE goal_sub_id IS NOT NULL AND goal_sub_id NOT IN (SELECT id FROM subs)').run().changes)
    const broken = db.prepare('PRAGMA foreign_key_check').all()
    if (broken.length) {
      const first = broken[0] as { table: string; rowid: number | null; parent: string }
      throw new Error(`种子数据里有 ${broken.length} 处外键对不上，比如 ${first.table} 里引用了不存在的 ${first.parent}`)
    }
    db.exec('COMMIT')
    return { files: files.map((f) => f.name), orphanedProgress }
  } catch (e) {
    db.exec('ROLLBACK')
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
 * 检查外键约束管不到的事情：前置有没有成环、顺序号有没有断、有没有没人用的内容。
 * error 会让 CI 失败；warning 只是提醒。
 */
export function check(db: DatabaseSync): Finding[] {
  const findings: Finding[] = []
  const error = (rule: string, message: string) => findings.push({ level: 'error', rule, message })
  const warning = (rule: string, message: string) => findings.push({ level: 'warning', rule, message })
  const all = (sql: string) => db.prepare(sql).all() as Row[]

  for (const r of all('PRAGMA foreign_key_check')) error('foreign-key', `${r.table} 里有一行引用了不存在的 ${r.parent}`)
  for (const r of all('PRAGMA integrity_check')) if (r.integrity_check !== 'ok') error('integrity', String(r.integrity_check))

  // 前置成环：一个块是它自己的前置
  for (const r of all('SELECT block_id FROM block_ancestors WHERE block_id = ancestor_id')) {
    error('prerequisite-cycle', `能力块 ${r.block_id} 的前置绕了一圈又回到自己`)
  }
  // 前置只能指向同层或更低的层
  for (const r of all(`
    SELECT p.block_id, p.prerequisite_id
      FROM block_prerequisites p
      JOIN blocks b ON b.id = p.block_id   JOIN layers lb ON lb.id = b.layer_id
      JOIN blocks q ON q.id = p.prerequisite_id JOIN layers lq ON lq.id = q.layer_id
     WHERE lq.position > lb.position
  `)) {
    error('prerequisite-layer', `能力块 ${r.block_id} 的前置 ${r.prerequisite_id} 在更高的层，图上会连反`)
  }

  // 顺序号必须是 1..n 连续
  const sequences: [string, string, string][] = [
    ['layers', "'all'", 'position'],
    ['blocks', 'layer_id', 'position'],
    ['tool_groups', "'all'", 'position'],
    ['tools', 'group_id', 'position'],
    ['categories', "'all'", 'position'],
    ['subs', 'category_id', 'position'],
    ['block_items', 'block_id', 'position'], ['block_topics', 'block_id', 'position'], ['block_courses', 'block_id', 'position'],
    ['tool_topics', 'tool_id', 'position'], ['tool_links', 'tool_id', 'position'],
    ['category_items', 'category_id', 'position'],
    ['sub_items', 'sub_id', 'position'], ['sub_topics', 'sub_id', 'position'], ['sub_projects', 'sub_id', 'position'],
  ]
  for (const [table, group, col] of sequences) {
    for (const r of all(`SELECT ${group} AS g, COUNT(*) AS n, MAX(${col}) AS m, MIN(${col}) AS lo FROM ${table} GROUP BY ${group} HAVING n <> m OR lo <> 1`)) {
      error('position-gap', `${table} 里 ${r.g} 的 ${col} 不是从 1 连续编号（共 ${r.n} 行，最大 ${r.m}）`)
    }
  }

  // 每个实体都得有面板内容
  const required: [string, string, string, string][] = [
    ['blocks', 'block_items', 'block_id', '方块文字'], ['blocks', 'block_topics', 'block_id', '会学到'], ['blocks', 'block_courses', 'block_id', '公开课'],
    ['tools', 'tool_topics', 'tool_id', '学什么'], ['tools', 'tool_links', 'tool_id', '官方链接'],
    ['categories', 'category_items', 'category_id', '方块文字'],
    ['subs', 'sub_items', 'sub_id', '方块文字'], ['subs', 'sub_topics', 'sub_id', '具体做什么'], ['subs', 'sub_projects', 'sub_id', '开源项目'],
    ['subs', 'sub_requirements', 'sub_id', '需要的能力块'],
  ]
  for (const [parent, child, fk, what] of required) {
    for (const r of all(`SELECT id FROM ${parent} WHERE id NOT IN (SELECT ${fk} FROM ${child})`)) {
      error('missing-content', `${parent} 里的 ${r.id} 没有“${what}”`)
    }
  }
  for (const r of all('SELECT id FROM subs WHERE id NOT IN (SELECT sub_id FROM sub_tools)')) warning('no-tools', `细分方向 ${r.id} 没写会用到的工具`)
  for (const r of all('SELECT id FROM categories WHERE id NOT IN (SELECT category_id FROM subs)')) error('empty-category', `大方向 ${r.id} 下面没有细分方向`)

  // 没人用的内容
  for (const r of all('SELECT id FROM tools WHERE id NOT IN (SELECT tool_id FROM sub_tools)')) warning('unused-tool', `工具 ${r.id} 没有任何方向用到，页面上永远不会亮`)
  for (const r of all('SELECT id FROM blocks WHERE id NOT IN (SELECT block_id FROM sub_block_closure)')) warning('unused-block', `能力块 ${r.id} 没有任何方向需要，页面上永远不会亮`)
  // 直接要求里写了会被前置自动带上的块，多余
  for (const r of all(`
    SELECT r.sub_id, r.block_id
      FROM sub_requirements r
      JOIN sub_requirements o ON o.sub_id = r.sub_id AND o.block_id <> r.block_id
      JOIN block_ancestors a ON a.block_id = o.block_id AND a.ancestor_id = r.block_id
  `)) {
    warning('redundant-requirement', `细分方向 ${r.sub_id} 直接要求的 ${r.block_id} 已经是其他要求的前置，可以不写`)
  }
  // 链接不重复
  for (const r of all(`
    SELECT url, COUNT(*) AS n FROM (
      SELECT url FROM block_courses UNION ALL SELECT url FROM tool_links UNION ALL SELECT url FROM sub_projects
    ) GROUP BY url HAVING n > 1
  `)) {
    warning('duplicate-url', `链接 ${r.url} 出现了 ${r.n} 次`)
  }
  // 热门方向数量
  const hot = (db.prepare('SELECT COUNT(*) AS n FROM subs WHERE is_hot = 1').get() as Row).n as number
  if (hot < 1 || hot > 4) warning('hot-count', `热门方向有 ${hot} 个，左栏放 1~4 个比较合适`)

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
