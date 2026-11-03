// 分享链接：把“学会了”的技能编码进 URL 的 #share= 里，别人打开就能看到你的技能树（只读）。
// 编码：按技能 id 排序后的位图，再转成 base64url。技能增删后旧链接会对不上，所以带上技能总数做校验。
import type { Progress } from '../types.ts'
import type { Tree } from './tree.ts'

const PREFIX = 'share='

function sortedIds(tree: Tree) {
  return tree.roadmap.skills.map((s) => s.id).sort()
}

function toBase64Url(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodeShare(tree: Tree, progress: Progress): string {
  const ids = sortedIds(tree)
  const bits = new Uint8Array(Math.ceil(ids.length / 8))
  ids.forEach((id, i) => {
    if (progress.skills[id]?.status === 'done') bits[i >> 3] |= 1 << (i & 7)
  })
  const goal = progress.goalSubId ? `.${progress.goalSubId}` : ''
  return `${PREFIX}${ids.length}.${toBase64Url(bits)}${goal}`
}

/** 解析 hash；不是分享链接或对不上时返回 null */
export function decodeShare(tree: Tree, hash: string): Progress | null {
  const h = hash.replace(/^#/, '')
  if (!h.startsWith(PREFIX)) return null
  const [count, data, goal] = h.slice(PREFIX.length).split('.')
  const ids = sortedIds(tree)
  if (Number(count) !== ids.length || !data) return null
  let bits: Uint8Array
  try {
    bits = fromBase64Url(data)
  } catch {
    return null
  }
  const skills: Progress['skills'] = {}
  ids.forEach((id, i) => {
    if (bits[i >> 3] & (1 << (i & 7))) skills[id] = { status: 'done', updatedAt: '' }
  })
  return { goalSubId: goal && tree.subs.has(goal) ? goal : null, skills }
}
