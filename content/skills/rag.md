---
name: RAG 检索
icon: file-search
requires: [llm-app, vector-db]
---
会切块、向量化和检索，能让模型基于自己的资料准确回答。

## 学什么
- 完整流程：切块、向量化、检索、拼进提示词、生成回答
- 切块：按长度还是按标题切，块多大、要不要重叠
- 混合检索：向量检索加关键词检索，再用重排序模型挑出最相关的几块
- 让回答带上出处，检索不到时让模型直接说不知道
- 分开评测“找没找对”和“答没答对”，知道问题出在哪一步

## 怎么算会了
用自己的一批文档做一个问答机器人，准备 30 个问题测一遍，说得出检索命中率和回答准确率，并至少改进一处让分数变高。

## 去哪学
- [LangChain RAG 教程](https://python.langchain.com/docs/tutorials/rag/) · 文档 · 免费
- [Anthropic：Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) · 文章 · 免费
