---
name: 物理信息神经网络
icon: waves
requires: [sci-compute, pytorch]
---
会把物理方程放进神经网络训练，能用 PINN 或神经算子求解一个偏微分方程。

## 学习流程
- 用网络逼近函数
- 把方程写进损失
- PINN 求解偏微分方程
- 神经算子：FNO
- 学一个流体模拟的替代模型

## 去哪学
- [DeepXDE](https://github.com/lululxvi/deepxde) · 项目 · 免费
- [neuraloperator](https://github.com/neuraloperator/neuraloperator) · 项目 · 免费
