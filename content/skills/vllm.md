---
name: vLLM 推理
icon: zap
requires: [gpt, concurrency]
---
会部署和调优 vLLM，能讲清 PagedAttention、连续批处理和 KV cache。

## 学什么
- 用 vLLM 起一个兼容 OpenAI 接口的推理服务，会调常用的启动参数
- KV cache 是什么、为什么最吃显存
- PagedAttention：像操作系统分页一样管理 KV cache，为什么能省下显存
- 连续批处理：为什么比一批一批地跑吞吐高得多
- 前缀缓存、分块预填充这些优化各解决什么问题
- 量吞吐、首个 token 的延迟和每个 token 的延迟，看懂调参前后的变化

## 怎么算会了
在一张 GPU 上部署一个 7B 左右的开源模型，压测出吞吐和延迟；改两三个参数之后，能用数据说清哪个更好、为什么。

## 去哪学
- [vLLM 文档](https://docs.vllm.ai/) · 文档 · 免费
- [vLLM 博客：PagedAttention 的来历](https://blog.vllm.ai/2023/06/20/vllm.html) · 文章 · 免费
- [PagedAttention 论文](https://arxiv.org/abs/2309.06180) · 论文 · 免费
