# 🌲 cs-skill-tree

简体中文 | [English](docs/README.en.md)

**一棵 CS 技能树，像动作游戏的天赋树：点亮你会的，看清自己的能力边界。**

- 63 个能写进简历的技能（Python、Docker、PostgreSQL、Linux 系统编程、PyTorch……），分在 10 个分支里，每个都有自己的图标
- 五个等级：入门、基础、进阶、专精、前沿，每个分支都是五行，一眼看出深浅
- 已掌握的涂黑，能学的黑框，还够不着的浅灰。前置都会了的技能就是你的**能力边界**
- 点进任何一个技能，只有一句话和几个去哪学的链接
- 选一个**目标方向**，树上标出下一个该学的；进度存在浏览器，可以导出、导入、分享；也可以跑带数据库的服务端版本

👉 https://theowang42.github.io/cs-skill-tree/

![Web 开发分支：五个等级五行，已掌握的涂黑，选中 Spring Boot 后右侧只有一句话和去哪学](docs/screenshot.jpg)

## 怎么用

1. 左边选一个分支，点一个你已经会的技能，在右边把它标成“已掌握”，它解锁的技能会变成黑框
2. 一路点下去，直到黑框的技能你都不会为止。那就是你现在的位置
3. 右上角“选一个目标”，设为目标后左边会标出每个分支还差几个，树上标出下一个该学的

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
