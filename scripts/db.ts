// 建库和体检：在内存里建一个空库，跑 db/schema.sql 和 db/seed/*.sql，再检查表约束管不到的事。
import { DatabaseSync } from 'node:sqlite'
import { readdirSync, readFileSync } from 'node:fs'

const DB = new URL('../db/', import.meta.url)

/**
 * 建好并灌完内容的内存数据库。
 * 前置可以引用写在后面的技能，所以灌的时候不查外键，灌完再整体核对，指出是哪张表的哪一行对不上。
 */
export function build(): DatabaseSync {
  const seed = new URL('seed/', DB)
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false })
  db.exec(readFileSync(new URL('schema.sql', DB), 'utf8'))
  for (const name of readdirSync(seed).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      db.exec(readFileSync(new URL(name, seed), 'utf8'))
    } catch (e) {
      throw new Error(`种子文件 ${name} 出错：${(e as Error).message}`)
    }
  }
  const broken = db.prepare('PRAGMA foreign_key_check').all() as { table: string; parent: string; rowid: number }[]
  if (broken.length) {
    const sample = broken.slice(0, 5).map((b) => `${b.table} 第 ${b.rowid} 行 → ${b.parent}`).join('；')
    throw new Error(`种子里有 ${broken.length} 处引用对不上（多半是 id 拼错了）：${sample}`)
  }
  return db
}

interface Finding {
  level: 'error' | 'warning'
  message: string
}

/** error 让构建失败；warning 只是提醒 */
export function check(db: DatabaseSync): Finding[] {
  const findings: Finding[] = []
  const rows = (sql: string) => db.prepare(sql).all() as Record<string, string | number>[]
  const error = (sql: string, message: (r: Record<string, string | number>) => string) => {
    for (const r of rows(sql)) findings.push({ level: 'error', message: message(r) })
  }
  const warning = (sql: string, message: (r: Record<string, string | number>) => string) => {
    for (const r of rows(sql)) findings.push({ level: 'warning', message: message(r) })
  }

  // ── 前置关系 ──
  error('SELECT skill_id FROM skill_ancestors WHERE skill_id = ancestor_id', (r) => `技能 ${r.skill_id} 的前置绕了一圈又回到了自己`)
  error(
    'SELECT id, parent_id FROM skills WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT prerequisite_id FROM skill_prerequisites WHERE skill_id = skills.id)',
    (r) => `技能 ${r.id} 挂在 ${r.parent_id} 上，但 ${r.parent_id} 不是它的前置`,
  )
  error(
    'SELECT id, anchor_id FROM subs WHERE anchor_id NOT IN (SELECT skill_id FROM sub_requirements WHERE sub_id = subs.id AND is_bonus = 0)',
    (r) => `职业 ${r.id} 挂在 ${r.anchor_id} 上，但那不是它必学的技能`,
  )
  warning(
    `SELECT p.skill_id, p.prerequisite_id, o.prerequisite_id AS via
       FROM skill_prerequisites p
       JOIN skill_prerequisites o ON o.skill_id = p.skill_id AND o.prerequisite_id <> p.prerequisite_id
       JOIN skill_ancestors a ON a.skill_id = o.prerequisite_id AND a.ancestor_id = p.prerequisite_id`,
    (r) => `技能 ${r.skill_id} 的前置 ${r.prerequisite_id} 已经是 ${r.via} 的前置，可以不写`,
  )

  // ── 内容齐不齐 ──
  error('SELECT id FROM skills WHERE id NOT IN (SELECT skill_id FROM skill_resources)', (r) => `技能 ${r.id} 没有“去哪学”的链接`)
  error('SELECT id FROM categories WHERE id NOT IN (SELECT category_id FROM subs)', (r) => `大方向 ${r.id} 下面没有职业`)
  error('SELECT id FROM subs WHERE id NOT IN (SELECT sub_id FROM sub_projects)', (r) => `职业 ${r.id} 没有代表项目`)
  warning('SELECT id, length(intro) AS n FROM skills WHERE length(intro) > 50', (r) => `技能 ${r.id} 的一句话有 ${r.n} 个字，最好控制在 50 字以内`)
  // 技能的一句话写掌握到什么程度：会做什么，能做到什么
  warning("SELECT id FROM skills WHERE intro NOT LIKE '会%能%'", (r) => `技能 ${r.id} 的一句话要写成“会……，能……”，说清掌握到什么程度`)
  // 名字的显示宽度：中文算 2，英文数字算 1。树上节点下面放得下 16
  for (const r of rows('SELECT id, name FROM skills')) {
    const width = [...String(r.name)].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
    if (width > 16) findings.push({ level: 'warning', message: `技能 ${r.id} 的名字“${r.name}”太长，树上放不下` })
  }
  warning(
    `SELECT id FROM skills WHERE id NOT IN (SELECT skill_id FROM skill_prerequisites)
       AND id NOT IN (SELECT prerequisite_id FROM skill_prerequisites)
       AND id NOT IN (SELECT skill_id FROM sub_requirements)`,
    (r) => `技能 ${r.id} 既没有前置，也不是任何技能的前置`,
  )
  warning(
    'SELECT id FROM skills WHERE id NOT IN (SELECT skill_id FROM sub_skill_closure) AND id NOT IN (SELECT skill_id FROM sub_requirements)',
    (r) => `技能 ${r.id} 没有任何职业用到`,
  )

  // ── 职业的要求写得对不对 ──
  warning(
    `SELECT r.sub_id, r.skill_id, o.skill_id AS via
       FROM sub_requirements r
       JOIN sub_requirements o ON o.sub_id = r.sub_id AND o.skill_id <> r.skill_id AND o.is_bonus = 0
       JOIN skill_ancestors a ON a.skill_id = o.skill_id AND a.ancestor_id = r.skill_id
      WHERE r.is_bonus = 0`,
    (r) => `职业 ${r.sub_id} 必学的 ${r.skill_id} 已经是 ${r.via} 的前置，可以不写`,
  )
  error(
    'SELECT r.sub_id, r.skill_id FROM sub_requirements r JOIN sub_skill_closure c USING (sub_id, skill_id) WHERE r.is_bonus = 1',
    (r) => `职业 ${r.sub_id} 的加分项 ${r.skill_id} 已经是必学的了`,
  )

  // ── 链接 ──
  warning(
    'SELECT url, COUNT(*) AS n FROM (SELECT url FROM skill_resources UNION ALL SELECT url FROM sub_projects) GROUP BY url HAVING n > 1',
    (r) => `链接 ${r.url} 出现了 ${r.n} 次`,
  )
  return findings
}
