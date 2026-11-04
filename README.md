# 🌲 cs-skill-tree

简体中文 | [English](docs/README.en.md)

**一张从中心往四周长的 CS 技能网：点亮你会的，看清自己的能力边界和下一步。**

- 46 个能写进简历的技能（Python、C、Linux、CUDA、PyTorch、vLLM 推理、操作系统内核……），每个都有自己的图标
- 地基在中心，AI Infra、底层系统、AI 产品、量化、安全、机器人、区块链朝不同方向长出去，越往外越深
- 已掌握的涂黑，能学的黑框，还够不着的浅灰。前置都会了的技能就是你的**能力边界**
- 点进任何一个技能，只有一句话和几个去哪学的链接
- 选一个**目标方向**（推理工程师、GPU Kernel 工程师、独立开发者……），网上标出下一个该学的

👉 https://theowang42.github.io/cs-skill-tree/

![技能网：地基在中心，AI Infra 朝上长，已掌握的涂黑；悬停 vLLM 推理时只亮出它的前置路线](docs/screenshot.jpg)

## 怎么用

1. 从中心附近点一个你已经会的技能，在右边把它标成“已掌握”，它解锁的技能会变成黑框
2. 一路往外点，直到黑框的技能你都不会为止。那就是你现在的位置
3. 右上角“选一个目标”，网上会标出下一个该学的

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
