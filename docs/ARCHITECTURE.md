# 架构与修改指南

> 目标：**让一个学 CS 的人有一张能点亮的星图，随时知道自己的能力边界在哪里。**
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
| **点亮** | 学习者把技能标成 `done`（已掌握）或 `learning`（在学） | 浏览器或 `learner_skills` |

每个技能对一个学习者有四种状态，后两种是推导出来的，不存：

| 状态 | 条件 | 页面上 |
| --- | --- | --- |
| `done` 已掌握 | 学习者标的 | 墨色填满 |
| `learning` 在学 | 学习者标的 | 填一半 |
| `available` 可以学了 | 前置全部 `done`，自己没标 —— **能力边界** | 蓝色实线框 + 蓝点 |
| `locked` 前置未满足 | 还有前置不是 `done` | 灰色虚线框 |

方向的**就绪度** = (必学闭包里已掌握的技能数 + 已满足的任选组数) / (必学闭包大小 + 任选组数)。

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
| `0004_skill_depth.sql` | `skill_depth`（星图上第几圈：全局最长前置链）、`learner_reach`（每个领域点亮到第几圈） |

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

## 6. 前端：星图

```
src/
  types.ts              前后端共用的数据形状
  lib/tree.ts           索引、四种状态、能力边界、就绪度（和数据库视图同一套算法）
  lib/starmap.ts        星图布局：圈、扇区、信标的坐标（纯函数，tests/starmap.test.ts）
  lib/store.ts          进度存储：LocalStore（浏览器）/ ApiStore（服务端），接口一样
  lib/search.ts         页面内搜索
  lib/share.ts          分享链接：已掌握技能的位图 → base64url
  state.tsx             全局状态和所有会改进度的动作（乐观更新、撤销、解锁动画、飞行请求）
  components/
    StarMap.tsx         星图本体：缩放平移、四态星、连线、扇区、信标、回放、悬停提示
    Hud.tsx             顶栏：进度、目标、“下一颗”、视图、快速点亮、搜索
    Panel.tsx           右侧抽屉路由：Dashboard / SkillPanel / AreaPanel / SubPanel / CategoryPanel
```

布局规则（`lib/starmap.ts`）：

- **圈**：第 d 圈 = 从无前置的技能出发、到它的最长前置链长度为 d。由数据库视图 `skill_depth` 算好带在数据里。越往外越进阶。
- **扇区**：每个知识领域占一段角度，按技能数分配；相关的领域相邻，前置连线就短。工具没有领域，跟着它最深的前置走（React 跟着“组件与状态管理”去界面开发）。
- 同一圈里先按扇区放，组内按前置的平均角度排序；扇区放不下时交错成内外两行；最后把挤在一起的推开。最里面三圈是共用的基础，允许摊开。
- **信标**：方向放在最外圈之外，角度是它要求的技能的加权平均方向（越深的技能权重越大）。
- **已探索的星域**：每个扇区点亮到的最远半径连成一条平滑闭合曲线，填淡金色。亮区的边缘就是能力边界。

渲染和性能：

- SVG。平移缩放不走 React：直接改世界 `<g>` 的 transform，并把 `1/k` 写进 svg 的 CSS 变量，星和文字用它反向缩放，屏幕上大小基本不变。
- 文字分三档显示（CSS 按 `data-zoom` 切换）：选中 / 悬停总显示；已知星域和目标路线中等缩放时显示；其余放大才显示。
- 每颗星是 memo 过的组件，只有自己的标志变了才重渲染。连线用 `vector-effect: non-scaling-stroke`。

交互：

- 单击星看详情并拉近；打开**快速点亮**后单击直接切换 没学 → 已掌握 → 在学 → 没学
- 悬停：画出它到圆心的前置路线（白）和它解锁的星（青虚线），其余变暗
- 点亮前置没满足的星时，提示“连同 N 个前置一起点亮”；每次点亮算出新解锁的星，光顺着连线流过去
- 顶栏“下一颗”飞到最该学的星（目标里的优先，其次被依赖最多的）
- 视图：**全部** / **目标**（暗掉目标用不到的）/ **边界**（暗掉还够不着的）
- **回放**：按点亮时间从头放一遍自己的成长（API 模式下服务端还有按天的 `timeline` 接口）
- 键盘：`/` 搜索，`Q` 快速点亮，`D / L / X` 改状态，`Esc` 返回，`+ -` 缩放，`0` 全图，`1` 我的星域
- 触屏：拖动平移、双指缩放；窄屏上面板变成底部抽屉
- 地址栏 `#/skill/http` 直接打开某颗星；`#share=` 是只读的分享视图

进度的安全措施：

- 内容更新后，浏览器里存的、导入的、分享链接里带的已删除技能和方向会被清掉（`sanitize`），页面不会因为旧数据出错
- 两个标签页同时改进度不会互相覆盖：每次写之前重读 localStorage，并监听 `storage` 事件同步
- API 模式下所有请求排队发出，顺序和界面一致；只有服务器明确返回 404 才会新建学习者，断网或服务器重启不会把人换成空白身份
- 导入、清空、用分享链接覆盖都可以撤销；万一渲染出错，错误页提供备份进度和清空重试

## 7. 常见修改

- **加一个知识点**：在 `db/seed/2x_*.sql` 对应领域的 `INSERT INTO concept_rows` 里加一行（id、领域、名字、介绍、前置、学会的标志），跑 `npm run db:build`。
- **加一个工具**：`db/seed/30_tools.sql` 加一行；图标在 `src/lib/icons.ts` 里按 id 对应，Simple Icons 没有的写进 `MONOGRAMS`。
- **改方向要求**：`db/seed/40_directions.sql`，必学只写最高层的技能；任选组写成 `{"组名": ["a", "b"]}`。
- **加一个知识领域**：`db/seed/10_areas.sql` 加一行，再在技能文件里给它加技能。
- **改技能 id**：尽量别改，会让用户已有的进度和分享链接对不上。真要改，旧 id 的进度会在下次播种时被清掉。

## 8. 以后可以做

- 每个技能配几道自测题，答对才能点亮
- 按每个技能的预计学时估算离目标还要多久
- 和同一目标的人比较能力边界（数据库里已经有 `learner_events`，可以画成长曲线）
