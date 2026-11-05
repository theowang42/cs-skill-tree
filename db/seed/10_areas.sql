-- 领域：技能树上的一支。地基在中心，其余从中心往外发散。
-- 顺序就是绕圆一圈的顺序：主线 AI Infra 放在最上方，相关的领域挨着。
INSERT INTO layers (id, name, position) VALUES
  ('foundation', '地基', 1),
  ('core',       '主线', 2),
  ('advanced',   '边线', 3);

INSERT INTO area_rows VALUES
('base',     'foundation', '地基',     'CS 核心课、数学和每天都用的工具。每样都要有，最可迁移。'),
('infra',    'core',       'AI Infra', '让大模型跑得更快更省：推理引擎、GPU kernel、AI 编译器。'),
('llm',      'core',       '大模型',   '训练和对齐大模型本身：预训练、后训练、评测。'),
('product',  'core',       'AI 产品',  '用大模型做出自己的产品：后端、前端、RAG、Agent。'),
('systems',  'core',       '底层系统', '操作系统、并发、网络、编译器、分布式：AI Infra 的根。'),
('quant',    'advanced',   '量化',     '用数据和统计研究市场。'),
('security', 'advanced',   '安全',     '找漏洞、补漏洞。'),
('robotics', 'advanced',   '机器人',   '让模型控制真实世界的机器。'),
('chain',    'advanced',   '区块链',   '智能合约和去中心化应用。');
