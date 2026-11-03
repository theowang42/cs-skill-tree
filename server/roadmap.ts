// 从数据库查出前端要的整棵树，以及单个节点和搜索。
import type { DatabaseSync } from 'node:sqlite'
import type { Block, Category, Layer, Link, Roadmap, Sub, Tool, ToolGroup } from '../src/types.ts'

type Row = Record<string, unknown>

/** 把 (owner_id, text) 行按 owner 归组，保持 position 顺序 */
function groupText(rows: Row[], key: string): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const r of rows) {
    const id = r[key] as string
    if (!m.has(id)) m.set(id, [])
    m.get(id)!.push(r.text as string)
  }
  return m
}

function groupLinks(rows: Row[], key: string): Map<string, Link[]> {
  const m = new Map<string, Link[]>()
  for (const r of rows) {
    const id = r[key] as string
    if (!m.has(id)) m.set(id, [])
    m.get(id)!.push({ label: r.label as string, url: r.url as string })
  }
  return m
}

function groupIds(rows: Row[], key: string, value: string): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const r of rows) {
    const id = r[key] as string
    if (!m.has(id)) m.set(id, [])
    m.get(id)!.push(r[value] as string)
  }
  return m
}

const ordered = (db: DatabaseSync, table: string, owner: string) =>
  db.prepare(`SELECT * FROM ${table} ORDER BY ${owner}, position`).all() as Row[]

export function getLayers(db: DatabaseSync): Layer[] {
  const items = groupText(ordered(db, 'block_items', 'block_id'), 'block_id')
  const topics = groupText(ordered(db, 'block_topics', 'block_id'), 'block_id')
  const courses = groupLinks(ordered(db, 'block_courses', 'block_id'), 'block_id')
  const prereqs = groupIds(
    db.prepare('SELECT p.block_id, p.prerequisite_id FROM block_prerequisites p JOIN blocks b ON b.id = p.prerequisite_id JOIN layers l ON l.id = b.layer_id ORDER BY p.block_id, l.position, b.position').all() as Row[],
    'block_id', 'prerequisite_id',
  )
  const unlocks = groupIds(
    db.prepare('SELECT u.block_id, u.sub_id FROM block_unlocks u JOIN subs s ON s.id = u.sub_id JOIN categories c ON c.id = s.category_id ORDER BY u.block_id, c.position, s.position').all() as Row[],
    'block_id', 'sub_id',
  )
  const blocks = db.prepare('SELECT * FROM blocks ORDER BY layer_id, position').all() as Row[]
  const layers = db.prepare('SELECT * FROM layers ORDER BY position').all() as Row[]
  return layers.map((l) => ({
    id: l.id as string,
    name: l.name as string,
    position: l.position as number,
    blocks: blocks
      .filter((b) => b.layer_id === l.id)
      .map<Block>((b) => ({
        id: b.id as string,
        layerId: l.id as string,
        name: b.name as string,
        intro: b.intro as string,
        items: items.get(b.id as string) ?? [],
        prerequisites: prereqs.get(b.id as string) ?? [],
        topics: topics.get(b.id as string) ?? [],
        courses: courses.get(b.id as string) ?? [],
        unlocks: unlocks.get(b.id as string) ?? [],
      })),
  }))
}

export function getToolGroups(db: DatabaseSync): ToolGroup[] {
  const topics = groupText(ordered(db, 'tool_topics', 'tool_id'), 'tool_id')
  const links = groupLinks(ordered(db, 'tool_links', 'tool_id'), 'tool_id')
  const usedBy = groupIds(
    db.prepare('SELECT t.tool_id, t.sub_id FROM sub_tools t JOIN subs s ON s.id = t.sub_id JOIN categories c ON c.id = s.category_id ORDER BY t.tool_id, c.position, s.position').all() as Row[],
    'tool_id', 'sub_id',
  )
  const tools = db.prepare('SELECT * FROM tools ORDER BY group_id, position').all() as Row[]
  const groups = db.prepare('SELECT * FROM tool_groups ORDER BY position').all() as Row[]
  return groups.map((g) => ({
    id: g.id as string,
    name: g.name as string,
    shortName: g.short_name as string,
    tools: tools
      .filter((t) => t.group_id === g.id)
      .map<Tool>((t) => ({
        id: t.id as string,
        groupId: g.id as string,
        name: t.name as string,
        org: t.org as string,
        intro: t.intro as string,
        topics: topics.get(t.id as string) ?? [],
        links: links.get(t.id as string) ?? [],
        usedBy: usedBy.get(t.id as string) ?? [],
      })),
  }))
}

