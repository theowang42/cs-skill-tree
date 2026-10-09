// 点击每一项时右侧显示的介绍和链接。
// 应用层链接到代表开源项目；工具链接到官网和官方文档；能力块链接到经典公开课。

export interface Link {
  label: string
  url: string
}

export interface Detail {
  /** 一句话介绍 */
  intro: string
  /** 包含什么 */
  includes: string[]
  links: Link[]
}

export const CATEGORY_DETAILS: Record<string, Detail> = {
  hardware: {
    intro: '设计芯片和电路，或者写直接控制硬件的程序。',
    includes: ['处理器与芯片设计（RISC-V、FPGA）', '嵌入式与物联网（单片机、RTOS）', '机器人与自动驾驶'],
    links: [
      { label: '香山处理器 XiangShan', url: 'https://github.com/OpenXiangShan/XiangShan' },
      { label: 'Zephyr 实时操作系统', url: 'https://github.com/zephyrproject-rtos/zephyr' },
      { label: 'ROS 2 机器人系统', url: 'https://github.com/ros2/ros2' },
    ],
  },
  systems: {
    intro: '构建所有软件运行的底座：操作系统、编译器、数据库。',
    includes: ['操作系统内核与虚拟化', 'Linux 发行版与桌面', '编译器与编程语言', '数据库与存储'],
    links: [
      { label: 'Linux 内核', url: 'https://github.com/torvalds/linux' },
      { label: 'LLVM 编译器', url: 'https://github.com/llvm/llvm-project' },
      { label: 'PostgreSQL 数据库', url: 'https://github.com/postgres/postgres' },
    ],
  },
  infra: {
    intro: '让线上服务稳定运行，并从海量数据里产生价值。',
    includes: ['云原生与容器编排', '运维、SRE 与可观测性', '大数据与流处理', '数据分析与科学计算'],
    links: [
      { label: 'Kubernetes', url: 'https://github.com/kubernetes/kubernetes' },
      { label: 'Prometheus 监控', url: 'https://github.com/prometheus/prometheus' },
      { label: 'Apache Spark', url: 'https://github.com/apache/spark' },
    ],
  },
  ai: {
    intro: '训练、优化和使用智能模型，包括大模型和 Agent。',
    includes: ['AI 系统：训练框架与推理优化', 'AI 算法：大模型、视觉、语音', 'AI 应用：Agent、RAG、MCP'],
    links: [
      { label: 'PyTorch', url: 'https://github.com/pytorch/pytorch' },
      { label: 'vLLM 推理引擎', url: 'https://github.com/vllm-project/vllm' },
      { label: 'OpenHands 编程 Agent', url: 'https://github.com/OpenHands/OpenHands' },
    ],
  },
  apps: {
    intro: '做出用户和开发者每天在用的软件。',
    includes: ['Web 前端', '后端开发', '客户端（桌面、iOS、Android）', '图形、游戏与多媒体', '开发者工具与测试'],
    links: [
      { label: 'React', url: 'https://github.com/facebook/react' },
      { label: 'Django', url: 'https://github.com/django/django' },
      { label: 'Godot 游戏引擎', url: 'https://github.com/godotengine/godot' },
    ],
  },
  security: {
    intro: '找出系统的弱点，并把它们补上。',
    includes: ['漏洞研究与利用', '逆向工程', '模糊测试', '密码学工程'],
    links: [
      { label: 'OSS-Fuzz 模糊测试', url: 'https://github.com/google/oss-fuzz' },
      { label: 'Ghidra 逆向工具', url: 'https://github.com/NationalSecurityAgency/ghidra' },
      { label: 'pwn.college 攻防练习', url: 'https://pwn.college/' },
    ],
  },
  other: {
    intro: '小众或交叉领域，以后可以单独展开。',
    includes: ['区块链', '量子计算', '形式化验证', '生物信息学', '地理信息系统'],
    links: [
      { label: 'go-ethereum 以太坊客户端', url: 'https://github.com/ethereum/go-ethereum' },
      { label: 'Qiskit 量子计算', url: 'https://github.com/Qiskit/qiskit' },
      { label: 'Lean 定理证明器', url: 'https://github.com/leanprover/lean4' },
    ],
  },
}

