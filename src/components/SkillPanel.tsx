import { useApp } from '../state'
import { STATE_LABEL } from '../lib/format'
import { litDescendants, missingPrerequisites } from '../lib/tree'
import { Links, Section, SkillChip, StatusControl, SubChip } from './common'
import { ToolIcon } from './ToolIcon'

export function SkillPanel({ id }: { id: string }) {
  const { tree, states, progress, lightWithPrerequisites, readOnly, setFocus, activeSubId, change } = useApp()
  const s = tree.skill(id)
  const state = states.get(id)!
  const area = s.areaId ? tree.areas.get(s.areaId) : undefined
  const group = s.groupId ? tree.groups.get(s.groupId) : undefined
  const missing = missingPrerequisites(tree, id, progress)
  const orphaned = state === 'done' ? [] : litDescendants(tree, id, progress)
  const activeSub = activeSubId ? tree.subs.get(activeSubId) : undefined
  const step = activeSubId ? tree.steps.get(activeSubId)!.get(id) : undefined
  const choice = activeSub?.choices.find((c) => c.options.includes(id))
  const prereqsDone = s.prerequisites.filter((p) => states.get(p) === 'done').length

  return (
    <div className="detail" key={id}>
      <p className="eyebrow">
        {area ? (
          <button className="link-button" onClick={() => setFocus({ kind: 'area', id: area.id }, { scroll: true })}>
            {area.name} · 第 {s.depth} 圈
          </button>
        ) : (
          <>{group!.name} · 第 {s.depth} 圈</>
        )}
      </p>
      <h2 className={s.kind === 'tool' ? 'with-icon' : ''}>
        {s.kind === 'tool' && <ToolIcon id={id} />}
        <span>
          {s.name}
          {s.org && <small>{s.org}</small>}
        </span>
      </h2>
      <p className={`state-badge b-${state}`}>{STATE_LABEL[state]}</p>
      <p className="summary">{s.intro}</p>

      <StatusControl id={id} />

      {!readOnly && missing.length > 0 && state !== 'done' && (
        <div className="callout">
          <p>
            还有 <b>{missing.length}</b> 个前置没点亮。已经会了的话，可以一起点亮：
          </p>
          <div className="chips">
            {missing.slice(0, 8).map((m) => <SkillChip key={m} id={m} />)}
            {missing.length > 8 && <span className="muted small">…等 {missing.length} 个</span>}
          </div>
          <button className="primary" onClick={() => lightWithPrerequisites(id)}>
            把它和 {missing.length} 个前置都标为已掌握
          </button>
        </div>
      )}
      {!readOnly && state !== 'done' && orphaned.length > 0 && (
        <div className="callout warn">
          <p>你已经点亮了依赖它的 {orphaned.length} 个技能，它们的前置现在没满足：</p>
          <div className="chips">{orphaned.slice(0, 6).map((m) => <SkillChip key={m} id={m} />)}</div>
          <button onClick={() => change({ [id]: 'done' })}>那这个其实也会，标为已掌握</button>
        </div>
      )}

      {(step !== undefined || choice) && activeSub && (
        <p className="goal-note">
          {progress.goalSubId === activeSub.id ? '★ 目标' : '方向'}「{activeSub.name}」
          {step !== undefined ? `的第 ${step} 步` : `的任选组「${choice!.label}」`}
        </p>
      )}

      {s.checks.length > 0 && (
        <Section title="学会的标志" aside={<span className="muted small">做得到就可以点亮</span>}>
          <ul className="checks">{s.checks.map((c) => <li key={c}>{c}</li>)}</ul>
        </Section>
      )}
      {s.topics.length > 0 && (
        <Section title="学它主要学这些">
          <ul className="includes">{s.topics.map((c) => <li key={c}>{c}</li>)}</ul>
        </Section>
      )}
      {(s.resources.length > 0 || area) && (
        <Section title={s.kind === 'tool' ? '官方入口' : '去哪学'}>
          {s.resources.length > 0 && <Links links={s.resources} />}
          {area && (
            <>
              {s.resources.length > 0 && <p className="label">这个领域的公开课</p>}
              <Links links={area.courses} />
              <p className="note">
                课程主要参考{' '}
                <a href="https://csdiy.wiki/" target="_blank" rel="noreferrer">CS 自学指南（csdiy.wiki）</a>
              </p>
            </>
          )}
        </Section>
      )}

      <Section title={`前置 · ${prereqsDone}/${s.prerequisites.length}`} aside={<span className="muted small">学它之前最好先会</span>}>
        {s.prerequisites.length ? (
          <div className="chips">{s.prerequisites.map((p) => <SkillChip key={p} id={p} />)}</div>
        ) : (
          <p className="muted small">没有前置，随时可以开始。</p>
        )}
      </Section>
      {s.dependents.length > 0 && (
        <Section title={`学会后解锁 · ${s.dependents.length}`}>
          <div className="chips">{s.dependents.map((d) => <SkillChip key={d} id={d} />)}</div>
        </Section>
      )}
      {s.requiredBy.length > 0 && (
        <Section title={`${s.requiredBy.length} 个方向需要它`}>
          <div className="chips">{s.requiredBy.map((sub) => <SubChip key={sub} id={sub} />)}</div>
        </Section>
      )}
      <p className="kbd-hint muted small">快捷键：D 学会了 · L 在学 · X 清除 · Esc 返回 · 1 回到我的星域</p>
    </div>
  )
}
