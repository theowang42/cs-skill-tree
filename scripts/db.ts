// 建库和体检：在内存里建一个空库，跑 db/schema.sql，灌 content/ 里的内容，再检查表约束管不到的事。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { load, type Content } from './content.ts'

/** 建好并灌完内容的内存数据库。前置可以引用排在后面的技能，所以外键等整体灌完再核对 */
export function build(content: Content = load()): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
  const insert = (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return
    const cols = Object.keys(rows[0])
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    for (const r of rows) {
      try {
        stmt.run(...(cols.map((c) => r[c]) as never[]))
      } catch (e) {
        throw new Error(`${table} 里的 ${r.id ?? r.skill_id ?? r.sub_id}：${(e as Error).message}`)
      }
    }
  }
  const flag = (b: boolean | null) => (b === null ? null : Number(b))
  const { areas, skills, categories, careers } = content
  const areaOf = new Map(areas.flatMap((a) => a.skills.map((id, i) => [id, { area: a.id, position: i + 1 }] as const)))
  const categoryOf = new Map(categories.flatMap((c) => c.careers.map((id, i) => [id, { category: c.id, position: i + 1 }] as const)))

  db.exec('BEGIN; PRAGMA defer_foreign_keys = ON')
  insert('areas', areas.map((a) => ({ id: a.id, position: a.order, name: a.name, intro: a.intro })))
  insert('skills', skills.map((s) => ({
    id: s.id, area_id: areaOf.get(s.id)!.area, position: areaOf.get(s.id)!.position, icon: s.icon, name: s.name, intro: s.intro,
    parent_id: s.requires[0] ?? null, is_language: Number(s.language),
  })))
  insert('skill_prerequisites', skills.flatMap((s) => s.requires.map((p) => ({ skill_id: s.id, prerequisite_id: p }))))
  insert('skill_steps', skills.flatMap((s) => s.steps.map((text, i) => ({ skill_id: s.id, position: i + 1, text }))))
  insert('skill_resources', skills.flatMap((s) => s.resources.map((r, i) => ({ skill_id: s.id, position: i + 1, label: r.label, url: r.url, kind: r.kind, is_free: flag(r.free) }))))
  insert('categories', categories.map((c) => ({ id: c.id, position: c.order, name: c.name, intro: c.intro })))
  insert('subs', careers.map((c) => ({
    id: c.id, category_id: categoryOf.get(c.id)!.category, position: categoryOf.get(c.id)!.position, icon: c.icon, name: c.name, intro: c.intro,
    is_hot: Number(c.hot), anchor_id: c.requires[0],
  })))
  insert('sub_items', careers.flatMap((c) => c.keywords.map((text, i) => ({ sub_id: c.id, position: i + 1, text }))))
  insert('sub_topics', careers.flatMap((c) => c.topics.map((text, i) => ({ sub_id: c.id, position: i + 1, text }))))
  insert('sub_projects', careers.flatMap((c) => c.projects.map((l, i) => ({ sub_id: c.id, position: i + 1, label: l.label, url: l.url }))))
  insert('sub_requirements', careers.flatMap((c) => [
    ...c.requires.map((id) => ({ sub_id: c.id, skill_id: id, is_bonus: 0 })),
    ...c.bonus.map((id) => ({ sub_id: c.id, skill_id: id, is_bonus: 1 })),
  ]))
  db.exec('COMMIT')
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
  // 学习流程：4 到 6 步，每步一个短语；写了流程，资源也要标上类型和是否免费
  error(
    'SELECT skill_id, COUNT(*) AS n FROM skill_steps GROUP BY skill_id HAVING n NOT BETWEEN 4 AND 6',
    (r) => `技能 ${r.skill_id} 的学习流程有 ${r.n} 步，要 4 到 6 步`,
  )
  warning('SELECT skill_id, text FROM skill_steps WHERE length(text) > 14', (r) => `技能 ${r.skill_id} 的一步“${r.text}”太长，14 个字以内`)
  error(
    'SELECT DISTINCT skill_id FROM skill_resources WHERE (kind IS NULL OR is_free IS NULL) AND skill_id IN (SELECT skill_id FROM skill_steps)',
    (r) => `技能 ${r.skill_id} 写了学习流程，“去哪学”的每个链接也要标上类型和免费 / 付费`,
  )
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
