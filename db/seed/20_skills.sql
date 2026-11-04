-- 技能：每一个都是能写进简历的、扎实的能力，不是知识点。
-- 每行：id, 分支, 等级, 图标, 名字, 一句话, 直接前置, 去哪学
--   等级 1 入门 · 2 基础 · 3 进阶 · 4 专精 · 5 前沿。前置的等级不能比它高（体检会查）。
--   图标是 Lucide 的名字（https://lucide.dev/icons），或 'si:' 开头的 Simple Icons 品牌图标。
--   链接只放官方文档或公认最好的那一两个教程。

-- ═════════ 编程语言 ═════════
INSERT INTO skill_rows VALUES
('python', 'lang', 1, 'si:python', 'Python',
 '最适合入门的语言，AI、数据分析、脚本和后端都用它。', '[]',
 '[["Python 官方教程", "https://docs.python.org/zh-cn/3/tutorial/"], ["CS61A", "https://cs61a.org/"]]'),
('javascript', 'lang', 1, 'si:javascript', 'JavaScript',
 '浏览器里唯一能直接跑的语言，做网页绕不开。', '[]',
 '[["现代 JavaScript 教程", "https://zh.javascript.info/"], ["MDN JavaScript 指南", "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide"]]'),
('c', 'lang', 2, 'si:c', 'C',
 '贴近硬件的语言，写操作系统、嵌入式和看懂内存都靠它。', '[]',
 '[["Learn C", "https://www.learn-c.org/"], ["C 参考手册", "https://en.cppreference.com/w/c"]]'),
('java', 'lang', 2, 'coffee', 'Java',
 '大公司后端和安卓的主力语言，工作机会最多之一。', '[]',
 '[["Dev.java 官方教程", "https://dev.java/learn/"]]'),
('go', 'lang', 2, 'si:go', 'Go',
 '语法简单、并发方便，云原生和后端服务常用。', '[]',
 '[["A Tour of Go", "https://go.dev/tour/"], ["Go by Example", "https://gobyexample.com/"]]'),
('typescript', 'lang', 2, 'si:typescript', 'TypeScript',
 '带类型的 JavaScript，现在的前端和 Node 项目基本都用它。', '["javascript"]',
 '[["TypeScript 官方手册", "https://www.typescriptlang.org/docs/handbook/intro.html"]]'),
('cpp', 'lang', 3, 'si:cplusplus', 'C++',
 '又快又能写大型程序，游戏引擎、数据库、AI 框架底层都用它。', '["c"]',
 '[["LearnCpp", "https://www.learncpp.com/"], ["C++ 参考手册", "https://en.cppreference.com/w/cpp"]]'),
('rust', 'lang', 3, 'si:rust', 'Rust',
 '和 C++ 一样快，但编译期就挡住内存错误，新的系统软件越来越多用它。', '["c"]',
 '[["Rust 程序设计语言（中文）", "https://kaisery.github.io/trpl-zh-cn/"]]');

-- ═════════ 编程功底 ═════════
INSERT INTO skill_rows VALUES
('dsa', 'craft', 2, 'network', '数据结构与算法',
 '数组、链表、树、图、排序、动态规划……写出又快又省的程序，面试必考。', '["python"]',
 '[["Hello 算法", "https://www.hello-algo.com/"], ["Princeton 算法", "https://algs4.cs.princeton.edu/"]]'),
('oop', 'craft', 2, 'boxes', '面向对象设计',
 '用类、接口和组合把程序拆成好维护的模块。', '["python"]',
 '[["MIT 6.031 软件构造", "https://web.mit.edu/6.031/"]]'),
('design-patterns', 'craft', 3, 'layout-template', '设计模式',
 '工厂、观察者、策略这些常见问题的经典解法。', '["oop"]',
 '[["Refactoring.Guru 设计模式", "https://refactoring.guru/design-patterns"]]');

