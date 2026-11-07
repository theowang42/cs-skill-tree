---
name: Docker
icon: si:docker
requires: [linux]
---
会写 Dockerfile 打包应用，能用镜像在任何机器上把服务跑起来。

## 学什么
- 镜像、容器、镜像仓库的关系，镜像为什么是一层一层的
- 写 Dockerfile：选基础镜像、利用构建缓存、用多阶段构建把镜像变小
- 端口映射、环境变量、数据卷：服务怎么对外访问，数据怎么在重启后不丢
- 看日志、进到容器里排查问题
- 给镜像打标签，推到镜像仓库再在别处拉下来

## 怎么算会了
给自己的一个 Web 项目写 Dockerfile，在另一台机器上一条 docker run 就能跑起来，重启后数据还在。

## 去哪学
- [Docker 官方入门](https://docs.docker.com/get-started/) · 文档 · 免费
- [Dockerfile 最佳实践](https://docs.docker.com/build/building/best-practices/) · 文档 · 免费
