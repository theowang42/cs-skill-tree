---
name: 算子与编译器工程师
icon: cpu
keywords: [CUDA, Triton, AI 编译器]
requires: [flash-attn, cutlass, tvm]
---
手写注意力、矩阵乘这些核心算子，再让编译器自动生成它们，把显卡的算力榨干。

## 平时做什么
- 写融合算子
- 分析访存瓶颈
- 做编译优化

## 代表项目
- [Triton](https://github.com/triton-lang/triton)
- [Apache TVM](https://github.com/apache/tvm)