-- ═════════ 工程工具 ═════════
INSERT INTO skill_rows VALUES
('git', 'tools', 1, 'si:git', 'Git',
 '版本控制和多人协作：提交、分支、合并、Pull Request。', '[]',
 '[["Pro Git（中文）", "https://git-scm.com/book/zh/v2"], ["Learn Git Branching", "https://learngitbranching.js.org/?locale=zh_CN"]]'),
('linux', 'tools', 1, 'si:linux', 'Linux',
 '在命令行里管理文件、进程、权限和服务。服务器几乎都是 Linux。', '[]',
 '[["Missing Semester", "https://missing.csail.mit.edu/"], ["Linux Journey", "https://linuxjourney.com/"]]'),
('shell', 'tools', 2, 'terminal', 'Shell 脚本',
 '用 Bash 把重复的操作写成脚本自动跑。', '["linux"]',
 '[["Bash 参考手册", "https://www.gnu.org/software/bash/manual/bash.html"]]'),
('testing', 'tools', 2, 'test-tube', '自动化测试',
 '单元测试、集成测试，改代码时心里有底。', '["python"]',
 '[["pytest 文档", "https://docs.pytest.org/"], ["Martin Fowler 谈测试", "https://martinfowler.com/testing/"]]'),
('docker', 'tools', 3, 'si:docker', 'Docker',
 '把应用和依赖打包成镜像，在哪都能一样地跑起来。', '["linux"]',
 '[["Docker 入门", "https://docs.docker.com/get-started/"]]'),
('cicd', 'tools', 3, 'infinity', 'CI/CD',
 '每次提交自动测试、自动部署，比如 GitHub Actions。', '["git", "testing"]',
 '[["GitHub Actions 文档", "https://docs.github.com/actions"]]');

-- ═════════ Web 开发 ═════════
INSERT INTO skill_rows VALUES
('html-css', 'web', 1, 'code-xml', 'HTML 与 CSS',
 '搭出网页的结构和样式，会用 Flex 和 Grid 布局。', '[]',
 '[["MDN 学习 Web 开发", "https://developer.mozilla.org/zh-CN/docs/Learn_web_development"], ["web.dev", "https://web.dev/learn"]]'),
('http', 'web', 2, 'globe', 'HTTP 与 REST API',
 '请求、响应、状态码、REST 接口设计。前后端打交道的共同语言。', '[]',
 '[["MDN HTTP", "https://developer.mozilla.org/zh-CN/docs/Web/HTTP"]]'),
('react', 'web', 2, 'si:react', 'React',
 '最流行的前端框架，用组件搭界面。', '["javascript", "html-css"]',
 '[["React 官方教程", "https://react.dev/learn"]]'),
('vue', 'web', 2, 'si:vuedotjs', 'Vue',
 '上手更快的前端框架，中文资料多。', '["javascript", "html-css"]',
 '[["Vue 官方文档", "https://cn.vuejs.org/guide/introduction.html"]]'),
('nodejs', 'web', 2, 'si:nodedotjs', 'Node.js',
 '用 JavaScript 写服务端和命令行工具。', '["javascript"]',
 '[["Node.js 官方学习", "https://nodejs.org/en/learn"]]'),
('fastapi', 'web', 3, 'si:fastapi', 'FastAPI',
 '用 Python 写接口的现代框架，AI 项目里很常见。', '["python", "http"]',
 '[["FastAPI 教程（中文）", "https://fastapi.tiangolo.com/zh/tutorial/"]]'),
('spring', 'web', 3, 'si:spring', 'Spring Boot',
 'Java 后端的标配框架，大多数 Java 岗位都要求。', '["java", "http"]',
 '[["Spring 官方指南", "https://spring.io/guides"]]'),
('frontend-eng', 'web', 3, 'si:vite', '前端工程化',
 '用 Vite 等工具打包、拆分代码、做类型检查和规范，撑起大型前端项目。', '["typescript"]',
 '[["Vite 官方文档", "https://cn.vite.dev/guide/"]]');

