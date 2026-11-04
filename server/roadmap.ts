// 从数据库查出整棵树（Roadmap），以及搜索。查询都是一次性把一张表读完再在内存里归组，
// 总共二十来条 SQL，导出一次几毫秒。
import type { DatabaseSync } from 'node:sqlite'
import type { Area, Category, Layer, Link, Roadmap, Skill, Sub, ToolGroup } from '../src/types.ts'

type Row = Record<string, unknown>

function all(db: DatabaseSync, sql: string, ...params: (string | number)[]): Row[] {
  return db.prepare(sql).all(...params) as Row[]
}

/** 按 key 归组，保持查询给出的顺序 */
function groupBy<T>(rows: Row[], key: string, map: (r: Row) => T): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const k = r[key] as string
    let list = m.get(k)
    if (!list) m.set(k, (list = []))
    list.push(map(r))
  }
  return m
}

const text = (r: Row) => r.text as string
const link = (r: Row): Link => ({ label: r.label as string, url: r.url as string })

// 页面上的排序：领域按层和位置，工具组按位置，方向按大方向和位置
const SKILL_ORDER = `
  LEFT JOIN areas sa ON sa.id = s.area_id
  LEFT JOIN layers sl ON sl.id = sa.layer_id
  LEFT JOIN tool_groups sg ON sg.id = s.group_id
  JOIN skill_tiers st ON st.skill_id = s.id
  JOIN skill_depth sd ON sd.skill_id = s.id`
const SKILL_ORDER_BY = 'COALESCE(sl.position, 99), sa.position, sg.position, st.tier, s.position'
const SUB_ORDER = 'JOIN subs sb ON sb.id = x.sub_id JOIN categories sc ON sc.id = sb.category_id'
const SUB_ORDER_BY = 'sc.position, sb.position'

export function getSkills(db: DatabaseSync): Skill[] {
  const checks = groupBy(all(db, 'SELECT * FROM skill_checks ORDER BY skill_id, position'), 'skill_id', text)
  const topics = groupBy(all(db, 'SELECT * FROM skill_topics ORDER BY skill_id, position'), 'skill_id', text)
  const resources = groupBy(all(db, 'SELECT * FROM skill_resources ORDER BY skill_id, position'), 'skill_id', link)
  const prereqs = groupBy(
    all(db, `SELECT x.skill_id, s.id FROM skill_prerequisites x JOIN skills s ON s.id = x.prerequisite_id ${SKILL_ORDER} ORDER BY x.skill_id, ${SKILL_ORDER_BY}`),
    'skill_id', (r) => r.id as string,
  )
  const dependents = groupBy(
    all(db, `SELECT x.prerequisite_id, s.id FROM skill_prerequisites x JOIN skills s ON s.id = x.skill_id ${SKILL_ORDER} ORDER BY x.prerequisite_id, ${SKILL_ORDER_BY}`),
    'prerequisite_id', (r) => r.id as string,
  )
  const requiredBy = groupBy(
    all(db, `SELECT x.skill_id, x.sub_id FROM skill_unlocks x ${SUB_ORDER} ORDER BY x.skill_id, ${SUB_ORDER_BY}`),
    'skill_id', (r) => r.sub_id as string,
  )
  const rows = all(db, `
    SELECT s.*, st.tier, sd.depth, w.dependents AS weight
      FROM skills s ${SKILL_ORDER}
      JOIN skill_weight w ON w.skill_id = s.id
     ORDER BY ${SKILL_ORDER_BY}`)
  return rows.map((r) => {
    const id = r.id as string
    const skill: Skill = {
      id,
      kind: r.kind as Skill['kind'],
      name: r.name as string,
      intro: r.intro as string,
      tier: r.tier as number,
      depth: r.depth as number,
      prerequisites: prereqs.get(id) ?? [],
      dependents: dependents.get(id) ?? [],
      weight: r.weight as number,
      checks: checks.get(id) ?? [],
      topics: topics.get(id) ?? [],
      resources: resources.get(id) ?? [],
      requiredBy: requiredBy.get(id) ?? [],
    }
    if (r.org) skill.org = r.org as string
    if (r.area_id) skill.areaId = r.area_id as string
    if (r.group_id) skill.groupId = r.group_id as string
    return skill
  })
}

