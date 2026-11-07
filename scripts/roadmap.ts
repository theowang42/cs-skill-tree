// 把数据库里的内容查成前端用的 Roadmap。每张表一次读完，在内存里归组。
import type { DatabaseSync } from 'node:sqlite'
import type { Link, Resource, Roadmap } from '../src/types.ts'

type Row = Record<string, string | number>

export function getRoadmap(db: DatabaseSync): Roadmap {
  const all = (sql: string) => db.prepare(sql).all() as Row[]
  /** 按 key 归组，保持查询给出的顺序 */
  const group = <T>(sql: string, key: string, map: (r: Row) => T) => {
    const m = new Map<string, T[]>()
    for (const r of all(sql)) m.set(r[key] as string, [...(m.get(r[key] as string) ?? []), map(r)])
    return (id: string) => m.get(id) ?? []
  }
  const id = (r: Row) => r.id as string
  const text = (r: Row) => r.text as string
  const link = (r: Row): Link => ({ label: r.label as string, url: r.url as string })

  // 技能的顺序：领域，再领域内的行，再同一行里的先后。树的布局按这个顺序摆
  const ORDER = 'JOIN areas sa ON sa.id = s.area_id JOIN skill_tiers st ON st.skill_id = s.id'
  const ORDER_BY = 'sa.position, st.tier, s.position'
  const SUB_ORDER = 'JOIN subs sb ON sb.id = x.sub_id JOIN categories sc ON sc.id = sb.category_id'

  const prerequisites = group(`SELECT x.skill_id, s.id FROM skill_prerequisites x JOIN skills s ON s.id = x.prerequisite_id ${ORDER} ORDER BY x.skill_id, ${ORDER_BY}`, 'skill_id', id)
  const dependents = group(`SELECT x.prerequisite_id, s.id FROM skill_prerequisites x JOIN skills s ON s.id = x.skill_id ${ORDER} ORDER BY x.prerequisite_id, ${ORDER_BY}`, 'prerequisite_id', id)
  const resources = group('SELECT * FROM skill_resources ORDER BY skill_id, position', 'skill_id', (r): Resource => ({
    ...link(r),
    kind: (r.kind as string | null) ?? null,
    free: r.is_free === null ? null : r.is_free === 1,
  }))
  const learn = group('SELECT * FROM skill_learn ORDER BY skill_id, position', 'skill_id', text)
  const requiredBy = group(`SELECT x.skill_id, x.sub_id FROM sub_skill_closure x ${SUB_ORDER} ORDER BY x.skill_id, sc.position, sb.position`, 'skill_id', (r) => r.sub_id as string)
  const skills = all(`
    SELECT s.*, w.dependents AS weight
      FROM skills s ${ORDER}
      JOIN skill_weight w ON w.skill_id = s.id
     ORDER BY ${ORDER_BY}`).map((r) => ({
    id: id(r),
    areaId: r.area_id as string,
    name: r.name as string,
    intro: r.intro as string,
    icon: r.icon as string,
    parent: (r.parent_id as string | null) ?? null,
    language: r.is_language === 1,
    weight: r.weight as number,
    prerequisites: prerequisites(id(r)),
    dependents: dependents(id(r)),
    learn: learn(id(r)),
    verify: (r.verify as string | null) ?? null,
    resources: resources(id(r)),
    requiredBy: requiredBy(id(r)),
  }))

  const areas = all('SELECT * FROM areas ORDER BY position').map((r) => ({
    id: id(r),
    name: r.name as string,
    intro: r.intro as string,
    skillIds: skills.filter((s) => s.areaId === r.id).map((s) => s.id),
  }))

  const items = group('SELECT * FROM sub_items ORDER BY sub_id, position', 'sub_id', text)
  const topics = group('SELECT * FROM sub_topics ORDER BY sub_id, position', 'sub_id', text)
  const projects = group('SELECT * FROM sub_projects ORDER BY sub_id, position', 'sub_id', link)
  const required = group(`SELECT x.sub_id, s.id FROM sub_requirements x JOIN skills s ON s.id = x.skill_id ${ORDER} WHERE x.is_bonus = 0 ORDER BY x.sub_id, ${ORDER_BY}`, 'sub_id', id)
  const bonus = group(`SELECT x.sub_id, s.id FROM sub_requirements x JOIN skills s ON s.id = x.skill_id ${ORDER} WHERE x.is_bonus = 1 ORDER BY x.sub_id, ${ORDER_BY}`, 'sub_id', id)
  const plan = group(`SELECT x.sub_id, x.skill_id, x.step FROM sub_learning_plan x JOIN skills s ON s.id = x.skill_id ${ORDER} ORDER BY x.sub_id, x.step, ${ORDER_BY}`, 'sub_id', (r) => ({ skillId: r.skill_id as string, step: r.step as number }))
  const subs = all('SELECT x.* FROM subs x JOIN categories c ON c.id = x.category_id ORDER BY c.position, x.position').map((r) => ({
    id: id(r),
    categoryId: r.category_id as string,
    name: r.name as string,
    intro: r.intro as string,
    icon: r.icon as string,
    isHot: r.is_hot === 1,
    anchor: r.anchor_id as string,
    items: items(id(r)),
    topics: topics(id(r)),
    projects: projects(id(r)),
    requirements: required(id(r)),
    bonus: bonus(id(r)),
    plan: plan(id(r)),
  }))

  const categories = all('SELECT * FROM categories ORDER BY position').map((r) => ({
    id: id(r),
    name: r.name as string,
    intro: r.intro as string,
    subIds: subs.filter((s) => s.categoryId === r.id).map((s) => s.id),
  }))

  return { areas, skills, categories, subs }
}
