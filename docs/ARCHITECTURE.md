# 架构与修改指南

> 目标：**让一个学 CS 的人有一棵能点亮的技能树，随时知道自己的能力边界在哪里。**
>
> 这份文件说明项目由哪些部分组成、数据怎么流动、想改什么该去哪里改。

## 1. 核心概念

| 概念 | 含义 | 存在哪 |
| --- | --- | --- |
| **技能** | 树上最小的、能点亮的单位。`concept` 是知识点（属于某个知识领域），`tool` 是语言 / 框架 / 平台（属于某个工具组） | `skills` |
| **知识领域** | 一组相关的知识点，比如“操作系统”。20 个，分基础层、核心层、进阶层 | `areas`、`layers` |
| **前置** | 学 A 之前最好先会 B。整棵树是一张有向无环图 | `skill_prerequisites` |
| **学会的标志** | 2~3 条“做得到就算会了”的自测标准 | `skill_checks` |
| **方向** | 大方向（AI）下的细分方向（Agent 开发）。直接要求一组技能，前置自动带上；还可以有“任选其一”的组 | `categories`、`subs`、`sub_requirements` |
| **点亮** | 学习者点亮一个技能（存成 `done`）。只有点亮和没点亮两种 | 浏览器或 `learner_skills` |

学习者只做一件事：点亮或取消。规则：**前置都点亮了才能点亮；取消一个，依赖它的一起熄灭**。浏览器和服务端用同一个函数算（`src/lib/tree.ts` 的 `planChanges`），数据库触发器再挡一道；API 违反规则时回 409，整批不写。页面上每个技能有三种画法，后两种是推导出来的，不存：

| 状态 | 条件 | 页面上 |
| --- | --- | --- |
| `done` 已点亮 | 学习者点亮的 | 实心黑 |
| `available` 能点亮 | 前置全部点亮，自己没点 —— **能力边界** | 黑框 |
| `locked` 够不着 | 还有前置没点亮 | 浅灰框 |

方向的**就绪度** = (必学闭包里已点亮的技能数 + 已满足的任选组数) / (必学闭包大小 + 任选组数)。

## 2. 数据怎么流动

```
db/migrations/*.sql   表、视图、触发器
db/seed/*.sql         全部内容（一个技能一行）
        │  npm run db:build：删库重建 → 灌内容 → 体检 → 导出
        ▼
data/cs-skill-tree.db ──► public/data/roadmap.json ──► 静态站点（GitHub Pages）
        │                                              进度存 localStorage，可导出 / 导入 / 分享
        └──► server/index.ts（API，零依赖）──► VITE_API=1 构建的前端
                                               进度、目标、操作记录存进数据库
```

- 运行时只用 Node 自带的 `node:sqlite` 和类型擦除，没有原生依赖，也不需要编译服务端代码。
- 前置闭包、学习顺序、四种状态、能力边界、就绪度都在**数据库视图**里实现；
  前端为了离线可用，在 `src/lib/tree.ts` 里有同样的算法，`tests/tree.test.ts` 用 25 份随机进度逐个比对两边的结果。

## 3. 数据库

```mermaid
erDiagram
  layers ||--o{ areas : "分层"
  areas ||--o{ area_courses : "公开课"
  areas ||--o{ skills : "知识点"
  tool_groups ||--o{ skills : "工具"
  skills ||--o{ skill_prerequisites : "前置"
  skills ||--o{ skill_checks : "学会的标志"
  skills ||--o{ skill_topics : "要学的内容"
  skills ||--o{ skill_resources : "资料"
  categories ||--o{ subs : "细分方向"
  subs ||--o{ sub_requirements : "必学 / 任选"
  sub_requirements }o--|| skills : ""
  subs ||--o{ sub_items : ""
  subs ||--o{ sub_topics : ""
  subs ||--o{ sub_projects : "代表项目"
  learners ||--o{ learner_skills : "点亮状态"
  learners ||--o{ learner_events : "操作记录"
  learners }o--o| subs : "目标"
```

