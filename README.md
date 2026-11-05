# 🌲 cs-skill-tree

简体中文 | [English](docs/README.en.md)

**一棵从下往上长的 CS 技能树：点亮你会的，看清自己的能力边界和下一步。**

- 126 个能写进简历的技能，从编程入门、数据结构、计算机系统、操作系统，到 PyTorch、CUDA、vLLM 推理、Agent 开发，每个都有自己的图标
- 像游戏的技能树：一列一列往上长，一条条链只在关键节点分叉；最上面一排是 13 个职业终极节点（推理工程师、GPU Kernel 工程师、独立开发者……）
- 不用先选职业：要学的技能都点亮了，那枚职业徽章自己就亮起来
- 编程语言是特别的“语言天赋”，画成六边形
- 只有点亮和没点亮，而且像游戏一样**前置都点亮了才能点亮**。能点亮的那一圈就是你的**能力边界**
- 点进任何一个技能，只有一句话和几个去哪学的链接

👉 https://theowang42.github.io/cs-skill-tree/

![技能树：从最下面的编程入门往上长，一列一列，主线 Python → NumPy → 机器学习 → PyTorch 在中间，已点亮的涂黑](docs/screenshot.jpg)

## 怎么用

1. 从最下面一排开始，点一个你已经会的，在右边点“点亮”，它解锁的节点会变成黑框
2. 一路往上点，直到黑框的你都不会为止。那就是你现在的位置
3. 点最上面一排的职业徽章，树上会亮出它要学的全部技能；都点亮了它就自动达成

滚轮缩放，拖动平移。

快捷键：`/` 搜索 · `Q` 快速点亮 · 选中时 `D` 点亮、`X` 取消 · `Esc` 返回

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
