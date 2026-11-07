---
name: GPU 性能调优
icon: activity
requires: [cuda, perf]
---
会用 Nsight 分析 kernel，能判断卡在算力还是访存并对症优化。

## 学习流程
- Nsight 基本用法
- Roofline 模型
- 访存瓶颈
- 计算瓶颈
- 把一个 kernel 调快

## 去哪学
- [Nsight Compute](https://docs.nvidia.com/nsight-compute/) · 文档 · 免费
- [GPU MODE 讲座](https://github.com/gpu-mode/lectures) · 视频 · 免费
