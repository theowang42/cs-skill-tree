// 导出的 public/data/roadmap.json 的形状（scripts/roadmap.ts 生成）。所有引用都用 id。

export interface Link {
  label: string
  url: string
}

/** 技能的学习资源：课程、书、视频……和是否免费 */
export interface Resource extends Link {
  kind: string
  free: boolean
}

export interface Skill {
  id: string
  areaId: string
  name: string
  intro: string
  /** Lucide 图标名，或 'si:' 开头的 Simple Icons 品牌图标 */
  icon: string
  /** 树上画的那根枝连向谁：主前置。没有前置的技能是 null，从中心长出来 */
  parent: string | null
  /** 编程语言：树上画成六边形 */
  language: boolean
  /** 有多少技能直接或间接依赖它 */
  weight: number
  prerequisites: string[]
  /** 直接依赖它的技能 */
  dependents: string[]
  /** 学习流程：按顺序的几步，最后一步是实战。每步都能单独点亮，全亮了技能就亮 */
  steps: string[]
  resources: Resource[]
  /** 必学它的职业（含间接） */
  requiredBy: string[]
}

export interface Area {
  id: string
  name: string
  intro: string
  skillIds: string[]
}

export interface Category {
  id: string
  name: string
  intro: string
  subIds: string[]
}

/** 职业：技能树最外圈的徽章 */
export interface Sub {
  id: string
  categoryId: string
  name: string
  intro: string
  icon: string
  /** 徽章挂在哪个技能后面 */
  anchor: string
  /** 三个关键词 */
  items: string[]
  /** 平时做什么 */
  topics: string[]
  projects: Link[]
  /** 直接写的必学技能（前置不在里面） */
  requirements: string[]
  /** 加分项：不算进达成条件 */
  bonus: string[]
  /** 必学的全部技能（含前置）和第几步学 */
  plan: { skillId: string; step: number }[]
}

export interface Roadmap {
  areas: Area[]
  skills: Skill[]
  categories: Category[]
  subs: Sub[]
}

/** 树上每个技能的状态：点亮了；前置都亮了，可以点亮；还够不着 */
export type SkillState = 'done' | 'available' | 'locked'
