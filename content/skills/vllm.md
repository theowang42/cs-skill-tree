---
name: vLLM 推理
icon: zap
requires: [gpt, concurrency]
---
会部署和调优 vLLM，能讲清 PagedAttention、连续批处理和 KV cache。

## 学习流程
- 跑起一个推理服务
- KV cache 和分页
- 连续批处理
- 前缀缓存和分块预填充
- 压测并调优一个模型

## 去哪学
- [vLLM 文档](https://docs.vllm.ai/) · 文档 · 免费
- [vLLM 博客：PagedAttention 的来历](https://blog.vllm.ai/2023/06/20/vllm.html) · 文章 · 免费
- [PagedAttention 论文](https://arxiv.org/abs/2309.06180) · 论文 · 免费
