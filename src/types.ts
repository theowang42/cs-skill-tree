// 前端和服务端共用的数据形状。由 server/roadmap.ts 从数据库查出来，
// 静态站点读的是导出的 public/data/roadmap.json，跑服务时读的是 /api/roadmap，内容一样。

export interface Link {
  label: string
  url: string
}

export interface Block {
  id: string
  layerId: string
  name: string
  intro: string
  /** 方块上显示的 2~3 行 */
  items: string[]
  /** 直接前置 */
  prerequisites: string[]
  /** 右侧面板“会学到” */
  topics: string[]
  /** 推荐公开课 */
  courses: Link[]
  /** 学会了可以去做的细分方向（含间接依赖它的） */
  unlocks: string[]
}

export interface Layer {
  id: string
  name: string
  /** 1 是最底层 */
  position: number
  blocks: Block[]
}

export interface Tool {
  id: string
  groupId: string
  name: string
  org: string
  intro: string
  topics: string[]
  links: Link[]
  /** 会用到它的细分方向 */
  usedBy: string[]
}

export interface ToolGroup {
  id: string
  name: string
  shortName: string
  tools: Tool[]
}

export interface PlanStep {
  blockId: string
  /** 第几步学，从 1 开始 */
  step: number
}

export interface Sub {
  id: string
  categoryId: string
  name: string
  intro: string
  items: string[]
  isHot: boolean
  /** 直接要求的能力块 */
  requirements: string[]
  tools: string[]
  topics: string[]
  projects: Link[]
  /** 要学的全部能力块和顺序，由数据库视图 sub_learning_plan 算出 */
  plan: PlanStep[]
}

export interface Category {
  id: string
  name: string
  intro: string
  items: string[]
  subs: Sub[]
}

export interface Roadmap {
  generatedAt: string
  /** 从底层到顶层 */
  layers: Layer[]
  toolGroups: ToolGroup[]
  categories: Category[]
}

// ───────────── 学习者（只有跑着 API 服务时才有） ─────────────

export type ProgressStatus = 'learning' | 'done'

export interface LearnerState {
  id: string
  goalSubId: string | null
  progress: Record<string, ProgressStatus>
}
