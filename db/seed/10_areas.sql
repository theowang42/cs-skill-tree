-- 层和分支。分支就是技能树的一列，顺序就是页面上从左到右的顺序。
INSERT INTO layers (id, name, position) VALUES
  ('foundation', '基础', 1),
  ('core',       '核心', 2),
  ('advanced',   '方向', 3);

INSERT INTO area_rows VALUES
('lang',     'foundation', '编程语言',   '写代码用的语言。先精通一门，再按方向补第二门。'),
('craft',    'foundation', '编程功底',   '不管用什么语言都要会的东西：数据结构与算法、面向对象设计。'),
('tools',    'foundation', '工程工具',   '每天都在用的工具：版本控制、命令行、测试、容器、自动化。'),
('web',      'core',       'Web 开发',   '网页前端和服务端：页面、接口、框架。岗位最多的一片。'),
('data',     'core',       '数据',       '存数据、查数据、处理海量数据。'),
('systems',  'core',       '系统',       '贴近操作系统和硬件：系统编程、并发、性能、嵌入式。'),
('cloud',    'advanced',   '云与运维',   '让服务稳定地跑在服务器和云上：部署、编排、监控。'),
('security', 'advanced',   '安全',       '找漏洞、补漏洞：Web 安全、渗透、逆向。'),
('ai',       'advanced',   'AI',         '机器学习、深度学习和大模型应用。'),
('client',   'advanced',   '客户端与游戏', '手机 App、跨平台应用、图形渲染和游戏。');