export function getCategories(db: DatabaseSync): Category[] {
  const catItems = groupText(ordered(db, 'category_items', 'category_id'), 'category_id')
  const items = groupText(ordered(db, 'sub_items', 'sub_id'), 'sub_id')
  const topics = groupText(ordered(db, 'sub_topics', 'sub_id'), 'sub_id')
  const projects = groupLinks(ordered(db, 'sub_projects', 'sub_id'), 'sub_id')
  const requirements = groupIds(
    db.prepare('SELECT r.sub_id, r.block_id FROM sub_requirements r JOIN blocks b ON b.id = r.block_id JOIN layers l ON l.id = b.layer_id ORDER BY r.sub_id, l.position DESC, b.position').all() as Row[],
    'sub_id', 'block_id',
  )
  const tools = groupIds(
    db.prepare('SELECT s.sub_id, s.tool_id FROM sub_tools s JOIN tools t ON t.id = s.tool_id JOIN tool_groups g ON g.id = t.group_id ORDER BY s.sub_id, g.position, t.position').all() as Row[],
    'sub_id', 'tool_id',
  )
  const plans = new Map<string, { blockId: string; step: number }[]>()
  for (const r of db.prepare('SELECT p.sub_id, p.block_id, p.step FROM sub_learning_plan p JOIN blocks b ON b.id = p.block_id JOIN layers l ON l.id = b.layer_id ORDER BY p.sub_id, p.step, l.position, b.position').all() as Row[]) {
    const id = r.sub_id as string
    if (!plans.has(id)) plans.set(id, [])
    plans.get(id)!.push({ blockId: r.block_id as string, step: r.step as number })
  }
  const subs = db.prepare('SELECT * FROM subs ORDER BY category_id, position').all() as Row[]
  const categories = db.prepare('SELECT * FROM categories ORDER BY position').all() as Row[]
  return categories.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    intro: c.intro as string,
    items: catItems.get(c.id as string) ?? [],
    subs: subs
      .filter((s) => s.category_id === c.id)
      .map<Sub>((s) => ({
        id: s.id as string,
        categoryId: c.id as string,
        name: s.name as string,
        intro: s.intro as string,
        items: items.get(s.id as string) ?? [],
        isHot: s.is_hot === 1,
        requirements: requirements.get(s.id as string) ?? [],
        tools: tools.get(s.id as string) ?? [],
        topics: topics.get(s.id as string) ?? [],
        projects: projects.get(s.id as string) ?? [],
        plan: plans.get(s.id as string) ?? [],
      })),
  }))
}

export function getRoadmap(db: DatabaseSync): Roadmap {
  return {
    generatedAt: new Date().toISOString(),
    layers: getLayers(db),
    toolGroups: getToolGroups(db),
    categories: getCategories(db),
  }
}

export const findBlock = (db: DatabaseSync, id: string) => getLayers(db).flatMap((l) => l.blocks).find((b) => b.id === id)
export const findTool = (db: DatabaseSync, id: string) => getToolGroups(db).flatMap((g) => g.tools).find((t) => t.id === id)
export const findCategory = (db: DatabaseSync, id: string) => getCategories(db).find((c) => c.id === id)
export const findSub = (db: DatabaseSync, id: string) => getCategories(db).flatMap((c) => c.subs).find((s) => s.id === id)

export interface SearchHit {
  kind: 'category' | 'sub' | 'tool' | 'block'
  id: string
  name: string
  /** 命中的那段文字 */
  matched: string
}

/** 在名字、介绍、方块文字和面板列表里做不区分大小写的子串搜索 */
export function search(db: DatabaseSync, query: string, limit = 20): SearchHit[] {
  const q = `%${query.trim().toLowerCase()}%`
  if (q === '%%') return []
  const sql = `
    SELECT kind, id, name, matched FROM (
      SELECT 'category' AS kind, id, name, name AS matched, 0 AS rank FROM categories WHERE lower(name) LIKE ?1
      UNION ALL SELECT 'sub',   id, name, name,  0 FROM subs   WHERE lower(name) LIKE ?1
      UNION ALL SELECT 'tool',  id, name, name,  0 FROM tools  WHERE lower(name) LIKE ?1
      UNION ALL SELECT 'block', id, name, name,  0 FROM blocks WHERE lower(name) LIKE ?1
      UNION ALL SELECT 'category', id, name, intro, 1 FROM categories WHERE lower(intro) LIKE ?1
      UNION ALL SELECT 'sub',   id, name, intro, 1 FROM subs   WHERE lower(intro) LIKE ?1
      UNION ALL SELECT 'tool',  id, name, intro, 1 FROM tools  WHERE lower(intro) LIKE ?1
      UNION ALL SELECT 'block', id, name, intro, 1 FROM blocks WHERE lower(intro) LIKE ?1
      UNION ALL SELECT 'sub',   s.id, s.name, i.text, 2 FROM sub_items i   JOIN subs s   ON s.id = i.sub_id     WHERE lower(i.text) LIKE ?1
      UNION ALL SELECT 'sub',   s.id, s.name, i.text, 2 FROM sub_topics i  JOIN subs s   ON s.id = i.sub_id     WHERE lower(i.text) LIKE ?1
      UNION ALL SELECT 'tool',  t.id, t.name, i.text, 2 FROM tool_topics i JOIN tools t  ON t.id = i.tool_id    WHERE lower(i.text) LIKE ?1
      UNION ALL SELECT 'block', b.id, b.name, i.text, 2 FROM block_items i JOIN blocks b ON b.id = i.block_id   WHERE lower(i.text) LIKE ?1
      UNION ALL SELECT 'block', b.id, b.name, i.text, 2 FROM block_topics i JOIN blocks b ON b.id = i.block_id  WHERE lower(i.text) LIKE ?1
      UNION ALL SELECT 'block', b.id, b.name, c.label, 3 FROM block_courses c JOIN blocks b ON b.id = c.block_id WHERE lower(c.label) LIKE ?1
    )
    GROUP BY kind, id
    ORDER BY MIN(rank), name
    LIMIT ?2
  `
  return db.prepare(sql).all(q, limit) as unknown as SearchHit[]
}
