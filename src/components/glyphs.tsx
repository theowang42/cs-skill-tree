// 树上和面板里共用的画法：图标、六边形、技能槽。
import type { SkillState } from '../types'
import { ICONS } from '../generated/icons'
import { hexPath } from '../lib/layout'

export function SkillGlyph({ icon, size }: { icon: string; size: number }) {
  const spec = ICONS[icon]
  if (spec.kind === 'lucide') return <spec.Icon width={size} height={size} strokeWidth={1.7} absoluteStrokeWidth aria-hidden />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={spec.path} fill="currentColor" />
    </svg>
  )
}

/** 面板里的技能槽：和树上的节点同一个形状、同一套状态画法。卡头用大的，列表里用小的 */
export function SkillSlot({ icon, language, state, size = 96 }: { icon: string; language: boolean; state: SkillState; size?: number }) {
  const R = 34
  return (
    <svg className={`slot s-${state}`} width={size} height={size} viewBox="-48 -48 96 96" aria-hidden>
      {language ? <path className="slot-box" d={hexPath(R + 2)} /> : <circle className="slot-box" r={R} />}
      <foreignObject x={-16} y={-16} width="32" height="32">
        <div className="slot-glyph"><SkillGlyph icon={icon} size={32} /></div>
      </foreignObject>
    </svg>
  )
}