| 迁移 | 内容 |
| --- | --- |
| `0001_content.sql` | 内容表。`STRICT` 表，CHECK 约束保证 id 格式、链接是 http(s)、知识点和工具的字段互斥 |
| `0002_graph_views.sql` | `skill_ancestors`（全部前置）、`skill_tiers`（领域内第几行）、`sub_skill_closure`（方向必学的全部技能）、`sub_learning_plan`（第几步学）、`sub_choices`、`skill_unlocks`、`skill_weight`（被多少技能依赖） |
| `0003_learners.sql` | `learners`、`learner_skills`、`learner_events`（三个触发器自动记录每次状态变化）；视图 `learner_skill_state`（四种状态）、`learner_frontier`（能力边界）、`learner_sub_readiness`（就绪度） |
| `0011_career_icon.sql` | 职业是最上面一排的终极节点，每个有自己的图标 |
| `0010_language_talent.sql` | 编程语言标成语言天赋（`is_language`），树上画成六边形 |
| `0009_prerequisites_first.sql` | 前置都点亮了才能点亮：清掉旧数据里不合规的，触发器挡住不合规的写入，取消时一层层熄灭后继 |
| `0008_lit_only.sql` | 只有点亮一种状态：去掉“在学”，旧数据里的“在学”当作没点亮，触发器挡住新的 |
| `0007_tree_parent.sql` | 树上画的那根枝：技能的主前置 `parent_id`，方向挂在哪 `anchor_id`（都取种子里写的第一个） |
| `0006_derived_level.sql` | 等级不写就按树的深度（最多 5） |
| `0005_resume_skills.sql` | 技能改成能写进简历的颗粒度：`skills` 加 `level`（1~5，手写）和 `icon`（Lucide 名或 `si:` 品牌图标）；`skill_level` 视图改为直接读 `level` |
| `0004_skill_depth.sql` | `skill_depth`（全局最长前置链）、`skill_level`（星图的 5 个等级：入门 / 基础 / 进阶 / 专精 / 前沿，由所在层和领域内层级映射，再按前置抬高，保证前置不在更高级）、`learner_reach`（每个领域点亮到第几圈） |

递归视图都用 `UNION` 去重，行数被限制在“节点数 × 深度”以内，数据里就算误写了环也能停下来，环由体检报错。

**重新播种不会丢学习者的进度**：内容表在一个事务里清空重灌，学习者表不动；指向已删除技能的记录会被清掉并报告数量。

## 4. 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 重建数据库 + 导出 JSON + 启动 Vite，进度存浏览器 |
| `npm run dev:api` | 同时启动 API（3000）和 Vite（`/api` 代理过去），进度存数据库 |
| `npm run api` | 只启动 API；构建过 `dist/` 的话也会把页面一起发出去 |
| `npm run db:build` | 删库重建、灌内容、体检、导出 `public/data/roadmap.json` |
| `npm run db:check` | 只体检 |
| `npm run db -- stats` | 每张表多少行 |
| `npm run db -- events` | 最近的学习记录 |
| `npm run db -- query "SQL"` | 随手查，比如 `SELECT * FROM sub_learning_plan WHERE sub_id='backend' ORDER BY step` |
| `npm test` | 数据库、视图与前端算法的一致性、API、前端纯逻辑 |
| `npm run build` | 重建数据库 → 类型检查 → 打包到 `dist/` |

体检规则（`server/db.ts` 的 `check`）：

| 级别 | 规则 |
| --- | --- |
| 错误 | 外键、完整性、前置成环、前置指向更高的层（知识点不能依赖工具）、编号不连续、缺“学会的标志”/链接/公开课、方向没有必学技能、任选项已经是必学 |
| 提醒 | 多余的前置（已经是另一个前置的祖先）、多余的方向要求、孤立的知识点、没人用的工具、链接重复、介绍太长、热门方向太多 |

## 5. API

全部 JSON，见 `server/index.ts` 开头的列表。要点：

- `GET /api/roadmap` 和静态的 `roadmap.json` 完全一样
- `PATCH /api/learners/:id/skills` 批量改状态，在一个事务里；有一个不认识的技能就整批拒绝
- `GET /api/learners/:id/summary` 直接返回视图算出的状态计数、能力边界（目标里的排前面）、目标就绪度、最近的方向
- `GET /api/learners/:id/timeline` 按天汇总的成长记录（点亮、开始学、取消），来自触发器写的 `learner_events`
- `POST /api/learners/:id/import` 接受前端导出的进度文件，不认识的技能丢掉并在 `dropped` 里报告