-- ═════════ 数据 ═════════
INSERT INTO skill_rows VALUES
('sql', 'data', 2, 'database', 'SQL',
 '查询、连接、分组、建表。几乎每个方向都会用到。', '[]',
 '[["SQLBolt 交互练习", "https://sqlbolt.com/"]]'),
('pandas', 'data', 2, 'si:pandas', 'pandas 数据分析',
 '在 Python 里清洗、整理和统计表格数据。', '["python"]',
 '[["10 分钟入门 pandas", "https://pandas.pydata.org/docs/user_guide/10min.html"], ["Kaggle Learn", "https://www.kaggle.com/learn"]]'),
('postgres', 'data', 3, 'si:postgresql', 'PostgreSQL',
 '会建表、加索引、写事务、看执行计划，把数据库用得又快又稳。', '["sql"]',
 '[["PostgreSQL 官方教程", "https://www.postgresql.org/docs/current/tutorial.html"], ["CMU 15-445", "https://15445.courses.cs.cmu.edu/"]]'),
('redis', 'data', 3, 'si:redis', 'Redis',
 '内存缓存和键值存储，扛住高并发读写。', '["sql"]',
 '[["Redis 官方文档", "https://redis.io/docs/latest/"]]'),
('distributed', 'data', 4, 'share-2', '分布式系统',
 '复制、分片、一致性、共识：让很多台机器像一台一样可靠地工作。', '["postgres", "concurrency"]',
 '[["MIT 6.5840", "https://pdos.csail.mit.edu/6.824/"], ["DDIA", "https://dataintensive.net/"]]'),
('kafka', 'data', 5, 'si:apachekafka', 'Kafka',
 '高吞吐的消息队列和流处理平台。', '["distributed"]',
 '[["Kafka 官方文档", "https://kafka.apache.org/documentation/"]]'),
('spark', 'data', 5, 'si:apachespark', 'Spark',
 '用一群机器一起处理海量数据。', '["distributed"]',
 '[["Spark 快速入门", "https://spark.apache.org/docs/latest/quick-start.html"]]');

-- ═════════ 系统 ═════════
INSERT INTO skill_rows VALUES
('linux-sys', 'systems', 3, 'cpu', 'Linux 系统编程',
 '进程、内存、文件、系统调用：在操作系统这一层写程序。', '["c", "linux"]',
 '[["OSTEP 操作系统导论", "https://pages.cs.wisc.edu/~remzi/OSTEP/"], ["MIT 6.1810", "https://pdos.csail.mit.edu/6.1810/"]]'),
('embedded', 'systems', 3, 'circuit-board', '嵌入式开发',
 '给单片机写程序，读传感器、控制电机，跑实时系统。', '["c"]',
 '[["Zephyr 入门", "https://docs.zephyrproject.org/latest/develop/getting_started/index.html"], ["Arduino 文档", "https://docs.arduino.cc/learn/"]]'),
('net-prog', 'systems', 4, 'plug', '网络编程',
 '用 Socket 直接收发 TCP/UDP 数据，写高并发的网络服务。', '["linux-sys", "http"]',
 '[["Beej 网络编程指南", "https://beej.us/guide/bgnet/"], ["Stanford CS144", "https://cs144.github.io/"]]'),
('concurrency', 'systems', 4, 'git-fork', '并发编程',
 '多线程、锁、无锁结构，让程序同时做很多事还不出错。', '["linux-sys"]',
 '[["信号量小书", "https://greenteapress.com/wp/semaphores/"]]'),
('perf', 'systems', 4, 'gauge', '性能调优',
 '用 perf、火焰图找出程序慢在哪，再把它改快。', '["linux-sys"]',
 '[["Brendan Gregg 性能分析", "https://www.brendangregg.com/linuxperf.html"], ["MIT 6.172", "https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/"]]'),
('fpga', 'systems', 4, 'microchip', 'Verilog 与 FPGA',
 '用硬件描述语言设计电路，烧到 FPGA 上跑起来。', '["embedded"]',
 '[["HDLBits 在线练习", "https://hdlbits.01xz.net/"], ["一生一芯", "https://ysyx.org/"]]'),
