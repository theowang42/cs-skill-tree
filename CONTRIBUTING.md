# 参与写内容

技能树的全部内容都在 `content/` 里，一个技能、一个职业各一个 Markdown 文件，文件名就是它的 id。改内容不用懂代码：

- **改一处小地方**：在 GitHub 上打开 `content/` 里对应的文件，点铅笔图标直接改，提交一个 Pull Request。
- **改得多、或者加新技能**：把仓库克隆下来，改完跑 `npm test`，内容体检会指出哪里不对。

```
content/
  areas/       领域：技能树的一页，列出它的技能和顺序
  skills/      技能：一个文件一个
  categories/  大方向：列出它下面的职业和顺序
  careers/     职业：一个文件一个
```

## 技能

`content/skills/docker.md`：

```markdown
---
name: Docker
icon: si:docker
requires: [linux]
---
会写 Dockerfile 打包应用，能用镜像在任何机器上把服务跑起来。

## 学习流程
- 镜像和容器
- 写 Dockerfile
- 端口、变量和数据卷
- 排查容器问题
- 把自己的项目容器化

## 去哪学
- [Docker 官方入门](https://docs.docker.com/get-started/) · 文档 · 免费
```

**属性**

| 属性 | 写什么 |
| --- | --- |
| `name` | 名字，直接说它是什么。树上放得下大约 8 个汉字 |
| `icon` | [Lucide](https://lucide.dev/icons) 图标名，或 `si:` 开头的 [Simple Icons](https://simpleicons.org/) 品牌图标。每个技能一个，不能重复 |
| `requires` | 学它之前必须先会的技能，只写直接前置。第一个是“主前置”，树上只画这一根枝 |
| `language` | 编程语言写 `language: true`，树上画成六边形；其他技能不写这一行 |

**正文**

- **一句话**（属性下面第一段）：掌握到什么程度，写成“会……，能……”，50 字以内，具体到做得到就能点亮。不写课程编号，课程放进“去哪学”。
- **学习流程**：把这个技能拆成 4 到 6 步，按学的顺序写，每步一个短语（14 个字以内）。最后一步是一个实战：做出来就算会了。在技能树里每一步都能单独点亮，全亮了技能就亮。只写这个技能自己的范围，后面另有节点的内容（比如 Docker 之后的 Compose）不写进来。
- **去哪学**：一到三个最好的资源，优先官方文档、公开课和公认的经典。每个后面标上类型和是否免费：
  - 类型：课程、书、视频、文章、文档、论文、练习、项目（GitHub 上的开源项目）
  - 免费或付费

每个技能都要有学习流程，“去哪学”的每个链接都要标好类型和是否免费，少了体检会报错。步数定下来之后尽量别改：用户点亮了第几步是按顺序记的。

**加一个新技能**：新建 `content/skills/<id>.md`，再把 id 加进它所在领域 `content/areas/*.md` 的 `skills` 列表。列表的顺序就是树上同一层里的先后。id 用小写英文和连字符，定了就别改：用户的进度是按 id 存的。

## 职业

`content/careers/backend.md`：

```markdown
---
name: 后端开发工程师
icon: server
brief: 写接口和数据库
keywords: [接口, 数据库, 缓存]
requires: [postgres, system-design, ci]
bonus: [go, java]
---
写业务接口和数据库，让一个产品的服务稳定地跑起来。

## 平时做什么
- 写接口和业务逻辑
- 设计数据库表

## 代表项目
- [ByteByteGo](https://github.com/ByteByteGoHq/system-design-101)
```

| 属性 | 写什么 |
| --- | --- |
| `name`、`icon` | 同技能。名字用招聘时最常写的岗位名 |
| `brief` | 首页岗位名后面的一句，十个字左右（英文单词算一个字） |
| `keywords` | 三个关键词 |
| `requires` | 必学的技能，只写最高层的，前置会自动带上。第一个是徽章挂在树上的位置，徽章出现在这个技能所在领域的那一页 |
| `bonus` | 加分项：有更好，不算进达成条件 |

新职业要加进它所在大方向 `content/categories/*.md` 的 `careers` 列表。

## 领域和大方向

`content/areas/base.md`：

```markdown
---
name: 地基
order: 1
skills: [cs61a, python, testing]
---
CS 核心课、数学和每天都用的工具。
```

`order` 是领域页签和首页技能目录里的先后顺序，按学的先后排。大方向（`content/categories/`）的写法一样，列表叫 `careers`。

## 提交之前

```bash
npm install
npm test
```

体检会检查：引用的技能存不存在、前置有没有绕成环、学习流程是不是 4 到 6 步、一句话是不是“会……，能……”、链接有没有重复。有错误时 `npm test` 失败，按提示改就行。想在浏览器里看效果，跑 `npm run dev`。

链接是否还能打开，由 GitHub 上的“Check links”检查（[lychee](https://github.com/lycheeverse/lychee)）负责：改了内容会跑一次，每周一也会自动跑一次，打不开的链接会列出来。
