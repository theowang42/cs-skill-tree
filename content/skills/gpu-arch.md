---
name: GPU 架构
icon: memory-stick
requires: [parallel, arch]
---
会讲清 SM、warp、显存层次和 Tensor Core，能据此判断 kernel 该怎么写。

## 学习流程
- SM 和 warp
- 显存层次
- Tensor Core
- 占用率和调度
- 分析一个 kernel 瓶颈

## 去哪学
- [CUDA 编程指南：硬件实现](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#hardware-implementation) · 文档 · 免费
- [Modal GPU 术语表](https://modal.com/gpu-glossary) · 文章 · 免费
