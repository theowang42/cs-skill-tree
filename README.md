# 🌲 cs-skill-tree

**能力导向的计算机科学技能树：先选一个方向，再看要学什么。**
**An ability-oriented computer science skill tree: pick a direction, see what to learn.**

在线访问 / Live：https://theowang42.github.io/cs-skill-tree/

---

## 是什么 · What

一张 CS 学习地图。不按课程排，而是从真实的工作方向（AI、Web、操作系统、安全……）倒推：要用哪些工具，要掌握哪些能力，去哪门公开课学。

A map for learning computer science. Instead of listing courses, it starts from real career directions (AI, web, operating systems, security…) and works backward: which tools you need, which abilities to master, and which open courses teach them.

## 结构 · Structure

| 层 Layer | 内容 Content |
|---|---|
| L5 应用层 Directions | AI · 应用 Apps · 基础设施与数据 Infra & Data · 系统 Systems · 安全 Security · 硬件 Hardware · 其他 Other |
| L4 工具层 Tools | 16 门语言 languages · 14 个框架 frameworks · 15 个平台 platforms（Python, Rust, PyTorch, LangChain, Docker, Kubernetes…） |
| L3 进阶层 Advanced | 机器学习 ML · 分布式 Distributed · 高性能计算 HPC · 体系结构 Architecture · 图形学 Graphics · 安全基础 Security · 计算理论 Theory |
| L2 核心层 Core | 数据结构与算法 DSA · 计算机组成 Organization · 操作系统 OS · 网络 Networking · 数据库 Databases · 编译原理 Compilers · 软件工程 SWE |
| L1 基础层 Foundations | 数学 Math · 编程 Programming · 工具链 Tooling |

## 怎么用 · How to use

1. 在应用层选一个方向 / Pick a direction in the top layer.
2. 下面变黑的，就是要学的 / Everything that turns black below is what you need.
3. 点任意一格看介绍和链接 / Click any square for an intro and links.

课程主要参考 [CS 自学指南 csdiy.wiki](https://csdiy.wiki/)。
Courses mainly follow [csdiy.wiki](https://csdiy.wiki/) (a self-taught CS guide).

## 修改内容 · Edit content

所有内容都在 `src/data/`，改这里即可，不用碰界面代码。
All content lives in `src/data/`; no UI code needed.

- `roadmap.ts` — 方向、工具、能力及依赖关系 / directions, tools, abilities and dependencies
- `details.ts` — 介绍与链接 / intros and links
- `icons.ts` — 工具图标 / tool icons

## 本地运行 · Run locally

```bash
npm ci
npm run dev
```

推送到默认分支后自动部署到 GitHub Pages。
Pushes to the default branch deploy to GitHub Pages automatically.

## 致谢 · Credits

[csdiy.wiki](https://csdiy.wiki/) · [Simple Icons](https://simpleicons.org/) · [Lucide](https://lucide.dev/)

---

关键词 / Keywords：计算机科学学习路线, CS 自学路线, 计算机技能树, 程序员成长路线, 开源方向, AI 学习路线, 公开课推荐, computer science roadmap, CS learning path, self-taught computer science, developer skill tree, open source career paths, CS curriculum