('cuda', 'systems', 5, 'si:nvidia', 'CUDA',
 '写跑在 GPU 上的程序，把计算加速几十倍。', '["cpp", "concurrency"]',
 '[["CUDA 编程指南", "https://docs.nvidia.com/cuda/cuda-c-programming-guide/"]]'),
('compiler', 'systems', 5, 'file-cog', '编译器开发',
 '词法、语法、类型检查、代码生成：自己写一门语言，或者给 LLVM 写优化。', '["cpp", "dsa"]',
 '[["Crafting Interpreters", "https://craftinginterpreters.com/"], ["LLVM 教程", "https://llvm.org/docs/tutorial/"]]');

-- ═════════ 云与运维 ═════════
INSERT INTO skill_rows VALUES
('nginx', 'cloud', 3, 'si:nginx', 'Nginx',
 '反向代理、负载均衡、HTTPS 配置。', '["linux", "http"]',
 '[["Nginx 入门", "https://nginx.org/en/docs/beginners_guide.html"]]'),
('kubernetes', 'cloud', 4, 'si:kubernetes', 'Kubernetes',
 '在一群机器上编排容器：部署、扩容、自动恢复。', '["docker"]',
 '[["Kubernetes 教程（中文）", "https://kubernetes.io/zh-cn/docs/tutorials/"]]'),
('cloud-platform', 'cloud', 4, 'cloud', '云平台',
 '在 AWS、阿里云这类平台上用好计算、存储、网络服务。', '["docker"]',
 '[["AWS 入门", "https://aws.amazon.com/getting-started/"]]'),
('monitoring', 'cloud', 4, 'activity', '监控与告警',
 '用 Prometheus、Grafana 盯住线上服务，出问题第一时间知道。', '["linux", "http"]',
 '[["Prometheus 文档", "https://prometheus.io/docs/introduction/overview/"], ["OpenTelemetry", "https://opentelemetry.io/docs/"]]'),
('terraform', 'cloud', 5, 'si:terraform', 'Terraform',
 '用代码管理云上的资源，一条命令建好整套环境。', '["cloud-platform"]',
 '[["Terraform 教程", "https://developer.hashicorp.com/terraform/tutorials"]]'),
('microservices', 'cloud', 5, 'blocks', '微服务架构',
 '把大系统拆成独立部署的小服务，并处理好它们之间的调用、容错和数据一致。', '["kubernetes", "distributed"]',
 '[["microservices.io", "https://microservices.io/"]]');

-- ═════════ 安全 ═════════
INSERT INTO skill_rows VALUES
('crypto', 'security', 3, 'key-round', '密码学应用',
 '正确地使用加密、签名、哈希和证书，不自己造轮子。', '["python"]',
 '[["Crypto 101", "https://www.crypto101.io/"], ["Stanford Cryptography I", "https://www.coursera.org/learn/crypto"]]'),
('web-security', 'security', 3, 'shield-check', 'Web 安全',
 'SQL 注入、XSS、CSRF、越权：会找也会防。', '["http", "sql"]',
 '[["PortSwigger Web 安全学院", "https://portswigger.net/web-security"], ["OWASP Top 10", "https://owasp.org/www-project-top-ten/"]]'),
('pentest', 'security', 4, 'swords', '渗透测试',
 '按流程对系统做授权攻击，找出能被利用的弱点并写报告。', '["web-security", "shell"]',
 '[["Hack The Box Academy", "https://academy.hackthebox.com/"]]'),
('reverse', 'security', 4, 'scan-search', '逆向分析',
 '没有源码时用 Ghidra、IDA 读懂程序在做什么。', '["linux-sys"]',
 '[["Reverse Engineering for Beginners", "https://beginners.re/"], ["Ghidra", "https://ghidra-sre.org/"]]'),
