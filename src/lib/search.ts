// 页面里的搜索：在内存里搜名字、id、介绍、学会的标志和要学的内容。
// 和服务端 /api/search 的排序规则一样：名字命中最前，其次介绍，再其次列表里的字。
import type { Tree } from './tree.ts'

export interface Hit {
  kind: 'skill' | 'area' | 'sub'
  id: string
  name: string
  /** 小字：在哪里 */
  where: string
  /** 命中的那段文字（名字命中时为空） */
  matched: string
  rank: number
}

export function searchTree(tree: Tree, query: string, limit = 12): Hit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: Hit[] = []
  const has = (s: string) => s.toLowerCase().includes(q)
  for (const s of tree.roadmap.skills) {
    const where = tree.containerName(s.id)
    let rank = -1
    let matched = ''
    if (has(s.name)) rank = s.name.toLowerCase().startsWith(q) ? 0 : 1
    else if (has(s.id)) rank = 2
    else if (has(s.intro)) [rank, matched] = [3, s.intro]
    else {
      const t = [...s.checks, ...s.topics].find(has)
      if (t) [rank, matched] = [4, t]
    }
    if (rank >= 0) hits.push({ kind: 'skill', id: s.id, name: s.name, where, matched, rank })
  }
  for (const a of tree.roadmap.areas) if (has(a.name)) hits.push({ kind: 'area', id: a.id, name: a.name, where: '知识领域', matched: '', rank: 1 })
  for (const s of tree.roadmap.subs) {
    if (has(s.name)) hits.push({ kind: 'sub', id: s.id, name: s.name, where: `方向 · ${tree.categories.get(s.categoryId)!.name}`, matched: '', rank: 1 })
    else if (has(s.intro)) hits.push({ kind: 'sub', id: s.id, name: s.name, where: `方向 · ${tree.categories.get(s.categoryId)!.name}`, matched: s.intro, rank: 3 })
  }
  return hits.sort((a, b) => a.rank - b.rank || a.name.length - b.name.length).slice(0, limit)
}

/** 把命中的文字截成一小段，关键词居中 */
export function snippet(text: string, query: string, width = 28): string {
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (i < 0 || text.length <= width) return text
  const start = Math.max(0, Math.min(i - Math.floor(width / 3), text.length - width))
  return (start > 0 ? '…' : '') + text.slice(start, start + width) + (start + width < text.length ? '…' : '')
}
