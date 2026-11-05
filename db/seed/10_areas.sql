-- 领域：技能树上的一支。地基在中心，其余从中心往外发散。
-- 顺序就是绕圆一圈的顺序：主线 AI Infra 放在最上方，相关的领域挨着。
INSERT INTO layers (id, name, position) VALUES
  ('foundation', '地基', 1),
  ('core',       '主线', 2),
  ('advanced',   '边线', 3);

INSERT INTO area_rows VALUES
('base',     'foundation', '地基',     'CS 核心课、数学和每天都用的工具。每样都要有，最可迁移。'),
('infra',    'core',       'AI Infra', '让大模型跑得更快更省：推理引擎、GPU kernel、AI 编译器。'),
('llm',      'core',       'AI 算法',  '训练模型本身：大模型的预训练和对齐，推荐、视觉这些机器学习算法。'),
('dev',      'core',       '软件开发', '图形学、游戏引擎这些做软件和游戏要用的技能。'),
('product',  'core',       'AI 产品',  '用大模型做出自己的产品：后端、前端、RAG、Agent。'),
('systems',  'core',       '底层系统', '操作系统、并发、网络、编译器、分布式：AI Infra 的根。'),
('quant',    'advanced',   '数据与量化', '处理和分析数据，用数据研究市场。'),
('security', 'advanced',   '安全',     '找漏洞、补漏洞。');
