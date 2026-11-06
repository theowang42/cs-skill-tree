// 分享链接：把点亮的技能编码进网址的 #share= 里，别人打开就能看到你的技能树（只读）。
// 编码：按技能 id 排序后的位图，再转成 base64url。技能增删后旧链接会对不上，所以带上技能总数做校验。
// 旧链接末尾可能还有“.目标职业”，解析时忽略。
import type { Tree } from './tree.ts'

const PREFIX = '#share='

const sortedIds = (tree: Tree) => tree.roadmap.skills.map((s) => s.id).sort()

export function encodeShare(tree: Tree, lit: ReadonlySet<string>): string {
  const ids = sortedIds(tree)
  const bits = new Uint8Array(Math.ceil(ids.length / 8))
  ids.forEach((id, i) => {
    if (lit.has(id)) bits[i >> 3] |= 1 << (i & 7)
  })
  const b64 = btoa(String.fromCharCode(...bits)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${PREFIX}${ids.length}.${b64}`
}

/** 解析网址的 hash；不是分享链接或对不上时返回 null */
export function decodeShare(tree: Tree, hash: string): Set<string> | null {
  if (!hash.startsWith(PREFIX)) return null
  const [count, data] = hash.slice(PREFIX.length).split('.')
  const ids = sortedIds(tree)
  if (Number(count) !== ids.length || !data) return null
  let bits: Uint8Array
  try {
    bits = Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  } catch {
    return null
  }
  return new Set(ids.filter((_, i) => bits[i >> 3] & (1 << (i & 7))))
}
