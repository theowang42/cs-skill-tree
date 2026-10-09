import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCKS, CATEGORIES, LEVELS, MASTERED_LEVEL, getBlock } from './data/roadmap'
import { goalBlocks, nextSteps, overallProgress, type Goal, type Levels } from './model'
import { usePersistentState } from './storage'
import Tree from './Tree'
import Panel from './Panel'

type Theme = 'system' | 'light' | 'dark'
const THEME_LABEL: Record<Theme, string> = { system: '跟随系统', light: '浅色', dark: '深色' }

export default function App() {
  const [levels, setLevels] = usePersistentState<Levels>('cs-skill-tree:levels', {})
  const [goal, setGoal] = usePersistentState<Goal>('cs-skill-tree:goal', null)
  const [theme, setTheme] = usePersistentState<Theme>('cs-skill-tree:theme', 'system')
  const [focusBlock, setFocusBlock] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const goalSet = useMemo(() => goalBlocks(goal), [goal])
  const next = useMemo(() => nextSteps(goalSet, levels), [goalSet, levels])
  const progress = overallProgress(levels)

  const closePanel = () => (focusBlock ? setFocusBlock(null) : setGoal(null))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const selectCategory = (catId: string) => {
    setGoal(goal?.catId === catId && goal.dir === undefined ? null : { catId })
    setFocusBlock(null)
  }
  const selectDirection = (catId: string, dir: number) => {
    setGoal({ catId, dir })
    setFocusBlock(null)
  }

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ version: 1, levels }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cs-skill-tree-progress.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importProgress = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      const imported: Levels = {}
      for (const b of BLOCKS) {
        const v = data?.levels?.[b.id]
        if (Number.isInteger(v) && v >= 0 && v < LEVELS.length) imported[b.id] = v
      }
      setLevels(imported)
    } catch {
      alert('无法读取这个文件，请确认是从这里导出的进度文件。')
    }
  }

  const goalName = (() => {
    if (!goal) return null
    const cat = CATEGORIES.find((c) => c.id === goal.catId)
    if (!cat) return null
    return goal.dir === undefined ? `${cat.index} ${cat.name}` : cat.directions[goal.dir]?.name
  })()
  const goalMet = [...goalSet].filter((id) => (levels[id] ?? 0) >= MASTERED_LEVEL).length

  return (
    <div className={`app ${goal || focusBlock ? 'with-panel' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <h1>🌳 CS 能力树</h1>
          <p>先选一个开源方向，再倒推需要掌握哪些能力</p>
        </div>
        <div className="progress" title={`已熟练 ${progress.mastered} / ${progress.total} 个能力块`}>
          <div className="progress-text">
            <span>总进度</span>
            <strong>{Math.round(progress.ratio * 100)}%</strong>
            <span className="muted">
              已熟练 {progress.mastered}/{progress.total}
            </span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
        <div className="actions">
          <button onClick={exportProgress}>导出进度</button>
          <button onClick={() => fileInput.current?.click()}>导入</button>
          <button
            onClick={() => {
              if (confirm('确定清空所有掌握程度吗？')) setLevels({})
            }}
          >
            重置
          </button>
          <button onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')} title="切换主题">
            {THEME_LABEL[theme]}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importProgress(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <div className="statusbar">
        {goalName ? (
          <>
            <span>
              目标：<strong>{goalName}</strong>
            </span>
            <span>
              已具备 {goalMet}/{goalSet.size} 个能力块
            </span>
            {next.length > 0 && <span>下一步：{next.map((id) => getBlock(id).name).join('、')}</span>}
            <button className="link" onClick={() => setGoal(null)}>
              清除目标
            </button>
          </>
        ) : (
          <span className="muted">点击上方的大类或方向设为目标，树上会高亮它需要的能力；点击能力块记录你的掌握程度。</span>
        )}
        <span className="legend">
          {LEVELS.map((name, i) => (
            <span key={name} className={`legend-item lv${i}`}>
              <i />
              {name}
            </span>
          ))}
        </span>
      </div>

      <main className="stage">
        <Tree
          levels={levels}
          goal={goal}
          goalSet={goalSet}
          next={next}
          focusBlock={focusBlock}
          onSelectCategory={selectCategory}
          onSelectDirection={selectDirection}
          onSelectBlock={setFocusBlock}
        />
      </main>

      <Panel
        levels={levels}
        goal={goal}
        focusBlock={focusBlock}
        onSetLevel={(id, lv) => setLevels({ ...levels, [id]: lv })}
        onSelectBlock={setFocusBlock}
        onSelectDirection={selectDirection}
        onBackToGoal={() => setFocusBlock(null)}
        onClose={closePanel}
      />
    </div>
  )
}
