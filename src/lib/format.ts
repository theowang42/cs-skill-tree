import type { SkillState } from '../types.ts'

export const STATE_LABEL: Record<SkillState, string> = {
  locked: '前置未满足',
  available: '可以点亮了',
  done: '已点亮',
}

/** “3 分钟前”这类相对时间 */
export function ago(iso: string, now = Date.now()): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`
  return new Date(t).toLocaleDateString('zh-CN')
}

export const pct = (n: number) => `${Math.round(n)}%`
