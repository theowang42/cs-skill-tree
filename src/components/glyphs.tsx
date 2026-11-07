// 树上和面板里共用的画法：图标、点亮后的光芒、六边形、技能槽。
import type { SkillState } from '../types'
import { ICONS } from '../generated/icons'

export function SkillGlyph({ icon, size }: { icon: string; size: number }) {
  const spec = ICONS[icon]
  if (spec.kind === 'lucide') return <spec.Icon width={size} height={size} strokeWidth={1.7} absoluteStrokeWidth aria-hidden />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={spec.path} fill="currentColor" />
    </svg>
  )
}

/** 每个节点的光芒转到不同的角度，整张图不会齐刷刷一起转 */
function orbitDelay(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return `${-(Math.abs(h) % 2800)}ms`
}

/**
 * 点亮了：外面一圈向外放射的光芒（长短相间的短线，像太阳），整圈慢慢旋转。
 * r 是光芒从哪里开始；id 决定转到哪个角度，不给就从 0 开始。
 */
export function Rays({ r, id, count = 24, long = 9, short = 5, className = '' }: { r: number; id?: string; count?: number; long?: number; short?: number; className?: string }) {
  return (
    <g className={`rays ${className}`} aria-hidden>
      <g className="rays-spin" style={{ animationDelay: id && orbitDelay(id) }}>
        {Array.from({ length: count }, (_, i) => {
          const a = (Math.PI * 2 * i) / count
          const len = i % 2 === 0 ? long : short
          const c = Math.cos(a)
          const s = Math.sin(a)
          return <line key={i} x1={(c * r).toFixed(1)} y1={(s * r).toFixed(1)} x2={(c * (r + len)).toFixed(1)} y2={(s * (r + len)).toFixed(1)} />
        })}
      </g>
    </g>
  )
}

/** 六边形（编程语言）：尖朝上，外接圆半径 r */
export const hexPath = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ') + 'Z'

/** 面板里的技能槽：和树上的节点同一个形状、同一套状态画法。卡头用大的，列表里用小的 */
export function SkillSlot({ uid, icon, language, state, size = 96 }: { uid: string; icon: string; language: boolean; state: SkillState; size?: number }) {
  const R = 34
  return (
    <svg className={`slot s-${state}`} width={size} height={size} viewBox="-48 -48 96 96" aria-hidden>
      {language ? <path className="slot-box" d={hexPath(R + 2)} /> : <circle className="slot-box" r={R} />}
      {state === 'done' && <Rays r={R + 5} id={uid} />}
      <foreignObject x={-16} y={-16} width="32" height="32">
        <div className="slot-glyph"><SkillGlyph icon={icon} size={32} /></div>
      </foreignObject>
    </svg>
  )
}