export function getRoadmap(db: DatabaseSync): Roadmap {
  const skills = getSkills(db)
  const byArea = new Map<string, string[]>()
  const byGroup = new Map<string, string[]>()
  for (const s of skills) {
    const [m, k] = s.areaId ? [byArea, s.areaId] : [byGroup, s.groupId!]
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(s.id)
  }

  const courses = groupBy(all(db, 'SELECT * FROM area_courses ORDER BY area_id, position'), 'area_id', link)
  const areaRows = all(db, 'SELECT a.* FROM areas a JOIN layers l ON l.id = a.layer_id ORDER BY l.position, a.position')
  const areas: Area[] = areaRows.map((r) => ({
    id: r.id as string,
    layerId: r.layer_id as string,
    name: r.name as string,
    intro: r.intro as string,
    courses: courses.get(r.id as string) ?? [],
    skillIds: byArea.get(r.id as string) ?? [],
  }))
  const layers: Layer[] = all(db, 'SELECT * FROM layers ORDER BY position').map((r) => ({
    id: r.id as string,
    name: r.name as string,
    position: r.position as number,
    areaIds: areas.filter((a) => a.layerId === r.id).map((a) => a.id),
  }))
  const toolGroups: ToolGroup[] = all(db, 'SELECT * FROM tool_groups ORDER BY position').map((r) => ({
    id: r.id as string,
    name: r.name as string,
    shortName: r.short_name as string,
    skillIds: byGroup.get(r.id as string) ?? [],
  }))

  const subItems = groupBy(all(db, 'SELECT * FROM sub_items ORDER BY sub_id, position'), 'sub_id', text)
  const subTopics = groupBy(all(db, 'SELECT * FROM sub_topics ORDER BY sub_id, position'), 'sub_id', text)
  const projects = groupBy(all(db, 'SELECT * FROM sub_projects ORDER BY sub_id, position'), 'sub_id', link)
  const requirements = groupBy(
    all(db, `SELECT x.sub_id, s.id FROM sub_requirements x JOIN skills s ON s.id = x.skill_id ${SKILL_ORDER} WHERE x.choice IS NULL ORDER BY x.sub_id, ${SKILL_ORDER_BY}`),
    'sub_id', (r) => r.id as string,
  )
  // 任选组：真正要挑一个的组在前，“加分项”放最后；同类按组名排，组里按页面顺序
  const choiceRows = all(db, `SELECT x.sub_id, x.choice, s.id FROM sub_requirements x JOIN skills s ON s.id = x.skill_id ${SKILL_ORDER} WHERE x.choice IS NOT NULL ORDER BY x.sub_id, x.choice = '加分项', x.choice, ${SKILL_ORDER_BY}`)
  const choices = new Map<string, { label: string; options: string[] }[]>()
  for (const r of choiceRows) {
    const list = choices.get(r.sub_id as string) ?? []
    choices.set(r.sub_id as string, list)
    let group = list.find((g) => g.label === r.choice)
    if (!group) list.push((group = { label: r.choice as string, options: [] }))
    group.options.push(r.id as string)
  }
  const plans = groupBy(
    all(db, `SELECT x.sub_id, x.skill_id, x.step FROM sub_learning_plan x JOIN skills s ON s.id = x.skill_id ${SKILL_ORDER} ORDER BY x.sub_id, x.step, ${SKILL_ORDER_BY}`),
    'sub_id', (r) => ({ skillId: r.skill_id as string, step: r.step as number }),
  )
  const subRows = all(db, 'SELECT x.* FROM subs x JOIN categories c ON c.id = x.category_id ORDER BY c.position, x.position')
  const subs: Sub[] = subRows.map((r) => {
    const id = r.id as string
    return {
      id,
      categoryId: r.category_id as string,
      name: r.name as string,
      intro: r.intro as string,
      isHot: r.is_hot === 1,
      items: subItems.get(id) ?? [],
      topics: subTopics.get(id) ?? [],
      projects: projects.get(id) ?? [],
      requirements: requirements.get(id) ?? [],
      choices: choices.get(id) ?? [],
      plan: plans.get(id) ?? [],
    }
  })
  const catItems = groupBy(all(db, 'SELECT * FROM category_items ORDER BY category_id, position'), 'category_id', text)
  const categories: Category[] = all(db, 'SELECT * FROM categories ORDER BY position').map((r) => ({
    id: r.id as string,
    name: r.name as string,
    intro: r.intro as string,
    items: catItems.get(r.id as string) ?? [],
    subIds: subs.filter((s) => s.categoryId === r.id).map((s) => s.id),
  }))

  return { version: 2, generatedAt: new Date().toISOString(), layers, areas, toolGroups, skills, categories, subs }
}

export interface SearchHit {
  kind: 'skill' | 'area' | 'sub' | 'category'
  id: string
  name: string
  /** 命中的那段文字 */
  matched: string
}

/**
 * 在名字、介绍、学会的标志、要学的内容、资料标题里做不区分大小写的子串搜索。
 * 名字命中排最前，其次是介绍，再其次是列表里的文字。
 */
export function search(db: DatabaseSync, query: string, limit = 20): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // LIKE 的通配符要转义，否则搜“100%”会匹配一切
  const pattern = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`
  const like = (col: string) => `lower(${col}) LIKE ?1 ESCAPE '\\'`
  const sql = `
    SELECT kind, id, name, matched FROM (
      SELECT 'skill' AS kind, id, name, name AS matched, 0 AS rank FROM skills WHERE ${like('name')}
      UNION ALL SELECT 'area', id, name, name, 0 FROM areas WHERE ${like('name')}
      UNION ALL SELECT 'sub', id, name, name, 0 FROM subs WHERE ${like('name')}
      UNION ALL SELECT 'category', id, name, name, 0 FROM categories WHERE ${like('name')}
      UNION ALL SELECT 'skill', id, name, id, 1 FROM skills WHERE ${like('id')}
      UNION ALL SELECT 'skill', id, name, intro, 2 FROM skills WHERE ${like('intro')}
      UNION ALL SELECT 'sub', id, name, intro, 2 FROM subs WHERE ${like('intro')}
      UNION ALL SELECT 'skill', s.id, s.name, x.text, 3 FROM skill_checks x JOIN skills s ON s.id = x.skill_id WHERE ${like('x.text')}
      UNION ALL SELECT 'skill', s.id, s.name, x.text, 3 FROM skill_topics x JOIN skills s ON s.id = x.skill_id WHERE ${like('x.text')}
      UNION ALL SELECT 'skill', s.id, s.name, x.label, 4 FROM skill_resources x JOIN skills s ON s.id = x.skill_id WHERE ${like('x.label')}
      UNION ALL SELECT 'sub', s.id, s.name, x.text, 3 FROM sub_topics x JOIN subs s ON s.id = x.sub_id WHERE ${like('x.text')}
    )
    GROUP BY kind, id
    ORDER BY MIN(rank), length(name), name
    LIMIT ?2
  `
  return db.prepare(sql).all(pattern, limit) as unknown as SearchHit[]
}
