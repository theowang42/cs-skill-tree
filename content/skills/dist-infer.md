---
name: 分布式推理
icon: network
requires: [vllm, distributed]
---
会用张量并行和流水线并行，能把一个大模型拆到多张卡上跑起来。

## 学习流程
- 张量并行
- 流水线并行
- 多卡通信开销
- 多机部署
- 把 70B 模型跑在多卡上

## 去哪学
- [vLLM 分布式部署](https://docs.vllm.ai/en/latest/serving/distributed_serving.html) · 文档 · 免费
