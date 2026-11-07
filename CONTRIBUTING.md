# 参与写内容

技能树的全部内容都在 `content/` 里，一个技能、一个职业各一个 Markdown 文件，文件名就是它的 id。改内容不用懂代码：

- **改一处小地方**：网站上每个技能页、职业页底部都有“在 GitHub 上改这一页”，点进去直接改，提交一个 Pull Request。
- **改得多、或者加新技能**：把仓库克隆下来，改完跑 `npm test`，内容体检会指出哪里不对。

```
content/
  areas/       领域：技能树上的一支，列出它的技能和顺序
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

## 学什么
- 镜像、容器、镜像仓库的关系，镜像为什么是一层一层的
- 写 Dockerfile：选基础镜像、利用构建缓存、用多阶段构建把镜像变小

## 怎么算会了
给自己的一个 Web 项目写 Dockerfile，在另一台机器上一条 docker run 就能跑起来，重启后数据还在。

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
- **学什么**：要掌握的要点，3 到 8 条，每条一行。写“学会了能做什么”，不要抄课程目录。
- **怎么算会了**：一个自己能检验的任务，做出来就可以点亮。要具体，比如“写出一个……，能……”，不要写“熟悉……”。
- **去哪学**：一到三个最好的资源，优先官方文档、公开课和公认的经典。每个后面标上类型和是否免费：
  - 类型：课程、书、视频、文章、文档、论文、练习
  - 免费或付费

“学什么”和“怎么算会了”要一起写；写了它们，“去哪学”的每个链接都要标好类型。还没写讲解的技能只有一句话和链接，欢迎补上。

**加一个新技能**：新建 `content/skills/<id>.md`，再把 id 加进它所在领域 `content/areas/*.md` 的 `skills` 列表。列表的顺序就是树上同一层里的先后。id 用小写英文和连字符，定了就别改：用户的进度是按 id 存的。

## 职业

`content/careers/inference.md`：

```markdown
---
name: 推理工程师
icon: circle-gauge
hot: true
keywords: [vLLM, 分布式推理, 量化]
requires: [dist-infer, bench, quantization, perf, english]
bonus: [sglang, trt-llm]
---
部署和改进推理引擎，在服务器和端侧设备上让模型跑得更快更省。

## 平时做什么
- 部署推理服务
- 优化吞吐和延迟

## 代表项目
- [vLLM](https://github.com/vllm-project/vllm)
```

| 属性 | 写什么 |
| --- | --- |
| `name`、`icon` | 同技能。名字用招聘时最常写的岗位名 |
| `hot` | 热门方向写 `hot: true`，不是就不写 |
| `keywords` | 三个关键词 |
| `requires` | 必学的技能，只写最高层的，前置会自动带上。第一个是徽章挂在树上的位置 |
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

`order` 是绕圆一圈的顺序。大方向（`content/categories/`）的写法一样，列表叫 `careers`。

## 提交之前

```bash
npm install
npm test
```

体检会检查：引用的技能存不存在、前置有没有绕成环、讲解写全了没有、一句话是不是“会……，能……”、链接有没有重复。有错误时 `npm test` 失败，按提示改就行。想在浏览器里看效果，跑 `npm run dev`。
