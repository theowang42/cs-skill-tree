import { ICONS, MONOGRAMS, STROKE_ICONS } from '../lib/icons'

/** 工具的图标：Simple Icons 有的用它，没有的自己画或显示缩写 */
export function ToolIcon({ id }: { id: string }) {
  const icon = ICONS[id]
  if (icon) {
    return (
      <svg className="icon" viewBox="0 0 24 24" aria-hidden>
        <path d={icon.path} />
      </svg>
    )
  }
  const stroke = STROKE_ICONS[id]
  if (stroke) {
    return (
      <svg className="icon stroke" viewBox="0 0 24 24" aria-hidden>
        {stroke.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
  }
  return <span className="icon mono">{MONOGRAMS[id] ?? id.slice(0, 2).toUpperCase()}</span>
}
