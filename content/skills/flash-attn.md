---
name: 注意力算子
icon: focus
requires: [triton, nlp]
---
会手写融合注意力 kernel，能讲清 FlashAttention 为什么快。

## 学习流程
- 标准注意力的瓶颈
- 分块和在线 softmax
- 前向 kernel
- 反向传播
- 手写融合注意力

## 去哪学
- [FlashAttention 论文](https://arxiv.org/abs/2205.14135) · 论文 · 免费
