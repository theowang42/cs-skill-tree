-- 工具层：语言、框架、平台。每组里按需求量排序：先看被几个细分方向用到，相同时按大众使用热度。
-- 改某个工具：搜它的 id（比如 'docker'）。图标在 src/data/icons.ts 里按 id 对应。

INSERT INTO tool_groups (id, name, short_name, position) VALUES
  ('language', '编程语言', '语言', 1),
  ('framework', '框架与库', '框架', 2),
  ('platform', '平台与工具', '平台', 3);

-- ───────── 编程语言 ─────────

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('python', 'language', 1, 'Python', 'Python 基金会',
   '语法像英语一样好读，特别适合入门。也是 AI、数据分析和写自动化脚本的首选。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('python', 1, '基础语法与数据类型'),
  ('python', 2, '函数、类与模块'),
  ('python', 3, '包管理（pip）'),
  ('python', 4, '常用标准库');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('python', 1, 'Python 官网', 'https://www.python.org/'),
  ('python', 2, 'Python 官方教程（中文）', 'https://docs.python.org/zh-cn/3/tutorial/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('cpp', 'language', 2, 'C++', '贝尔实验室',
   'C 的“加强版”，既能跑得很快，又能写复杂的大型程序。游戏引擎、浏览器、AI 框架的底层常用它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('cpp', 1, '类与面向对象'),
  ('cpp', 2, '模板与泛型编程'),
  ('cpp', 3, 'RAII 与智能指针'),
  ('cpp', 4, '标准模板库 STL');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('cpp', 1, 'isocpp.org', 'https://isocpp.org/'),
  ('cpp', 2, 'C++ 参考（cppreference）', 'https://en.cppreference.com/w/cpp');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('shell', 'language', 3, 'Shell', 'GNU',
   '在命令行里写的小脚本，能把各种程序串起来，把重复的操作自动化。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('shell', 1, '常用命令'),
  ('shell', 2, '管道与重定向'),
  ('shell', 3, '变量与流程控制'),
  ('shell', 4, '编写脚本');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('shell', 1, 'GNU Bash', 'https://www.gnu.org/software/bash/'),
  ('shell', 2, 'Bash 参考手册', 'https://www.gnu.org/software/bash/manual/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('c', 'language', 4, 'C', '贝尔实验室',
   '最经典的编程语言之一，贴近硬件、运行飞快。操作系统、嵌入式设备大多用它写。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('c', 1, '指针与手动内存管理'),
  ('c', 2, '结构体与数组'),
  ('c', 3, '编译、链接与预处理'),
  ('c', 4, '标准库');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('c', 1, 'C 语言参考（cppreference）', 'https://en.cppreference.com/w/c'),
  ('c', 2, 'C 标准委员会 WG14', 'https://www.open-std.org/jtc1/sc22/wg14/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('go', 'language', 5, 'Go', 'Google',
   'Google 出的语言，语法简单，写并发程序很方便。Docker、Kubernetes 都是用它写的。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('go', 1, 'goroutine 与 channel'),
  ('go', 2, '接口'),
  ('go', 3, '标准库与网络编程'),
  ('go', 4, 'Go modules');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('go', 1, 'Go 官网', 'https://go.dev/'),
  ('go', 2, 'A Tour of Go', 'https://go.dev/tour/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('sql', 'language', 6, 'SQL', 'IBM',
   '和数据库“对话”的语言：查数据、改数据、建表都靠它。几乎所有方向都会用到。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('sql', 1, '查询：SELECT、JOIN、GROUP BY'),
  ('sql', 2, '增删改'),
  ('sql', 3, '建表与约束'),
  ('sql', 4, '索引与事务');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('sql', 1, 'PostgreSQL SQL 教程', 'https://www.postgresql.org/docs/current/tutorial-sql.html'),
  ('sql', 2, 'SQLite 支持的 SQL', 'https://sqlite.org/lang.html');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('rust', 'language', 7, 'Rust', 'Rust 基金会',
   '一门新的系统语言，和 C/C++ 一样快，但能在编译时就挡住很多内存错误。越来越多底层项目在改用它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('rust', 1, '所有权与借用'),
  ('rust', 2, '生命周期'),
  ('rust', 3, 'trait 与泛型'),
  ('rust', 4, 'Cargo 包管理');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('rust', 1, 'Rust 官网', 'https://www.rust-lang.org/'),
  ('rust', 2, 'The Rust Book', 'https://doc.rust-lang.org/book/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('asm', 'language', 8, '汇编', 'Intel / ARM',
   'CPU 能直接看懂的指令的文字版。平时很少直接写，但读得懂它，才能看清程序在机器上到底做了什么。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('asm', 1, '寄存器与指令'),
  ('asm', 2, '调用约定与栈帧'),
  ('asm', 3, 'x86-64、ARM、RISC-V'),
  ('asm', 4, '读反汇编');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('asm', 1, 'Intel 64 与 IA-32 架构手册', 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html'),
  ('asm', 2, 'Arm 开发者文档', 'https://developer.arm.com/documentation');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('typescript', 'language', 9, 'TypeScript', 'Microsoft',
   '给 JavaScript 加上类型检查，写大项目时能提前发现很多错误，现在前端基本都用它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('typescript', 1, '类型标注与推断'),
  ('typescript', 2, '接口与泛型'),
  ('typescript', 3, '联合类型与类型收窄'),
  ('typescript', 4, '编译配置');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('typescript', 1, 'TypeScript 官网', 'https://www.typescriptlang.org/'),
  ('typescript', 2, 'TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('javascript', 'language', 10, 'JavaScript', 'Ecma',
   '网页的“灵魂”，所有浏览器都能直接运行它。想做网页，绕不开它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('javascript', 1, '基础语法与对象'),
  ('javascript', 2, '异步：Promise 与 async/await'),
  ('javascript', 3, 'DOM 操作'),
  ('javascript', 4, '模块化');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('javascript', 1, 'MDN JavaScript 文档', 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript'),
  ('javascript', 2, 'ECMAScript 规范', 'https://tc39.es/ecma262/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('java', 'language', 11, 'Java', 'Oracle',
   '老牌的主力语言，大公司的后端服务和安卓 App 大量使用，工作机会非常多。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('java', 1, '面向对象'),
  ('java', 2, '集合框架'),
  ('java', 3, 'JVM 与垃圾回收'),
  ('java', 4, '并发编程');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('java', 1, 'dev.java', 'https://dev.java/'),
  ('java', 2, 'Java 官方文档', 'https://docs.oracle.com/en/java/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('csharp', 'language', 12, 'C#', 'Microsoft',
   '微软的主力语言，常用于 Windows 软件和企业系统，也是 Unity 游戏开发用的语言。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('csharp', 1, '面向对象'),
  ('csharp', 2, 'LINQ'),
  ('csharp', 3, 'async/await'),
  ('csharp', 4, '.NET 运行时');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('csharp', 1, 'C# 文档', 'https://learn.microsoft.com/dotnet/csharp/'),
  ('csharp', 2, '.NET 官网', 'https://dotnet.microsoft.com/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('kotlin', 'language', 13, 'Kotlin', 'JetBrains',
   '更现代、更简洁的 Java 替代品，现在是安卓开发的官方首选语言。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('kotlin', 1, '空安全'),
  ('kotlin', 2, '协程'),
  ('kotlin', 3, '与 Java 互操作'),
  ('kotlin', 4, '扩展函数');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('kotlin', 1, 'Kotlin 官网', 'https://kotlinlang.org/'),
  ('kotlin', 2, 'Kotlin 文档', 'https://kotlinlang.org/docs/home.html');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('swift', 'language', 14, 'Swift', 'Apple',
   '苹果推出的语言，用来开发 iPhone、iPad 和 Mac 上的 App。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('swift', 1, '可选类型'),
  ('swift', 2, '协议与扩展'),
  ('swift', 3, '值类型与引用类型'),
  ('swift', 4, 'async/await 并发');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('swift', 1, 'Swift 官网', 'https://www.swift.org/'),
  ('swift', 2, 'The Swift Programming Language', 'https://docs.swift.org/swift-book/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('verilog', 'language', 15, 'Verilog', 'IEEE',
   '用来“写电路”的语言。写出来的不是程序，而是会被做成芯片或烧进 FPGA 的硬件。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('verilog', 1, '模块与端口'),
  ('verilog', 2, '组合逻辑与时序逻辑'),
  ('verilog', 3, '状态机'),
  ('verilog', 4, '仿真与测试');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('verilog', 1, 'Verilator 开源仿真器', 'https://github.com/verilator/verilator'),
  ('verilog', 2, 'HDLBits 在线练习', 'https://hdlbits.01xz.net/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('solidity', 'language', 16, 'Solidity', '以太坊基金会',
   '在以太坊区块链上写“智能合约”的语言，合约一旦部署就会自动按规则执行。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('solidity', 1, '合约与状态变量'),
  ('solidity', 2, '函数与修饰器'),
  ('solidity', 3, 'Gas 与成本'),
  ('solidity', 4, '常见安全问题');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('solidity', 1, 'Solidity 官网', 'https://soliditylang.org/'),
  ('solidity', 2, 'Solidity 文档', 'https://docs.soliditylang.org/');

-- ───────── 框架与库 ─────────

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('numpy', 'framework', 1, 'NumPy', 'NumFOCUS',
   'Python 做数值计算的基础库，几乎所有数据分析和 AI 库都建立在它之上。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('numpy', 1, '多维数组'),
  ('numpy', 2, '广播'),
  ('numpy', 3, '向量化运算'),
  ('numpy', 4, '线性代数');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('numpy', 1, 'NumPy 官网', 'https://numpy.org/'),
  ('numpy', 2, 'NumPy 文档', 'https://numpy.org/doc/stable/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('pandas', 'framework', 2, 'pandas', 'NumFOCUS',
   '在 Python 里处理表格数据的利器，可以理解成“用代码操作的 Excel”。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('pandas', 1, 'DataFrame'),
  ('pandas', 2, '读写 CSV 和 Excel'),
  ('pandas', 3, '筛选、分组与聚合'),
  ('pandas', 4, '数据清洗');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('pandas', 1, 'pandas 官网', 'https://pandas.pydata.org/'),
  ('pandas', 2, 'pandas 文档', 'https://pandas.pydata.org/docs/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('fastapi', 'framework', 3, 'FastAPI', '开源社区',
   '用 Python 写接口（API）的现代框架，写起来简单，跑得也快，在 AI 项目里很常见。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('fastapi', 1, '路由与请求参数'),
  ('fastapi', 2, '类型校验（Pydantic）'),
  ('fastapi', 3, '异步接口'),
  ('fastapi', 4, '自动生成 API 文档');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('fastapi', 1, 'FastAPI 官网', 'https://fastapi.tiangolo.com/'),
  ('fastapi', 2, 'FastAPI 教程', 'https://fastapi.tiangolo.com/tutorial/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('pytorch', 'framework', 4, 'PyTorch', 'PyTorch 基金会',
   '最主流的深度学习框架，研究人员和公司都在用它搭建和训练神经网络。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('pytorch', 1, '张量运算'),
  ('pytorch', 2, '自动求导'),
  ('pytorch', 3, '搭建和训练模型'),
  ('pytorch', 4, 'GPU 加速');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('pytorch', 1, 'PyTorch 官网', 'https://pytorch.org/'),
  ('pytorch', 2, 'PyTorch 教程', 'https://docs.pytorch.org/tutorials/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('react', 'framework', 5, 'React', 'Meta',
   '目前最流行的网页界面框架，把页面拆成一个个可复用的“组件”来搭。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('react', 1, '组件与 JSX'),
  ('react', 2, 'props 与 state'),
  ('react', 3, 'Hooks'),
  ('react', 4, '渲染与性能');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('react', 1, 'React 官网', 'https://react.dev/'),
  ('react', 2, 'React 中文文档', 'https://zh-hans.react.dev/learn');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('spring', 'framework', 6, 'Spring', 'Broadcom',
   'Java 后端开发的标配框架，大部分 Java 后端岗位都会用到。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('spring', 1, '依赖注入'),
  ('spring', 2, 'Spring Boot'),
  ('spring', 3, 'Web 与 REST API'),
  ('spring', 4, '数据访问');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('spring', 1, 'Spring 官网', 'https://spring.io/'),
  ('spring', 2, 'Spring 入门指南', 'https://spring.io/guides');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('django', 'framework', 7, 'Django', 'Django 基金会',
   'Python 的“全家桶”网站框架，自带后台管理和数据库操作，能很快做出一个完整网站。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('django', 1, '模型与 ORM'),
  ('django', 2, '视图与路由'),
  ('django', 3, '模板'),
  ('django', 4, '自带管理后台');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('django', 1, 'Django 官网', 'https://www.djangoproject.com/'),
  ('django', 2, 'Django 文档', 'https://docs.djangoproject.com/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('vue', 'framework', 8, 'Vue', '尤雨溪',
   '另一款很受欢迎的网页框架，上手比 React 更简单，中文资料也很多。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('vue', 1, '模板语法'),
  ('vue', 2, '响应式数据'),
  ('vue', 3, '组件'),
  ('vue', 4, '组合式 API');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('vue', 1, 'Vue 官网', 'https://vuejs.org/'),
  ('vue', 2, 'Vue 中文文档', 'https://cn.vuejs.org/guide/introduction.html');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('flutter', 'framework', 9, 'Flutter', 'Google',
   'Google 出的框架，写一套代码，就能同时做出 iPhone、安卓、电脑和网页版的 App。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('flutter', 1, 'Dart 语言'),
  ('flutter', 2, 'Widget 与布局'),
  ('flutter', 3, '状态管理'),
  ('flutter', 4, '调用原生能力');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('flutter', 1, 'Flutter 官网', 'https://flutter.dev/'),
  ('flutter', 2, 'Flutter 文档', 'https://docs.flutter.dev/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('transformers', 'framework', 10, 'Transformers', 'Hugging Face',
   'Hugging Face 出品，几行代码就能下载并使用各种现成的大模型。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('transformers', 1, '加载预训练模型'),
  ('transformers', 2, '分词器'),
  ('transformers', 3, '推理管线'),
  ('transformers', 4, '微调训练');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('transformers', 1, 'Transformers 文档', 'https://huggingface.co/docs/transformers'),
  ('transformers', 2, 'Hugging Face 官网', 'https://huggingface.co/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('langchain', 'framework', 11, 'LangChain', 'LangChain',
   '把大模型、工具和你自己的数据串起来，搭出能帮人干活的 AI 应用和 Agent。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('langchain', 1, '调用大模型'),
  ('langchain', 2, '提示词模板'),
  ('langchain', 3, '工具调用与 Agent'),
  ('langchain', 4, '检索增强（RAG）');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('langchain', 1, 'LangChain 官网', 'https://www.langchain.com/'),
  ('langchain', 2, 'LangChain 文档', 'https://docs.langchain.com/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('spark', 'framework', 12, 'Spark', 'Apache',
   '一台电脑处理不过来的海量数据，就交给 Spark，让一群电脑一起算。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('spark', 1, 'RDD 与 DataFrame'),
  ('spark', 2, 'Spark SQL'),
  ('spark', 3, '流处理'),
  ('spark', 4, '集群部署');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('spark', 1, 'Apache Spark 官网', 'https://spark.apache.org/'),
  ('spark', 2, 'Spark 文档', 'https://spark.apache.org/docs/latest/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('qt', 'framework', 13, 'Qt', 'Qt Group',
   '老牌的 C++ 界面框架，很多桌面软件和车机、仪表盘的界面都是用它做的。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('qt', 1, '信号与槽'),
  ('qt', 2, 'Widgets'),
  ('qt', 3, 'QML'),
  ('qt', 4, '跨平台构建');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('qt', 1, 'Qt 官网', 'https://www.qt.io/'),
  ('qt', 2, 'Qt 文档', 'https://doc.qt.io/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('godot', 'framework', 14, 'Godot', 'Godot 基金会',
   '完全免费开源的游戏引擎，做 2D 和 3D 游戏都可以，对新手很友好。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('godot', 1, '场景与节点'),
  ('godot', 2, 'GDScript'),
  ('godot', 3, '物理与动画'),
  ('godot', 4, '导出到各平台');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('godot', 1, 'Godot 官网', 'https://godotengine.org/'),
  ('godot', 2, 'Godot 文档', 'https://docs.godotengine.org/');

-- ───────── 平台与工具 ─────────

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('docker', 'platform', 1, 'Docker', 'Docker',
   '把程序和它需要的一切打包成一个“集装箱”，放到哪台电脑上都能一样运行。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('docker', 1, '镜像与容器'),
  ('docker', 2, 'Dockerfile'),
  ('docker', 3, '数据卷与网络'),
  ('docker', 4, 'Docker Compose');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('docker', 1, 'Docker 官网', 'https://www.docker.com/'),
  ('docker', 2, 'Docker 文档', 'https://docs.docker.com/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('postgres', 'platform', 2, 'PostgreSQL', '开源社区',
   '功能最强大的开源数据库之一，稳定可靠，很多公司都用它存核心数据。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('postgres', 1, 'SQL 与数据类型'),
  ('postgres', 2, '索引'),
  ('postgres', 3, '事务与 MVCC'),
  ('postgres', 4, '备份与复制');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('postgres', 1, 'PostgreSQL 官网', 'https://www.postgresql.org/'),
  ('postgres', 2, 'PostgreSQL 文档', 'https://www.postgresql.org/docs/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('nginx', 'platform', 3, 'Nginx', 'F5',
   '网站的“门卫”，负责接收用户请求，再分发给后面的服务。很多网站的入口都是它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('nginx', 1, '静态文件服务'),
  ('nginx', 2, '反向代理'),
  ('nginx', 3, '负载均衡'),
  ('nginx', 4, 'HTTPS 配置');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('nginx', 1, 'nginx 官网', 'https://nginx.org/'),
  ('nginx', 2, 'nginx 文档', 'https://nginx.org/en/docs/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('nodejs', 'platform', 4, 'Node.js', 'OpenJS 基金会',
   '让 JavaScript 不只在浏览器里跑，也能在服务器上跑。很多前端工具也靠它运行。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('nodejs', 1, '事件循环与异步 I/O'),
  ('nodejs', 2, '模块系统'),
  ('nodejs', 3, 'npm 包管理'),
  ('nodejs', 4, '写 HTTP 服务');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('nodejs', 1, 'Node.js 官网', 'https://nodejs.org/'),
  ('nodejs', 2, 'Node.js 入门', 'https://nodejs.org/en/learn');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('redis', 'platform', 5, 'Redis', 'Redis',
   '把数据放在内存里的数据库，速度极快，最常见的用途是做缓存。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('redis', 1, '常用数据结构'),
  ('redis', 2, '缓存策略'),
  ('redis', 3, '持久化'),
  ('redis', 4, '主从与集群');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('redis', 1, 'Redis 官网', 'https://redis.io/'),
  ('redis', 2, 'Redis 文档', 'https://redis.io/docs/latest/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('k8s', 'platform', 6, 'Kubernetes', 'CNCF',
   '管理成百上千个 Docker 容器的“调度中心”，自动部署、扩容，坏了自动重启。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('k8s', 1, 'Pod 与 Deployment'),
  ('k8s', 2, 'Service 与网络'),
  ('k8s', 3, '配置与存储'),
  ('k8s', 4, '自动扩缩容');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('k8s', 1, 'Kubernetes 官网', 'https://kubernetes.io/'),
  ('k8s', 2, 'Kubernetes 中文文档', 'https://kubernetes.io/zh-cn/docs/home/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('cuda', 'platform', 7, 'CUDA', 'NVIDIA',
   'NVIDIA 显卡的编程平台，让你调动显卡的几千个核心同时计算。AI 训练全靠它。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('cuda', 1, '线程、块与网格'),
  ('cuda', 2, 'GPU 内存层次'),
  ('cuda', 3, '核函数编写'),
  ('cuda', 4, '性能优化');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('cuda', 1, 'CUDA Toolkit', 'https://developer.nvidia.com/cuda-toolkit'),
  ('cuda', 2, 'CUDA 编程指南', 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('kafka', 'platform', 8, 'Kafka', 'Apache',
   '系统之间传递消息的“高速传送带”，每秒能处理海量事件。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('kafka', 1, '主题与分区'),
  ('kafka', 2, '生产者与消费者'),
  ('kafka', 3, '消费组'),
  ('kafka', 4, '数据持久化与复制');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('kafka', 1, 'Apache Kafka 官网', 'https://kafka.apache.org/'),
  ('kafka', 2, 'Kafka 文档', 'https://kafka.apache.org/documentation/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('terraform', 'platform', 9, 'Terraform', 'HashiCorp',
   '用写代码的方式申请服务器、网络这些云资源，不用在网页上一个个手动点。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('terraform', 1, 'HCL 配置语言'),
  ('terraform', 2, 'Provider 与资源'),
  ('terraform', 3, '状态管理'),
  ('terraform', 4, '模块复用');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('terraform', 1, 'Terraform 官网', 'https://developer.hashicorp.com/terraform'),
  ('terraform', 2, 'Terraform 教程', 'https://developer.hashicorp.com/terraform/tutorials');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('prometheus', 'platform', 10, 'Prometheus', 'CNCF',
   '给服务装上“体检仪”，持续记录各种运行指标，出问题能及时报警。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('prometheus', 1, '指标与标签'),
  ('prometheus', 2, 'PromQL 查询'),
  ('prometheus', 3, '告警规则'),
  ('prometheus', 4, '与 Grafana 配合');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('prometheus', 1, 'Prometheus 官网', 'https://prometheus.io/'),
  ('prometheus', 2, 'Prometheus 文档', 'https://prometheus.io/docs/introduction/overview/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('llvm', 'platform', 11, 'LLVM', 'LLVM 基金会',
   '一套“编译器积木”，很多语言都借助它把代码编译成机器指令，比如 Rust、Swift。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('llvm', 1, 'LLVM IR'),
  ('llvm', 2, '优化 Pass'),
  ('llvm', 3, '代码生成后端'),
  ('llvm', 4, 'Clang 前端');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('llvm', 1, 'LLVM 官网', 'https://llvm.org/'),
  ('llvm', 2, 'Kaleidoscope 教程：用 LLVM 写语言', 'https://llvm.org/docs/tutorial/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('wireshark', 'platform', 12, 'Wireshark', 'Wireshark 基金会',
   '网络“窃听器”，能抓下电脑收发的每一个数据包，看清网络通信的细节。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('wireshark', 1, '抓包与过滤'),
  ('wireshark', 2, '协议解析'),
  ('wireshark', 3, '追踪 TCP 流'),
  ('wireshark', 4, '排查网络问题');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('wireshark', 1, 'Wireshark 官网', 'https://www.wireshark.org/'),
  ('wireshark', 2, 'Wireshark 文档', 'https://www.wireshark.org/docs/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('ros', 'platform', 13, 'ROS 2', 'Open Robotics',
   '机器人开发的“操作系统”，提供通信、驱动和各种现成算法，省去很多重复工作。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('ros', 1, '节点与话题'),
  ('ros', 2, '服务与动作'),
  ('ros', 3, 'launch 启动配置'),
  ('ros', 4, '仿真（Gazebo）');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('ros', 1, 'ROS 官网', 'https://www.ros.org/'),
  ('ros', 2, 'ROS 2 文档', 'https://docs.ros.org/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('vivado', 'platform', 14, 'Vivado', 'AMD',
   'AMD（原 Xilinx）的 FPGA 设计软件，把你写的 Verilog 变成能在芯片上跑的电路。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('vivado', 1, '综合与实现'),
  ('vivado', 2, '时序约束与分析'),
  ('vivado', 3, '仿真'),
  ('vivado', 4, '下载到 FPGA 板');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('vivado', 1, 'Vivado 官网', 'https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado.html'),
  ('vivado', 2, 'AMD 技术文档', 'https://docs.amd.com/');

INSERT INTO tools (id, group_id, position, name, org, intro) VALUES
  ('ghidra', 'platform', 15, 'Ghidra', '美国 NSA',
   '美国国家安全局开源的逆向工具，能把编译好的程序还原成接近源码的样子来分析。');
INSERT INTO tool_topics (tool_id, position, text) VALUES
  ('ghidra', 1, '反汇编'),
  ('ghidra', 2, '反编译成 C 伪代码'),
  ('ghidra', 3, '函数与数据分析'),
  ('ghidra', 4, '脚本扩展');
INSERT INTO tool_links (tool_id, position, label, url) VALUES
  ('ghidra', 1, 'Ghidra 官网', 'https://ghidra-sre.org/'),
  ('ghidra', 2, 'Ghidra GitHub', 'https://github.com/NationalSecurityAgency/ghidra');