('pwn', 'security', 5, 'skull', '二进制漏洞利用',
 '栈溢出、堆利用、ROP：把内存漏洞变成控制程序的能力。', '["reverse"]',
 '[["pwn.college", "https://pwn.college/"], ["CTF Wiki", "https://ctf-wiki.org/"]]');

-- ═════════ AI ═════════
INSERT INTO skill_rows VALUES
('ml', 'ai', 3, 'brain', '机器学习',
 '回归、分类、聚类、模型评估，会用 scikit-learn 解决实际问题。', '["pandas"]',
 '[["吴恩达 机器学习", "https://www.coursera.org/specializations/machine-learning-introduction"], ["scikit-learn 教程", "https://scikit-learn.org/stable/tutorial/index.html"]]'),
('llm-app', 'ai', 3, 'bot', '大模型应用开发',
 '调用大模型 API，写好提示词，让模型稳定输出结构化结果。', '["python", "http"]',
 '[["Claude 开发文档", "https://docs.anthropic.com/"], ["提示工程交互教程", "https://github.com/anthropics/prompt-eng-interactive-tutorial"]]'),
('pytorch', 'ai', 4, 'si:pytorch', 'PyTorch',
 '搭建、训练和调试神经网络。深度学习的事实标准。', '["ml"]',
 '[["PyTorch 官方教程", "https://pytorch.org/tutorials/"], ["动手学深度学习", "https://zh.d2l.ai/"]]'),
('rag', 'ai', 4, 'library', 'RAG',
 '把自己的资料切块、向量化、检索出来，再交给模型回答。', '["llm-app"]',
 '[["LangChain RAG 教程", "https://python.langchain.com/docs/tutorials/rag/"]]'),
('agent', 'ai', 4, 'bot-message-square', 'Agent 开发',
 '让模型调用工具、多步执行，完成一件完整的事。会写 MCP 服务器。', '["llm-app"]',
 '[["Hugging Face Agents 课程", "https://huggingface.co/learn/agents-course"], ["Model Context Protocol", "https://modelcontextprotocol.io/"]]'),
('finetune', 'ai', 5, 'sliders-horizontal', '模型微调',
 '用 LoRA 等方法让开源大模型更擅长你的任务。', '["pytorch"]',
 '[["Hugging Face PEFT", "https://huggingface.co/docs/peft/"]]'),
('cv', 'ai', 5, 'eye', '计算机视觉',
 '图像分类、检测、分割，训练并部署视觉模型。', '["pytorch"]',
 '[["Stanford CS231n", "https://cs231n.stanford.edu/"]]');

-- ═════════ 客户端与游戏 ═════════
INSERT INTO skill_rows VALUES
('android', 'client', 3, 'si:android', 'Android',
 '用 Kotlin 写安卓 App，从界面到上架。', '["java"]',
 '[["Android 开发者课程", "https://developer.android.com/courses"]]'),
('ios', 'client', 3, 'si:swift', 'iOS',
 '用 Swift 和 SwiftUI 写 iPhone App。', '["oop"]',
 '[["Apple SwiftUI 教程", "https://developer.apple.com/tutorials/swiftui"]]'),
('flutter', 'client', 3, 'si:flutter', 'Flutter',
 '一套代码同时做出安卓、iOS、桌面和网页应用。', '["oop"]',
 '[["Flutter 文档", "https://docs.flutter.dev/"]]'),
('game-dev', 'client', 3, 'gamepad-2', '游戏开发',
 '用 Godot 或 Unity 做出能玩的游戏：场景、物理、动画、关卡。', '["oop"]',
 '[["Godot 文档（中文）", "https://docs.godotengine.org/zh-cn/4.x/"]]'),
('graphics', 'client', 4, 'triangle', '图形渲染',
 '用 OpenGL / Vulkan 写着色器，理解光栅化和光照。', '["cpp"]',
 '[["GAMES101", "https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html"], ["LearnOpenGL（中文）", "https://learnopengl-cn.github.io/"]]');