export const BLOCK_DETAILS: Record<string, Detail> = {
  // 进阶层
  theory: {
    intro: '研究计算的边界：什么问题能算，什么问题算得快。',
    includes: ['有限自动机与正则语言', '上下文无关文法', '图灵机与可计算性', '复杂度类 P、NP 与 NP 完全'],
    links: [{ label: 'MIT 18.404J 计算理论', url: 'https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/' }],
  },
  ml: {
    intro: '让程序从数据中学习规律，是所有 AI 方向的基础。',
    includes: ['监督学习与模型评估', '神经网络与反向传播', '卷积网络', 'Transformer 与大模型'],
    links: [
      { label: 'Stanford CS229 机器学习', url: 'https://cs229.stanford.edu/' },
      { label: 'Stanford CS231n 深度学习与视觉', url: 'https://cs231n.stanford.edu/' },
      { label: 'Karpathy：Neural Networks Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html' },
    ],
  },
  graphics: {
    intro: '用计算机生成图像：从三角形到逼真的光影。',
    includes: ['变换与投影', '光栅化与深度测试', '着色与纹理', '光线追踪'],
    links: [{ label: 'GAMES101 现代计算机图形学入门', url: 'https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html' }],
  },
  architecture: {
    intro: '处理器内部如何把指令执行得又快又对。',
    includes: ['流水线与冒险', '分支预测与乱序执行', '缓存与一致性协议', '多核与内存模型'],
    links: [
      { label: '一生一芯', url: 'https://ysyx.org/' },
    ],
  },
  hpc: {
    intro: '把程序的性能压榨到硬件的极限。',
    includes: ['多线程与同步', 'SIMD 向量化', 'GPU 与 CUDA 编程', '性能分析与调优'],
    links: [
      { label: 'CMU 15-418 并行计算', url: 'https://www.cs.cmu.edu/~418/' },
      { label: 'MIT 6.172 软件性能工程', url: 'https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/' },
    ],
  },
  security: {
    intro: '理解系统为什么会被攻破，以及怎么防御。',
    includes: ['内存安全漏洞（栈溢出等）', 'Web 安全（注入、XSS）', '密码学基础', '网络攻防'],
    links: [
      { label: 'Berkeley CS161 计算机安全（课程教材）', url: 'https://textbook.cs161.org/' },
      { label: 'MIT 6.5660 计算机系统安全', url: 'https://ocw.mit.edu/courses/6-5660-computer-systems-security-spring-2024/' },
    ],
  },
  distributed: {
    intro: '让很多台机器像一台机器一样可靠地协作。',
    includes: ['复制与一致性', '容错与故障检测', 'Raft 共识算法', '分布式事务'],
    links: [{ label: 'MIT 6.5840（原 6.824）分布式系统', url: 'https://pdos.csail.mit.edu/6.824/' }],
  },

  // 核心层
  dsa: {
    intro: '组织数据、设计高效算法，是写好任何程序的基本功。',
    includes: ['数组、链表、栈与队列', '树、堆、哈希表与图', '排序与搜索', '贪心与动态规划', '复杂度分析'],
    links: [
      { label: 'MIT 6.006 算法导论', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/' },
      { label: 'Princeton 算法（Coursera）', url: 'https://www.coursera.org/learn/algorithms-part1' },
    ],
  },
  organization: {
    intro: '从逻辑门一路搭到 CPU，理解程序在硬件上如何运行。',
    includes: ['二进制与数字逻辑', '指令集与汇编', 'CPU 数据通路', '缓存与内存层次'],
    links: [
      { label: 'Nand2Tetris 从零造计算机', url: 'https://www.nand2tetris.org/' },
      { label: 'CMU 15-213（CSAPP）', url: 'https://www.cs.cmu.edu/~213/' },
      { label: 'Berkeley CS61C 计算机组成', url: 'https://cs61c.org/' },
    ],
  },
  os: {
    intro: '管理硬件资源，让多个程序安全高效地共同运行。',
    includes: ['进程与线程', 'CPU 调度', '虚拟内存', '文件系统', '并发与锁'],
    links: [
      { label: 'MIT 6.1810（原 6.S081）操作系统', url: 'https://pdos.csail.mit.edu/6.1810/' },
      { label: 'OSTEP 操作系统导论（免费教材）', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/' },
    ],
  },
  network: {
    intro: '数据如何从一台机器可靠地送到另一台。',
    includes: ['分层模型', 'TCP/IP 与可靠传输', 'HTTP、DNS 与 TLS', 'Socket 编程'],
    links: [
      { label: 'Stanford CS144 计算机网络', url: 'https://cs144.github.io/' },
      { label: '《计算机网络：自顶向下方法》配套资源', url: 'https://gaia.cs.umass.edu/kurose_ross/' },
    ],
  },
  database: {
    intro: '高效、可靠地存储和查询数据。',
    includes: ['关系模型与 SQL', 'B+ 树与索引', '查询执行与优化', '事务与并发控制', '故障恢复'],
    links: [
      { label: 'CMU 15-445 数据库系统', url: 'https://15445.courses.cs.cmu.edu/' },
      { label: 'Berkeley CS186 数据库系统', url: 'https://cs186berkeley.net/' },
    ],
  },
  compiler: {
    intro: '把人写的代码翻译成机器能执行的指令。',
    includes: ['词法分析与语法分析', '抽象语法树', '类型检查', '中间代码与代码生成'],
    links: [
      { label: 'Stanford CS143 编译原理', url: 'https://web.stanford.edu/class/cs143/' },
      { label: 'Crafting Interpreters（免费在线书）', url: 'https://craftinginterpreters.com/' },
    ],
  },
  swe: {
    intro: '多人长期协作，把软件写得可靠、可维护。',
    includes: ['阅读和理解大型代码库', '单元测试与集成测试', '模块化与接口设计', '代码评审与重构'],
    links: [{ label: 'MIT 6.031 软件构造', url: 'https://web.mit.edu/6.031/' }],
  },

  // 基础层
  math: {
    intro: 'CS 用到的数学：证明、计数、概率和矩阵。',
    includes: ['逻辑与证明', '集合、图论与组合计数', '概率论', '线性代数'],
    links: [
      { label: 'MIT 6.042J 计算机科学中的数学', url: 'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/' },
      { label: 'MIT 18.06 线性代数', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/' },
      { label: 'Harvard Stat 110 概率论', url: 'https://stat110.hsites.harvard.edu/' },
    ],
  },
  programming: {
    intro: '学会用代码表达想法，独立写出能运行的完整程序。',
    includes: ['变量、条件与循环', '函数与递归', '指针与内存管理', '调试自己的程序'],
    links: [
      { label: 'Harvard CS50 计算机科学导论', url: 'https://cs50.harvard.edu/x/' },
      { label: 'Berkeley CS61A 程序的结构与解释', url: 'https://cs61a.org/' },
    ],
  },
  tooling: {
    intro: '程序员每天都在用的工具，以及参与开源的基本流程。',
    includes: ['Shell 与命令行', 'Git 版本控制', '编辑器与调试器', '提 PR 与代码评审'],
    links: [
      { label: 'MIT Missing Semester 计算机教育中缺失的一课', url: 'https://missing.csail.mit.edu/' },
      { label: 'Pro Git（免费中文版）', url: 'https://git-scm.com/book/zh/v2' },
    ],
  },
}

export const TOOL_DETAILS: Record<string, Detail> = {
  // 编程语言
  c: {
    intro: '贴近硬件的经典语言，操作系统和嵌入式开发的基础。',
    includes: ['指针与手动内存管理', '结构体与数组', '编译、链接与预处理', '标准库'],
    links: [
      { label: 'C 语言参考（cppreference）', url: 'https://en.cppreference.com/w/c' },
      { label: 'C 标准委员会 WG14', url: 'https://www.open-std.org/jtc1/sc22/wg14/' },
    ],
  },
  cpp: {
    intro: '兼顾性能和抽象能力，用于游戏引擎、浏览器、数据库、AI 框架。',
    includes: ['类与面向对象', '模板与泛型编程', 'RAII 与智能指针', '标准模板库 STL'],
    links: [
      { label: 'isocpp.org', url: 'https://isocpp.org/' },
      { label: 'C++ 参考（cppreference）', url: 'https://en.cppreference.com/w/cpp' },
    ],
  },
  rust: {
    intro: '内存安全又不牺牲性能的系统语言，正在进入 Linux 内核。',
    includes: ['所有权与借用', '生命周期', 'trait 与泛型', 'Cargo 包管理'],
    links: [
      { label: 'Rust 官网', url: 'https://www.rust-lang.org/' },
      { label: 'The Rust Book', url: 'https://doc.rust-lang.org/book/' },
    ],
  },
  go: {
    intro: '语法简单、并发好写，云原生基础设施的主力语言。',
    includes: ['goroutine 与 channel', '接口', '标准库与网络编程', 'Go modules'],
    links: [
      { label: 'Go 官网', url: 'https://go.dev/' },
      { label: 'A Tour of Go', url: 'https://go.dev/tour/' },
    ],
  },
  java: {
    intro: '企业后端和安卓的老牌主力，生态极其庞大。',
    includes: ['面向对象', '集合框架', 'JVM 与垃圾回收', '并发编程'],
    links: [
      { label: 'dev.java', url: 'https://dev.java/' },
      { label: 'Java 官方文档', url: 'https://docs.oracle.com/en/java/' },
    ],
  },
  kotlin: {
    intro: '更现代的 JVM 语言，安卓开发的官方首选。',
    includes: ['空安全', '协程', '与 Java 互操作', '扩展函数'],
    links: [
      { label: 'Kotlin 官网', url: 'https://kotlinlang.org/' },
      { label: 'Kotlin 文档', url: 'https://kotlinlang.org/docs/home.html' },
    ],
  },
  swift: {
    intro: '苹果平台（iOS、macOS）的开发语言。',
    includes: ['可选类型', '协议与扩展', '值类型与引用类型', 'async/await 并发'],
    links: [
      { label: 'Swift 官网', url: 'https://www.swift.org/' },
      { label: 'The Swift Programming Language', url: 'https://docs.swift.org/swift-book/' },
    ],
  },
  csharp: {
    intro: '微软 .NET 平台的主力语言，也是 Unity 游戏开发的语言。',
    includes: ['面向对象', 'LINQ', 'async/await', '.NET 运行时'],
    links: [
      { label: 'C# 文档', url: 'https://learn.microsoft.com/dotnet/csharp/' },
      { label: '.NET 官网', url: 'https://dotnet.microsoft.com/' },
    ],
  },
  python: {
    intro: '语法简洁的通用语言，AI、数据分析和脚本的首选。',
    includes: ['基础语法与数据类型', '函数、类与模块', '包管理（pip）', '常用标准库'],
    links: [
      { label: 'Python 官网', url: 'https://www.python.org/' },
      { label: 'Python 官方教程（中文）', url: 'https://docs.python.org/zh-cn/3/tutorial/' },
    ],
  },
  javascript: {
    intro: '浏览器里唯一原生运行的语言，Web 开发的基础。',
    includes: ['基础语法与对象', '异步：Promise 与 async/await', 'DOM 操作', '模块化'],
    links: [
      { label: 'MDN JavaScript 文档', url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript' },
      { label: 'ECMAScript 规范', url: 'https://tc39.es/ecma262/' },
    ],
  },
  typescript: {
    intro: '给 JavaScript 加上类型，大型前端和 Node 项目的标配。',
    includes: ['类型标注与推断', '接口与泛型', '联合类型与类型收窄', '编译配置'],
    links: [
      { label: 'TypeScript 官网', url: 'https://www.typescriptlang.org/' },
      { label: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
    ],
  },
  sql: {
    intro: '查询和操作关系数据库的标准语言。',
    includes: ['查询：SELECT、JOIN、GROUP BY', '增删改', '建表与约束', '索引与事务'],
    links: [
      { label: 'PostgreSQL SQL 教程', url: 'https://www.postgresql.org/docs/current/tutorial-sql.html' },
      { label: 'SQLite 支持的 SQL', url: 'https://sqlite.org/lang.html' },
    ],
  },
  shell: {
    intro: '在命令行里把各种程序组合起来，自动化日常操作。',
    includes: ['常用命令', '管道与重定向', '变量与流程控制', '编写脚本'],
    links: [
      { label: 'GNU Bash', url: 'https://www.gnu.org/software/bash/' },
      { label: 'Bash 参考手册', url: 'https://www.gnu.org/software/bash/manual/' },
    ],
  },
  asm: {
    intro: 'CPU 指令的文字形式，读懂它才能看清程序在机器上做了什么。',
    includes: ['寄存器与指令', '调用约定与栈帧', 'x86-64、ARM、RISC-V', '读反汇编'],
    links: [
      { label: 'Intel 64 与 IA-32 架构手册', url: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html' },
      { label: 'Arm 开发者文档', url: 'https://developer.arm.com/documentation' },
    ],
  },
  verilog: {
    intro: '描述数字电路的硬件语言，用来设计芯片和 FPGA。',
    includes: ['模块与端口', '组合逻辑与时序逻辑', '状态机', '仿真与测试'],
    links: [
      { label: 'Verilator 开源仿真器', url: 'https://github.com/verilator/verilator' },
      { label: 'HDLBits 在线练习', url: 'https://hdlbits.01xz.net/' },
    ],
  },
  solidity: {
    intro: '编写以太坊智能合约的语言。',
    includes: ['合约与状态变量', '函数与修饰器', 'Gas 与成本', '常见安全问题'],
    links: [
      { label: 'Solidity 官网', url: 'https://soliditylang.org/' },
      { label: 'Solidity 文档', url: 'https://docs.soliditylang.org/' },
    ],
  },

  // 框架与库
  react: {
    intro: '最流行的前端 UI 框架，用组件搭建界面。',
    includes: ['组件与 JSX', 'props 与 state', 'Hooks', '渲染与性能'],
    links: [
      { label: 'React 官网', url: 'https://react.dev/' },
      { label: 'React 中文文档', url: 'https://zh-hans.react.dev/learn' },
    ],
  },
  vue: {
    intro: '上手快、中文社区活跃的前端框架。',
    includes: ['模板语法', '响应式数据', '组件', '组合式 API'],
    links: [
      { label: 'Vue 官网', url: 'https://vuejs.org/' },
      { label: 'Vue 中文文档', url: 'https://cn.vuejs.org/guide/introduction.html' },
    ],
  },
  spring: {
    intro: 'Java 后端开发的事实标准框架。',
    includes: ['依赖注入', 'Spring Boot', 'Web 与 REST API', '数据访问'],
    links: [
      { label: 'Spring 官网', url: 'https://spring.io/' },
      { label: 'Spring 入门指南', url: 'https://spring.io/guides' },
    ],
  },
  django: {
    intro: '功能齐全的 Python Web 框架，自带后台和 ORM。',
    includes: ['模型与 ORM', '视图与路由', '模板', '自带管理后台'],
    links: [
      { label: 'Django 官网', url: 'https://www.djangoproject.com/' },
      { label: 'Django 文档', url: 'https://docs.djangoproject.com/' },
    ],
  },
  fastapi: {
    intro: '现代、高性能的 Python API 框架。',
    includes: ['路由与请求参数', '类型校验（Pydantic）', '异步接口', '自动生成 API 文档'],
    links: [
      { label: 'FastAPI 官网', url: 'https://fastapi.tiangolo.com/' },
      { label: 'FastAPI 教程', url: 'https://fastapi.tiangolo.com/tutorial/' },
    ],
  },
  flutter: {
    intro: '一套代码同时做 iOS、安卓、桌面和 Web 应用。',
    includes: ['Dart 语言', 'Widget 与布局', '状态管理', '调用原生能力'],
    links: [
      { label: 'Flutter 官网', url: 'https://flutter.dev/' },
      { label: 'Flutter 文档', url: 'https://docs.flutter.dev/' },
    ],
  },
  qt: {
    intro: '老牌跨平台 C++ 界面框架，常用于桌面和嵌入式。',
    includes: ['信号与槽', 'Widgets', 'QML', '跨平台构建'],
    links: [
      { label: 'Qt 官网', url: 'https://www.qt.io/' },
      { label: 'Qt 文档', url: 'https://doc.qt.io/' },
    ],
  },
  godot: {
    intro: '完全开源的游戏引擎，支持 2D 和 3D。',
    includes: ['场景与节点', 'GDScript', '物理与动画', '导出到各平台'],
    links: [
      { label: 'Godot 官网', url: 'https://godotengine.org/' },
      { label: 'Godot 文档', url: 'https://docs.godotengine.org/' },
    ],
  },
  numpy: {
    intro: 'Python 数值计算的基础库，几乎所有数据和 AI 库都依赖它。',
    includes: ['多维数组', '广播', '向量化运算', '线性代数'],
    links: [
      { label: 'NumPy 官网', url: 'https://numpy.org/' },
      { label: 'NumPy 文档', url: 'https://numpy.org/doc/stable/' },
    ],
  },
  pandas: {
    intro: '处理表格数据的 Python 库，数据分析必备。',
    includes: ['DataFrame', '读写 CSV 和 Excel', '筛选、分组与聚合', '数据清洗'],
    links: [
      { label: 'pandas 官网', url: 'https://pandas.pydata.org/' },
      { label: 'pandas 文档', url: 'https://pandas.pydata.org/docs/' },
    ],
  },
  pytorch: {
    intro: '最主流的深度学习框架，研究和工业界都在用。',
    includes: ['张量运算', '自动求导', '搭建和训练模型', 'GPU 加速'],
    links: [
      { label: 'PyTorch 官网', url: 'https://pytorch.org/' },
      { label: 'PyTorch 教程', url: 'https://docs.pytorch.org/tutorials/' },
    ],
  },
  transformers: {
    intro: 'Hugging Face 出品，调用和微调各种预训练大模型。',
    includes: ['加载预训练模型', '分词器', '推理管线', '微调训练'],
    links: [
      { label: 'Transformers 文档', url: 'https://huggingface.co/docs/transformers' },
      { label: 'Hugging Face 官网', url: 'https://huggingface.co/' },
    ],
  },
  langchain: {
    intro: '把大模型、工具和数据串起来，搭建 Agent 和 RAG 应用。',
    includes: ['调用大模型', '提示词模板', '工具调用与 Agent', '检索增强（RAG）'],
    links: [
      { label: 'LangChain 官网', url: 'https://www.langchain.com/' },
      { label: 'LangChain 文档', url: 'https://docs.langchain.com/' },
    ],
  },
  spark: {
    intro: '分布式大数据计算引擎，处理放不进一台机器的数据。',
    includes: ['RDD 与 DataFrame', 'Spark SQL', '流处理', '集群部署'],
    links: [
      { label: 'Apache Spark 官网', url: 'https://spark.apache.org/' },
      { label: 'Spark 文档', url: 'https://spark.apache.org/docs/latest/' },
    ],
  },

  // 平台与工具
  nodejs: {
    intro: '让 JavaScript 在服务器上运行的环境，前端工具链也基于它。',
    includes: ['事件循环与异步 I/O', '模块系统', 'npm 包管理', '写 HTTP 服务'],
    links: [
      { label: 'Node.js 官网', url: 'https://nodejs.org/' },
      { label: 'Node.js 入门', url: 'https://nodejs.org/en/learn' },
    ],
  },
  docker: {
    intro: '把应用和依赖打包成容器，在哪都能一样地运行。',
    includes: ['镜像与容器', 'Dockerfile', '数据卷与网络', 'Docker Compose'],
    links: [
      { label: 'Docker 官网', url: 'https://www.docker.com/' },
      { label: 'Docker 文档', url: 'https://docs.docker.com/' },
    ],
  },
  k8s: {
    intro: '在一群机器上自动部署、扩缩容和管理容器。',
    includes: ['Pod 与 Deployment', 'Service 与网络', '配置与存储', '自动扩缩容'],
    links: [
      { label: 'Kubernetes 官网', url: 'https://kubernetes.io/' },
      { label: 'Kubernetes 中文文档', url: 'https://kubernetes.io/zh-cn/docs/home/' },
    ],
  },
  nginx: {
    intro: '高性能 Web 服务器和反向代理。',
    includes: ['静态文件服务', '反向代理', '负载均衡', 'HTTPS 配置'],
    links: [
      { label: 'nginx 官网', url: 'https://nginx.org/' },
      { label: 'nginx 文档', url: 'https://nginx.org/en/docs/' },
    ],
  },
  postgres: {
    intro: '功能最强的开源关系数据库。',
    includes: ['SQL 与数据类型', '索引', '事务与 MVCC', '备份与复制'],
    links: [
      { label: 'PostgreSQL 官网', url: 'https://www.postgresql.org/' },
      { label: 'PostgreSQL 文档', url: 'https://www.postgresql.org/docs/' },
    ],
  },
  redis: {
    intro: '内存键值数据库，常用作缓存和消息队列。',
    includes: ['常用数据结构', '缓存策略', '持久化', '主从与集群'],
    links: [
      { label: 'Redis 官网', url: 'https://redis.io/' },
      { label: 'Redis 文档', url: 'https://redis.io/docs/latest/' },
    ],
  },
  kafka: {
    intro: '分布式消息流平台，用来在系统之间传递海量事件。',
    includes: ['主题与分区', '生产者与消费者', '消费组', '数据持久化与复制'],
    links: [
      { label: 'Apache Kafka 官网', url: 'https://kafka.apache.org/' },
      { label: 'Kafka 文档', url: 'https://kafka.apache.org/documentation/' },
    ],
  },
  prometheus: {
    intro: '采集和查询监控指标，云原生监控的标准。',
    includes: ['指标与标签', 'PromQL 查询', '告警规则', '与 Grafana 配合'],
    links: [
      { label: 'Prometheus 官网', url: 'https://prometheus.io/' },
      { label: 'Prometheus 文档', url: 'https://prometheus.io/docs/introduction/overview/' },
    ],
  },
  terraform: {
    intro: '用代码描述和创建云上的服务器、网络等基础设施。',
    includes: ['HCL 配置语言', 'Provider 与资源', '状态管理', '模块复用'],
    links: [
      { label: 'Terraform 官网', url: 'https://developer.hashicorp.com/terraform' },
      { label: 'Terraform 教程', url: 'https://developer.hashicorp.com/terraform/tutorials' },
    ],
  },
  cuda: {
    intro: 'NVIDIA 的 GPU 编程平台，AI 训练和推理的底层。',
    includes: ['线程、块与网格', 'GPU 内存层次', '核函数编写', '性能优化'],
    links: [
      { label: 'CUDA Toolkit', url: 'https://developer.nvidia.com/cuda-toolkit' },
      { label: 'CUDA 编程指南', url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
    ],
  },
  llvm: {
    intro: '模块化的编译器基础设施，Clang、Rust、Swift 都基于它。',
    includes: ['LLVM IR', '优化 Pass', '代码生成后端', 'Clang 前端'],
    links: [
      { label: 'LLVM 官网', url: 'https://llvm.org/' },
      { label: 'Kaleidoscope 教程：用 LLVM 写语言', url: 'https://llvm.org/docs/tutorial/' },
    ],
  },
  vivado: {
    intro: 'AMD（原 Xilinx）的 FPGA 设计工具。',
    includes: ['综合与实现', '时序约束与分析', '仿真', '下载到 FPGA 板'],
    links: [
      { label: 'Vivado 官网', url: 'https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado.html' },
      { label: 'AMD 技术文档', url: 'https://docs.amd.com/' },
    ],
  },
  ros: {
    intro: '机器人软件框架，提供通信、驱动和算法工具。',
    includes: ['节点与话题', '服务与动作', 'launch 启动配置', '仿真（Gazebo）'],
    links: [
      { label: 'ROS 官网', url: 'https://www.ros.org/' },
      { label: 'ROS 2 文档', url: 'https://docs.ros.org/' },
    ],
  },
  wireshark: {
    intro: '抓包和分析网络流量的工具。',
    includes: ['抓包与过滤', '协议解析', '追踪 TCP 流', '排查网络问题'],
    links: [
      { label: 'Wireshark 官网', url: 'https://www.wireshark.org/' },
      { label: 'Wireshark 文档', url: 'https://www.wireshark.org/docs/' },
    ],
  },
  ghidra: {
    intro: '美国国家安全局开源的逆向工程工具。',
    includes: ['反汇编', '反编译成 C 伪代码', '函数与数据分析', '脚本扩展'],
    links: [
      { label: 'Ghidra 官网', url: 'https://ghidra-sre.org/' },
      { label: 'Ghidra GitHub', url: 'https://github.com/NationalSecurityAgency/ghidra' },
    ],
  },
}