## 6. 前端：技能树

```
src/
  types.ts              前后端共用的数据形状
  generated/icons.ts    由 npm run db:export 生成：只 import 用到的图标（不进 git）
  lib/tree.ts           索引、四种状态、能力边界、就绪度（和数据库视图同一套算法）
  lib/webLayout.ts      技能树布局：从下往上、一列一列、每个节点一根枝、方向在最上面（tests/webLayout.test.ts）
  lib/store.ts          进度存储：LocalStore（浏览器）/ ApiStore（服务端），接口一样
  lib/share.ts          分享链接：已点亮技能的位图 → base64url
  state.tsx             全局状态和所有会改进度的动作（乐观更新、撤销、解锁动画）
  components/
    SkillTree.tsx       技能树：平移缩放、节点、枝条、最上面一排的方向
    Hud.tsx             顶栏：进度、达成了几个职业、下一个
    Panel.tsx           右侧面板：我的进度 / 技能 / 领域 / 方向，都只有一句话和链接
```

布局（`lib/webLayout.ts`）：

- 树：每个技能挂在主前置（`parent`）上，方向挂在 `anchor` 上。其余前置不画线，选中时只让那些节点保持清楚。
- 从下往上：起点 y = 0，孩子在父亲上面一排（`ROW`）。方向统一放在最上面一排。
- 列：子树按每一排的左右轮廓紧挨着排，父节点在第一个和最后一个孩子正中间；一个孩子时对齐，链是直的。方向那一列从挂的技能一直占到最上面，竖线不会穿过别的节点。兄弟按领域排（`AREA_ORDER`）。
- 枝条是直角折线，终点停在孩子名字下面。
- 体检会查：主前置必须是真正的前置，方向挂的位置必须是它必学的技能。

交互：

- 点节点：右侧面板打开（一句话、点亮按钮、去哪学）。
- 悬停或选中节点：只亮它往下的全部依赖（都画成黑边），其余变淡。前置没点亮时，点亮按钮是灰的，面板里列出缺哪个前置，点它跳过去。
- 职业是最上面一排的终极节点，不用选：要学的技能（不算加分项）都点亮了就自动达成（`isReached`），放一次庆祝动画。点它亮出它要学的全部技能，视图缩到装下整条路线。顶栏显示达成了几个职业。学习者表里的 goal 字段还在，页面不再用。
- 设了目标后，最该学的节点上方有一个朱砂小三角；顶栏“下一个”飞过去。
- 美术规则见 [ART.md](ART.md)。

进度的安全措施：

- 内容更新后，浏览器里存的、导入的、分享链接里带的已删除技能和方向会被清掉（`sanitize`），页面不会因为旧数据出错
- 两个标签页同时改进度不会互相覆盖：每次写之前重读 localStorage，并监听 `storage` 事件同步
- API 模式下所有请求排队发出，顺序和界面一致；只有服务器明确返回 404 才会新建学习者
- 导入、清空、用分享链接覆盖都可以撤销；万一渲染出错，错误页提供备份进度和清空重试

## 7. 常见修改

- **加一个技能**：在 `db/seed/20_skills.sql` 对应领域的 `INSERT INTO skill_rows` 里加一行（id、领域、等级（一般写 NULL，按深度）、图标、名字、一句话、前置、链接），跑 `npm run db:build`。体检会查等级倒挂、重复图标、名字太长、缺链接；图标名不存在时导出直接报错。
- **改方向要求**：`db/seed/40_directions.sql`，必学只写最高层的技能；任选组写成 `{"组名": ["a", "b"]}`。
- **加一个领域**：`db/seed/10_areas.sql` 加一行，再在 `src/lib/webLayout.ts` 的 `AREA_ORDER` 里给它排个位置。
- **改技能 id**：尽量别改，会让用户已有的进度和分享链接对不上。真要改，旧 id 的进度会在下次加载时被清掉。

## 8. 以后可以做

- 每个技能配几道自测题，答对才能点亮
- 按每个技能的预计学时估算离目标还要多久
- 和同一目标的人比较能力边界（数据库里已经有 `learner_events`，可以画成长曲线）
