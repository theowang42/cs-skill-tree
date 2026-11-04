# 🌲 cs-skill-tree

简体中文 | [English](docs/README.en.md)

**一棵从中心往四周长的 CS 技能树：点亮你会的，看清自己的能力边界和下一步。**

- 中心是 CS 核心课：CS61A / 61B / 61C、CSAPP、6.006、18.06、Stat 110，往外是 6.S081、CS168、CS149、CS229、15-445、6.824……共 17 门课
- 课程之外是 43 个能写进简历的技能（Python、Linux、CUDA、PyTorch、vLLM 推理、Linux 内核开发……），每个都有自己的图标
- 像游戏的技能树：一条条链往外长，只在关键节点分叉；枝头是 13 个方向（推理工程师、GPU Kernel 工程师、独立开发者……）
- 已掌握的涂黑，能学的黑框，还够不着的浅灰。前置都会了的技能就是你的**能力边界**
- 点进任何一个技能，只有一句话和几个去哪学的链接
- 点枝头的一个方向，树上亮出它要学的全部技能；设为目标后标出下一个该学的

👉 https://theowang42.github.io/cs-skill-tree/

![技能树：中心是 61A、18.06 和 Linux 三根主干，AI Infra 的链朝上长，课程是方块、技能是圆，已掌握的涂黑](docs/screenshot.jpg)

## 怎么用

1. 从中心的课开始，点一个你已经学过的，在右边把它标成“已掌握”，它解锁的节点会变成黑框
2. 一路往外点，直到黑框的你都不会为止。那就是你现在的位置
3. 点枝头的方向（◇），或右上角“选一个目标”，树上会亮出要学的路线

滚轮缩放，拖动平移。

快捷键：`/` 搜索 · `Q` 快速点亮 · 选中时 `D` 已掌握、`L` 在学、`X` 清除 · `Esc` 返回

美术规范在 [docs/ART.md](docs/ART.md)。

## 本地运行

需要 Node 22.18 以上（用到内置的 `node:sqlite` 和直接运行 TypeScript），不需要装数据库。

```bash
npm ci
npm run dev        # 只有前端，进度存浏览器
npm run dev:api    # 前端 + API，进度存 SQLite（data/cs-skill-tree.db）
npm test
```

## 改内容

所有内容都在 `db/seed/*.sql`，一个技能一行。改完跑 `npm run db:build`，它会重建数据库并体检：
前置成环、等级倒挂、重复图标、编号断档、内容缺失、多余的前置都会报出来。

数据库结构、命令、API 和前端结构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。课程主要参考 [csdiy.wiki](https://csdiy.wiki/)。
