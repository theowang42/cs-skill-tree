// 前端和服务端共用的数据形状。
// 内容（Roadmap）由 server/roadmap.ts 从数据库查出来：静态站点读导出的 public/data/roadmap.json，
// 跑 API 服务时读 /api/roadmap，两者完全一样。所有引用都用 id，前端自己建索引。

export interface Link {
  label: string
  url: string
}

export type SkillKind = 'concept' | 'tool'

export interface Skill {
  id: string
  kind: SkillKind
  name: string
  intro: string
  /** 只有工具有：出品方 */
  org?: string
  /** 知识点所在的领域 */
  areaId?: string
  /** 工具所在的工具组 */
  groupId?: string
  /** 在领域里排第几行：领域内最长前置链的长度，从 1 开始 */
  tier: number
  /** 从无前置的技能出发的最长前置链长度，从 1 开始 */
  depth: number
  /** 等级：1 入门 · 2 基础 · 3 进阶 · 4 专精 · 5 前沿 */
  level: number
  /** Lucide 图标名，或 'si:' 开头的 Simple Icons 品牌图标 */
  icon: string
  /** 直接前置 */
  prerequisites: string[]
  /** 直接依赖它的技能 */
  dependents: string[]
  /** 有多少技能直接或间接依赖它 */
  weight: number
  /** 学会的标志 */
  checks: string[]
  /** 要学的内容 */
  topics: string[]
  resources: Link[]
  /** 必学它的细分方向（含间接） */
  requiredBy: string[]
}

export interface Layer {
  id: string
  name: string
  /** 1 是最底层 */
  position: number
  areaIds: string[]
}

export interface Area {
  id: string
  layerId: string
  name: string
  intro: string
  courses: Link[]
  /** 按行、再按顺序排好 */
  skillIds: string[]
}

export interface ToolGroup {
  id: string
  name: string
  shortName: string
  skillIds: string[]
}

export interface PlanStep {
  skillId: string
  step: number
}

export interface Choice {
  label: string
  options: string[]
}

export interface Sub {
  id: string
  categoryId: string
  name: string
  intro: string
  isHot: boolean
  items: string[]
  topics: string[]
  projects: Link[]
  /** 直接写在方向上的必学技能 */
  requirements: string[]
  /** 任选组 */
  choices: Choice[]
  /** 必学的全部技能（含前置）和学习顺序，由数据库视图 sub_learning_plan 算出 */
  plan: PlanStep[]
}

export interface Category {
  id: string
  name: string
  intro: string
  items: string[]
  subIds: string[]
}

export interface Roadmap {
  version: 2
  generatedAt: string
  /** 从底层到顶层 */
  layers: Layer[]
  areas: Area[]
  toolGroups: ToolGroup[]
  skills: Skill[]
  categories: Category[]
  subs: Sub[]
}

// ───────────── 学习进度 ─────────────

/** 学习者亲手标的状态 */
export type Status = 'learning' | 'done'
/** 页面上显示的状态：标过的直接用；没标的看前置是不是都 done */
export type SkillState = 'locked' | 'available' | Status

export interface ProgressEntry {
  status: Status
  /** ISO 时间 */
  updatedAt: string
}

export interface Progress {
  goalSubId: string | null
  skills: Record<string, ProgressEntry>
}

/** 导出 / 导入用的进度文件 */
export interface ProgressFile extends Progress {
  format: 'cs-skill-tree-progress'
  version: 1
  exportedAt: string
}

/** API 里的学习者 */
export interface Learner extends Progress {
  id: string
}

export interface Readiness {
  subId: string
  coreTotal: number
  coreDone: number
  coreLearning: number
  choiceTotal: number
  choiceDone: number
  /** 0~100，保留一位小数 */
  percent: number
}

/** 成长时间线：按天汇总 */
export interface TimelineDay {
  date: string
  lit: string[]
  learning: string[]
  unlit: string[]
}

export interface LearnerEvent {
  skillId: string
  from: Status | null
  to: Status | null
  at: string
}
