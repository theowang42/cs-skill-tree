# cs-skill-tree

简体中文 | [English](docs/README.en.md)

**一棵圆形的 CS 技能树：点亮你会的，看清自己离哪个职业还差什么。**

- 169 个能写进简历的技能，从编程入门、数据结构、操作系统，到 PyTorch、CUDA、vLLM 推理，每个一个图标
- 像游戏的技能树：从正中心的起点出发，编程入门、Linux、微积分在第一圈，一条条链沿半径笔直往外长，越往外越深；前置都点亮了才能点亮下一个
- 最外圈是 17 枚职业徽章，各在自己那条链的尽头，覆盖计算机毕业生的主要去处。要学的都点亮了，徽章自己就亮，不用先选
- 点进任何一个技能，只有一句话和去哪学的链接

👉 https://theowang42.github.io/cs-skill-tree/

![技能树：从正中心的起点一圈一圈往外长，已点亮的节点是黑底，外面一圈光芒在转](docs/screenshot.jpg)

## 怎么用

1. 从正中心附近开始，点一个你会的，点“点亮”
2. 一路往外点，点到不会为止。那就是你现在的位置
3. 点最外圈的职业徽章，树上会亮出它要学的全部技能

滚轮缩放，拖动平移。选中技能时 `D` 点亮、`X` 取消，`Esc` 返回。

## 本地运行

需要 Node 22.18 以上，不用装数据库。

```bash
npm ci
npm run dev        # 只有前端，进度存浏览器
npm run dev:api    # 前端 + API，进度存 SQLite
npm test
```

## 改内容

内容都在 `db/seed/*.sql`，一个技能一行。改完跑 `npm run db:build`，会重建数据库并体检，有问题会报出来。

数据库、API 和前端结构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，美术规范见 [docs/ART.md](docs/ART.md)。课程主要参考 [csdiy.wiki](https://csdiy.wiki/)。
