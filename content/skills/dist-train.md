---
name: 分布式训练
icon: layers
requires: [dlsys, distributed, nccl]
---
会用数据并行、FSDP 和混合精度，能用多张卡训练一个模型。

## 学习流程
- 数据并行
- 混合精度
- FSDP 和 ZeRO
- 梯度累积和重算
- 用多卡训一个模型

## 去哪学
- [PyTorch 分布式概览](https://pytorch.org/tutorials/beginner/dist_overview.html) · 文档 · 免费
