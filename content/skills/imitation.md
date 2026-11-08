---
name: 模仿学习
icon: footprints
requires: [robot-sim, pytorch]
---
会用示范数据训练机器人策略，能用行为克隆或 Diffusion Policy 让机械臂学会一个动作。

## 学习流程
- 采集示范数据
- 行为克隆
- 动作分块和扩散策略
- 评测和失败分析
- 让机械臂学会叠一块布

## 去哪学
- [LeRobot](https://github.com/huggingface/lerobot) · 项目 · 免费
- [Diffusion Policy](https://diffusion-policy.cs.columbia.edu/) · 论文 · 免费
