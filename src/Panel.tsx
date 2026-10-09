import { BLOCKS, CATEGORIES, LAYERS, LEVELS, closure, getBlock, type Direction } from './data/roadmap'
import { isMastered, levelOf, nextSteps, readiness, stars, type Goal, type Levels } from './model'

interface Props {
  levels: Levels
  goal: Goal
  focusBlock: string | null
  onSetLevel: (id: string, level: number) => void
  onSelectBlock: (id: string) => void
  onSelectDirection: (catId: string, dir: number) => void
  onBackToGoal: () => void
  onClose: () => void
}

export default function Panel(props: Props) {
  const { goal, focusBlock, onClose } = props
  if (!goal && !focusBlock) return null
  return (
    <aside className="panel" aria-label="详情">
      <button className="panel-close" onClick={onClose} aria-label="关闭">
        ×
      </button>
      {focusBlock ? <BlockDetail {...props} id={focusBlock} /> : <GoalDetail {...props} />}
    </aside>
  )
}

function BlockChip({ id, levels, onClick }: { id: string; levels: Levels; onClick: (id: string) => void }) {
  const lv = levelOf(levels, id)
  return (
    <button className={`chip lv${lv}`} onClick={() => onClick(id)}>
      {isMastered(levels, id) && '✓ '}
      {getBlock(id).name}
    </button>
  )
}

function BlockDetail({ id, levels, goal, onSetLevel, onSelectBlock, onSelectDirection, onBackToGoal }: Props & { id: string }) {
  const b = getBlock(id)
  const lv = levelOf(levels, id)
  const unlocks = BLOCKS.filter((x) => x.requires.includes(id))
  const usedBy = CATEGORIES.flatMap((c) =>
    c.directions.map((d, i) => ({ cat: c, d, i })).filter(({ d }) => closure(d.requires).has(id)),
  )
  return (
    <div className="panel-body">
      {goal && (
        <button className="back" onClick={onBackToGoal}>
          ← 返回目标
        </button>
      )}
      <p className="eyebrow">{LAYERS.find((l) => l.id === b.layer)?.name} · 能力块</p>
      <h2>{b.name}</h2>
      <p className="lead">掌握后你能：{b.summary}</p>

      <h3>我的掌握程度</h3>
      <div className="levels" role="radiogroup">
        {LEVELS.map((name, i) => (
          <button key={name} role="radio" aria-checked={lv === i} className={`level lv${i} ${lv === i ? 'on' : ''}`} onClick={() => onSetLevel(id, i)}>
            {name}
          </button>
        ))}
      </div>
      <p className="hint">达到“{LEVELS[3]}”才算掌握，方向的就绪度按这个标准计算。</p>

      {b.requires.length > 0 && (
        <>
          <h3>前置能力</h3>
          <div className="chips">
            {b.requires.map((r) => (
              <BlockChip key={r} id={r} levels={levels} onClick={onSelectBlock} />
            ))}
          </div>
        </>
      )}
      {unlocks.length > 0 && (
        <>
          <h3>解锁后续能力</h3>
          <div className="chips">
            {unlocks.map((x) => (
              <BlockChip key={x.id} id={x.id} levels={levels} onClick={onSelectBlock} />
            ))}
          </div>
        </>
      )}
      <h3>用到它的方向（{usedBy.length}）</h3>
      <div className="chips">
        {usedBy.map(({ cat, d, i }) => (
          <button key={d.name} className="chip dir-chip" onClick={() => onSelectDirection(cat.id, i)}>
            {d.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function DirectionCard({ d, levels, onSelectBlock, compact }: { d: Direction; levels: Levels; onSelectBlock: (id: string) => void; compact?: boolean }) {
  const { met, total } = readiness(d, levels)
  const ids = closure(d.requires)
  const next = nextSteps(ids, levels)
  return (
    <div className="dcard">
      <div className="dcard-head">
        <strong>{d.name}</strong>
        <span className="stars">{stars(d.difficulty)}</span>
      </div>
      <div className="ready big">
        <span className="ready-bar">
          <span style={{ width: `${(met / total) * 100}%` }} />
        </span>
        已具备 {met}/{total} 个能力块
      </div>
      {!compact && (
        <>
          <h4>需要的能力块</h4>
          <div className="chips">
            {BLOCKS.filter((b) => ids.has(b.id)).map((b) => (
              <BlockChip key={b.id} id={b.id} levels={levels} onClick={onSelectBlock} />
            ))}
          </div>
          {next.length > 0 ? (
            <p className="next-tip">
              下一步建议：
              {next.map((id, i) => (
                <span key={id}>
                  {i > 0 && '、'}
                  <button className="link" onClick={() => onSelectBlock(id)}>
                    {getBlock(id).name}
                  </button>
                </span>
              ))}
            </p>
          ) : (
            <p className="next-tip done">能力块已全部具备，可以从练手项目开始，去提第一个 PR 了。</p>
          )}
        </>
      )}
      <h4>包含</h4>
      <div className="tags">
        {d.subs.map((s) => (
          <span key={s} className="tag">
            {s}
          </span>
        ))}
      </div>
      <h4>代表开源项目</h4>
      <div className="tags">
        {d.projects.map((p) => (
          <span key={p} className="tag project">
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

function GoalDetail({ goal, levels, onSelectBlock, onSelectDirection }: Props) {
  const cat = CATEGORIES.find((c) => c.id === goal!.catId)!
  const dir = goal!.dir
  if (dir !== undefined) {
    return (
      <div className="panel-body">
        <p className="eyebrow">
          {cat.index} {cat.name} · 方向
        </p>
        <DirectionCard d={cat.directions[dir]} levels={levels} onSelectBlock={onSelectBlock} />
      </div>
    )
  }
  return (
    <div className="panel-body">
      <p className="eyebrow">大类</p>
      <h2>
        {cat.index} {cat.name}
      </h2>
      <p className="lead">{cat.summary}</p>
      <p className="hint">树上高亮的是这个大类所有方向需要的能力块。点击下面的方向，只看它的路径。</p>
      {cat.directions.map((d, i) => (
        <button key={d.name} className="dcard-btn" onClick={() => onSelectDirection(cat.id, i)}>
          <DirectionCard d={d} levels={levels} onSelectBlock={onSelectBlock} compact />
        </button>
      ))}
    </div>
  )
}
