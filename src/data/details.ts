// 点击每一项时右侧显示的介绍和链接。
// 应用层链接到代表开源项目；工具链接到官网和官方文档；
// 能力块链接到公开课，主要参考 CS 自学指南（csdiy.wiki）的推荐。

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

// 大方向只需要一句介绍，具体内容在细分方向里
export const CATEGORY_INTROS: Record<string, string> = {
  hardware: '离硬件最近的方向：设计 CPU 芯片，或者给单片机、机器人、无人机写程序，让代码在真实世界里动起来。',
  systems: '写“软件底下的软件”：操作系统、编译器、数据库。难度高，但学会了你会真正明白电脑是怎么工作的。',
  infra: '让网站和 App 能 24 小时稳定运行，并且能处理海量数据。用户看不到你，但没有你，什么都跑不起来。',
  ai: '让电脑学会“看、听、说、写”。你可以去训练模型、让模型跑得更快，或者用大模型做出能帮人干活的 Agent。这是现在最热门的方向。',
  apps: '做大家每天都在用的软件：网站、手机 App、桌面软件和游戏。上手最快、岗位最多，适合想尽快做出东西的人。',
  security: '站在攻击者的角度找漏洞，再把它们补上。需要对系统底层非常熟悉，像侦探一样工作。',
  other: '一些小众或交叉的方向，比如区块链、量子计算、用数学证明程序没有 bug。感兴趣可以了解一下。',
}

// 细分方向：介绍、包含什么、代表开源项目
export const SUB_DETAILS: Record<string, Detail> = {
  'agent': {
    intro: '用大模型做出能帮人干活的应用：会查资料、会调用工具、能连续完成多个步骤。门槛最低、最热门的 AI 方向，不需要会训练模型。',
    includes: ['调用大模型 API 与写提示词', 'RAG：让模型读你自己的资料', '工具调用与 MCP', '把应用部署上线'],
    links: [
      { label: 'MCP 官方服务器集合', url: 'https://github.com/modelcontextprotocol/servers' },
      { label: 'LangGraph Agent 框架', url: 'https://github.com/langchain-ai/langgraph' },
      { label: 'OpenHands 编程 Agent', url: 'https://github.com/OpenHands/OpenHands' },
    ],
  },
  'ai-algo': {
    intro: '研究和改进模型本身：让模型更聪明、更准。需要扎实的数学和机器学习基础，偏研究。',
    includes: ['大语言模型', '图像与语音模型', '训练与微调', '读论文、复现实验'],
    links: [
      { label: 'Hugging Face Transformers', url: 'https://github.com/huggingface/transformers' },
      { label: 'Diffusers 图像生成', url: 'https://github.com/huggingface/diffusers' },
      { label: 'nanoGPT 从零训练 GPT', url: 'https://github.com/karpathy/nanoGPT' },
    ],
  },
  'ai-sys': {
    intro: '让模型训练得更快、推理更省：和显卡、内存、并行计算打交道，是 AI 里最“硬核”的工程方向。',
    includes: ['训练框架', '推理加速与部署', 'GPU / CUDA 编程', '分布式训练'],
    links: [
      { label: 'PyTorch', url: 'https://github.com/pytorch/pytorch' },
      { label: 'vLLM 推理引擎', url: 'https://github.com/vllm-project/vllm' },
      { label: 'llama.cpp 本地推理', url: 'https://github.com/ggml-org/llama.cpp' },
    ],
  },
  'backend': {
    intro: '网站和 App 背后的“大脑”：处理用户请求、读写数据库、保证服务稳定。岗位最多的方向之一。',
    includes: ['设计和实现 API', '数据库与缓存', '用户、权限与安全', '部署与监控'],
    links: [
      { label: 'Spring Boot', url: 'https://github.com/spring-projects/spring-boot' },
      { label: 'Django', url: 'https://github.com/django/django' },
      { label: 'FastAPI', url: 'https://github.com/fastapi/fastapi' },
    ],
  },
  'frontend': {
    intro: '用户直接看到、点到的那部分网页。做出好看、好用、反应快的界面。',
    includes: ['HTML、CSS 与页面布局', 'JavaScript 交互', 'React / Vue 框架', '打包构建与性能优化'],
    links: [
      { label: 'React', url: 'https://github.com/facebook/react' },
      { label: 'Vue', url: 'https://github.com/vuejs/core' },
      { label: 'Vite 构建工具', url: 'https://github.com/vitejs/vite' },
    ],
  },
  'client': {
    intro: '开发装在手机和电脑上的 App：iPhone、安卓、Windows、Mac 软件。',
    includes: ['iOS 与安卓开发', '桌面软件', '跨平台框架', '发布到应用商店'],
    links: [
      { label: 'Flutter', url: 'https://github.com/flutter/flutter' },
      { label: 'Tauri', url: 'https://github.com/tauri-apps/tauri' },
      { label: 'Electron', url: 'https://github.com/electron/electron' },
    ],
  },
  'game': {
    intro: '做游戏，或者做游戏引擎、渲染器、音视频处理这类和画面声音打交道的软件。',
    includes: ['游戏玩法与引擎使用', '实时渲染', '物理与动画', '音视频编解码'],
    links: [
      { label: 'Godot 游戏引擎', url: 'https://github.com/godotengine/godot' },
      { label: 'Bevy 游戏引擎', url: 'https://github.com/bevyengine/bevy' },
      { label: 'FFmpeg 音视频', url: 'https://github.com/FFmpeg/FFmpeg' },
    ],
  },
  'devtools': {
    intro: '给程序员做工具：编辑器、插件、构建工具、测试框架。你天天在用，最清楚哪里不好用，是参与开源最容易的入口。',
    includes: ['编辑器与插件', '构建工具', '测试框架', '命令行工具'],
    links: [
      { label: 'VS Code', url: 'https://github.com/microsoft/vscode' },
      { label: 'Neovim', url: 'https://github.com/neovim/neovim' },
      { label: 'Playwright 测试框架', url: 'https://github.com/microsoft/playwright' },
    ],
  },
  'cloud': {
    intro: '让服务 24 小时稳定运行：用容器部署、自动扩容、出问题能第一时间发现。也就是常说的运维、SRE、DevOps。',
    includes: ['Docker 与 Kubernetes', '监控、日志与告警', '自动化部署（CI/CD）', '用代码管理云资源'],
    links: [
      { label: 'Kubernetes', url: 'https://github.com/kubernetes/kubernetes' },
      { label: 'Prometheus 监控', url: 'https://github.com/prometheus/prometheus' },
      { label: 'Envoy 代理', url: 'https://github.com/envoyproxy/envoy' },
    ],
  },
  'datasci': {
    intro: '从数据里找答案：清洗数据、做统计、画图表，帮业务做决定。上手快，数学和 Python 是关键。',
    includes: ['数据清洗与整理', '统计分析', '数据可视化', 'SQL 查询'],
    links: [
      { label: 'pandas', url: 'https://github.com/pandas-dev/pandas' },
      { label: 'NumPy', url: 'https://github.com/numpy/numpy' },
      { label: 'Polars', url: 'https://github.com/pola-rs/polars' },
    ],
  },
  'bigdata': {
    intro: '一台电脑处理不了的海量数据，要用一群电脑一起处理。负责搭建数据流水线和数据仓库。',
    includes: ['批处理（Spark）', '实时流处理（Kafka、Flink）', '数据仓库', '数据流水线'],
    links: [
      { label: 'Apache Spark', url: 'https://github.com/apache/spark' },
      { label: 'Apache Kafka', url: 'https://github.com/apache/kafka' },
      { label: 'Apache Flink', url: 'https://github.com/apache/flink' },
    ],
  },
  'kernel': {
    intro: '写操作系统最底层的代码：调度、内存管理、驱动、虚拟机。难，但能真正看清电脑是怎么运转的。',
    includes: ['内核与驱动', '虚拟化与虚拟机', '容器底层原理', 'eBPF'],
    links: [
      { label: 'Linux 内核', url: 'https://github.com/torvalds/linux' },
      { label: 'QEMU 虚拟机', url: 'https://github.com/qemu/qemu' },
      { label: 'Firecracker 微虚拟机', url: 'https://github.com/firecracker-microvm/firecracker' },
    ],
  },
  'db-dev': {
    intro: '自己动手造数据库：怎么把数据存到硬盘上、怎么查得快、怎么在多台机器之间保持一致。',
    includes: ['存储引擎', '查询优化与执行', '事务与并发', '分布式数据库'],
    links: [
      { label: 'PostgreSQL', url: 'https://github.com/postgres/postgres' },
      { label: 'DuckDB', url: 'https://github.com/duckdb/duckdb' },
      { label: 'TiKV 分布式存储', url: 'https://github.com/tikv/tikv' },
    ],
  },
  'compiler-dev': {
    intro: '做编程语言本身：编译器、解释器、运行时。你写的每一行代码都要经过它们。',
    includes: ['编译器前端与后端', '代码优化', '语言运行时与垃圾回收', 'WebAssembly'],
    links: [
      { label: 'LLVM', url: 'https://github.com/llvm/llvm-project' },
      { label: 'Rust 编译器', url: 'https://github.com/rust-lang/rust' },
      { label: 'CPython', url: 'https://github.com/python/cpython' },
    ],
  },
  'distro': {
    intro: '把各种开源组件组装成一个好用的系统：打包软件、调配置、打磨桌面体验。门槛不高，改动马上能看到效果。',
    includes: ['软件打包', '系统集成与启动流程', '桌面环境与窗口管理器', '配置与脚本'],
    links: [
      { label: 'Omarchy', url: 'https://github.com/omacom/omarchy' },
      { label: 'Hyprland', url: 'https://github.com/hyprwm/Hyprland' },
      { label: 'NixOS / nixpkgs', url: 'https://github.com/NixOS/nixpkgs' },
    ],
  },
  'websec': {
    intro: '帮网站和网络找漏洞、做防护：渗透测试、分析流量、发现 SQL 注入这类问题。安全行业里岗位最多的方向。',
    includes: ['渗透测试', 'Web 漏洞（注入、XSS）', '网络流量分析', '安全加固'],
    links: [
      { label: 'ZAP 漏洞扫描', url: 'https://github.com/zaproxy/zaproxy' },
      { label: 'sqlmap 注入检测', url: 'https://github.com/sqlmapproject/sqlmap' },
      { label: 'Wireshark 抓包', url: 'https://github.com/wireshark/wireshark' },
    ],
  },
  'vuln': {
    intro: '钻到程序最底层找漏洞：分析编译好的程序、找内存错误、写利用代码。需要懂汇编和系统底层。',
    includes: ['二进制漏洞与利用', '逆向工程', '模糊测试', 'CTF 比赛'],
    links: [
      { label: 'Ghidra 逆向工具', url: 'https://github.com/NationalSecurityAgency/ghidra' },
      { label: 'OSS-Fuzz 模糊测试', url: 'https://github.com/google/oss-fuzz' },
      { label: 'pwn.college 攻防练习', url: 'https://pwn.college/' },
    ],
  },
  'embedded': {
    intro: '给单片机、机器人、无人机写程序，让代码控制真实世界的硬件。',
    includes: ['单片机编程', '实时操作系统', '传感器与通信', '机器人软件（ROS）'],
    links: [
      { label: 'Zephyr 实时系统', url: 'https://github.com/zephyrproject-rtos/zephyr' },
      { label: 'ROS 2 机器人系统', url: 'https://github.com/ros2/ros2' },
      { label: 'PX4 无人机飞控', url: 'https://github.com/PX4/PX4-Autopilot' },
    ],
  },
  'chip': {
    intro: '设计 CPU 和芯片：用硬件描述语言写电路，再在 FPGA 上验证，最后可能真的做成芯片。',
    includes: ['数字电路设计', '处理器设计', 'FPGA 验证', '芯片设计工具'],
    links: [
      { label: '香山处理器 XiangShan', url: 'https://github.com/OpenXiangShan/XiangShan' },
      { label: 'Chisel 硬件语言', url: 'https://github.com/chipsalliance/chisel' },
      { label: 'Verilator 仿真器', url: 'https://github.com/verilator/verilator' },
    ],
  },
  'blockchain': {
    intro: '构建去中心化的系统：智能合约、区块链客户端、链上应用。',
    includes: ['智能合约', '共识协议', '密码学应用', '链上应用开发'],
    links: [
      { label: 'go-ethereum', url: 'https://github.com/ethereum/go-ethereum' },
      { label: 'reth 以太坊客户端', url: 'https://github.com/paradigmxyz/reth' },
    ],
  },
  'quantum': {
    intro: '用量子力学的原理做计算，写能在量子计算机上运行的程序。很前沿，数学要求高。',
    includes: ['量子比特与量子门', '量子算法', '量子编程框架'],
    links: [
      { label: 'Qiskit', url: 'https://github.com/Qiskit/qiskit' },
    ],
  },
  'formal': {
    intro: '用数学证明程序没有 bug。芯片、操作系统、密码学这些不能出错的领域会用到。',
    includes: ['定理证明', '模型检验', '程序验证'],
    links: [
      { label: 'Lean 定理证明器', url: 'https://github.com/leanprover/lean4' },
      { label: 'TLA+ 模型检验', url: 'https://github.com/tlaplus/tlaplus' },
    ],
  },
}

export const BLOCK_DETAILS: Record<string, Detail> = {
  // 进阶层
  theory: {
    intro: '研究“计算”本身的极限：哪些问题电脑永远算不出来，哪些问题算得出但要花很久。偏理论，可以晚点再学。',
    includes: ['有限自动机与正则语言', '上下文无关文法', '图灵机与可计算性', '复杂度类 P、NP 与 NP 完全'],
    links: [
      { label: 'MIT 18.404J 计算理论', url: 'https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/' },
    ],
  },
  ml: {
    intro: '教电脑从数据里找规律，而不是由人一条条写规则。ChatGPT、人脸识别、推荐系统都建立在它之上。',
    includes: ['监督学习与模型评估', '神经网络与反向传播', '卷积网络', 'Transformer 与大模型'],
    links: [
      { label: '吴恩达 机器学习（Coursera）', url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
      { label: '台湾大学 李宏毅 机器学习（中文）', url: 'https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php' },
      { label: 'Stanford CS231n 深度学习与视觉', url: 'https://cs231n.stanford.edu/' },
    ],
  },
  graphics: {
    intro: '研究电脑怎么“画画”：从一堆三角形，算出游戏和电影里逼真的画面和光影。',
    includes: ['变换与投影', '光栅化与深度测试', '着色与纹理', '光线追踪'],
    links: [
      { label: 'GAMES101 现代计算机图形学入门（中文）', url: 'https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html' },
    ],
  },
  architecture: {
    intro: '深入 CPU 内部，看它用了哪些巧妙的设计，把指令执行得又快又对。想设计芯片就要学它。',
    includes: ['流水线与冒险', '分支预测与乱序执行', '缓存与一致性协议', '多核与内存模型'],
    links: [
      { label: 'ETH 计算机体系结构（Onur Mutlu）', url: 'https://safari.ethz.ch/architecture/fall2022/doku.php?id=start' },
      { label: '一生一芯', url: 'https://ysyx.org/' },
    ],
  },
  hpc: {
    intro: '让程序跑得飞快：同时用上 CPU 的多个核心，或者调动显卡（GPU）的几千个核心一起算。AI 训练离不开它。',
    includes: ['多线程与同步', 'SIMD 向量化', 'GPU 与 CUDA 编程', '性能分析与调优'],
    links: [
      { label: 'CMU 15-418 / Stanford CS149 并行计算', url: 'https://gfxcourses.stanford.edu/cs149/fall21' },
      { label: 'MIT 6.172 软件性能工程', url: 'https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/' },
    ],
  },
  security: {
    intro: '搞清楚系统为什么会被黑：常见漏洞是怎么产生的、怎么被利用、又该怎么防。也会学加密的基本原理。',
    includes: ['内存安全漏洞（栈溢出等）', 'Web 安全（注入、XSS）', '密码学基础', '网络攻防'],
    links: [
      { label: 'UCB CS161 计算机安全', url: 'https://su20.cs161.org/' },
      { label: 'MIT 6.858 计算机系统安全', url: 'http://css.csail.mit.edu/6.858/2022/' },
      { label: 'pwn.college 攻防练习（ASU CSE365）', url: 'https://pwn.college/' },
    ],
  },
  distributed: {
    intro: '让成百上千台机器像一台机器一样协同工作，就算其中几台坏了，服务也不受影响。大型网站都靠它。',
    includes: ['复制与一致性', '容错与故障检测', 'Raft 共识算法', '分布式事务'],
    links: [
      { label: 'MIT 6.5840（原 6.824）分布式系统', url: 'https://pdos.csail.mit.edu/6.824/' },
    ],
  },

  // 核心层
  dsa: {
    intro: '写程序的基本功：怎么组织数据、怎么设计步骤，让程序又快又省内存。面试必考。',
    includes: ['数组、链表、栈与队列', '树、堆、哈希表与图', '排序与搜索', '贪心与动态规划', '复杂度分析'],
    links: [
      { label: 'UCB CS61B 数据结构', url: 'https://sp24.datastructur.es/' },
      { label: 'Princeton 算法（Coursera）', url: 'https://www.coursera.org/learn/algorithms-part1' },
      { label: 'MIT 6.006 算法导论', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/' },
    ],
  },
  organization: {
    intro: '从最简单的电路开始，一步步搭出一台计算机。学完你会明白，你写的代码在硬件上到底是怎么跑的。',
    includes: ['二进制与数字逻辑', '指令集与汇编', 'CPU 数据通路', '缓存与内存层次'],
    links: [
      { label: 'Nand2Tetris 从与非门造一台计算机', url: 'https://www.nand2tetris.org/' },
      { label: 'UCB CS61C 计算机组成', url: 'https://cs61c.org/' },
      { label: 'CMU 15-213 深入理解计算机系统（CSAPP）', url: 'https://www.cs.cmu.edu/~213/' },
    ],
  },
  os: {
    intro: '操作系统是电脑的“大管家”，管着 CPU、内存和硬盘，让你同时开浏览器、听歌、写代码也不会乱套。',
    includes: ['进程与线程', 'CPU 调度', '虚拟内存', '文件系统', '并发与锁'],
    links: [
      { label: 'MIT 6.1810（原 6.S081）操作系统', url: 'https://pdos.csail.mit.edu/6.1810/' },
      { label: '南京大学 操作系统（蒋炎岩）', url: 'https://jyywiki.cn/OS/2022/index.html' },
      { label: 'UCB CS162 操作系统', url: 'https://cs162.org/' },
    ],
  },
  network: {
    intro: '数据是怎么从你的电脑跑到地球另一端的服务器，再安全地跑回来的。打开一个网页的背后，藏着一整套规则。',
    includes: ['分层模型', 'TCP/IP 与可靠传输', 'HTTP、DNS 与 TLS', 'Socket 编程'],
    links: [
      { label: 'Stanford CS144 计算机网络', url: 'https://cs144.github.io/' },
      { label: '《计算机网络：自顶向下方法》配套资源', url: 'https://gaia.cs.umass.edu/kurose_ross/' },
    ],
  },
  database: {
    intro: '专门用来存数据、查数据的软件是怎么做出来的：怎样又快又可靠地在海量数据里找到想要的那一条。',
    includes: ['关系模型与 SQL', 'B+ 树与索引', '查询执行与优化', '事务与并发控制', '故障恢复'],
    links: [
      { label: 'CMU 15-445 数据库系统', url: 'https://15445.courses.cs.cmu.edu/' },
      { label: 'UCB CS186 数据库系统', url: 'https://cs186berkeley.net/' },
    ],
  },
  compiler: {
    intro: '编译器是“翻译官”，把人写的代码翻译成机器能懂的指令。学完你可以自己设计一门小语言。',
    includes: ['词法分析与语法分析', '抽象语法树', '类型检查', '中间代码与代码生成'],
    links: [
      { label: '北京大学 编译原理实践', url: 'https://pku-minic.github.io/online-doc/#/' },
      { label: 'Stanford CS143 编译原理', url: 'https://web.stanford.edu/class/cs143/' },
    ],
  },
  swe: {
    intro: '一个人写小程序很简单，一群人维护一个大项目才难。这里学的是怎么让代码好读、好改、不容易出错。',
    includes: ['阅读和理解大型代码库', '单元测试与集成测试', '模块化与接口设计', '代码评审与重构'],
    links: [
      { label: 'MIT 6.031 软件构造', url: 'https://web.mit.edu/6.031/' },
      { label: 'UCB CS169 软件工程', url: 'http://www.saasbook.info/courses' },
    ],
  },

  // 基础层
  math: {
    intro: 'CS 要用到的数学：逻辑证明、计数、概率和矩阵。不用学得很深，但很多方向都绕不开它。',
    includes: ['逻辑与证明', '集合、图论与组合计数', '概率论', '线性代数'],
    links: [
      { label: 'MIT 6.042J 计算机科学中的数学', url: 'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/' },
      { label: 'UCB CS70 离散数学与概率论', url: 'http://www.eecs70.org/' },
      { label: 'MIT 18.06 线性代数', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/' },
    ],
  },
  programming: {
    intro: '从零开始学写代码：让电脑按你的想法一步步做事。这是一切的起点。',
    includes: ['变量、条件与循环', '函数与递归', '指针与内存管理', '调试自己的程序'],
    links: [
      { label: 'Harvard CS50 计算机科学导论', url: 'https://cs50.harvard.edu/x/' },
      { label: 'UCB CS61A 程序的结构与解释（Python）', url: 'https://cs61a.org/' },
    ],
  },
  tooling: {
    intro: '程序员每天都在用的工具：命令行、Git、调试器。还有怎么参与开源项目、给别人的项目提交代码。',
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
    intro: '最经典的编程语言之一，贴近硬件、运行飞快。操作系统、嵌入式设备大多用它写。',
    includes: ['指针与手动内存管理', '结构体与数组', '编译、链接与预处理', '标准库'],
    links: [
      { label: 'C 语言参考（cppreference）', url: 'https://en.cppreference.com/w/c' },
      { label: 'C 标准委员会 WG14', url: 'https://www.open-std.org/jtc1/sc22/wg14/' },
    ],
  },
  cpp: {
    intro: 'C 的“加强版”，既能跑得很快，又能写复杂的大型程序。游戏引擎、浏览器、AI 框架的底层常用它。',
    includes: ['类与面向对象', '模板与泛型编程', 'RAII 与智能指针', '标准模板库 STL'],
    links: [
      { label: 'isocpp.org', url: 'https://isocpp.org/' },
      { label: 'C++ 参考（cppreference）', url: 'https://en.cppreference.com/w/cpp' },
    ],
  },
  rust: {
    intro: '一门新的系统语言，和 C/C++ 一样快，但能在编译时就挡住很多内存错误。越来越多底层项目在改用它。',
    includes: ['所有权与借用', '生命周期', 'trait 与泛型', 'Cargo 包管理'],
    links: [
      { label: 'Rust 官网', url: 'https://www.rust-lang.org/' },
      { label: 'The Rust Book', url: 'https://doc.rust-lang.org/book/' },
    ],
  },
  go: {
    intro: 'Google 出的语言，语法简单，写并发程序很方便。Docker、Kubernetes 都是用它写的。',
    includes: ['goroutine 与 channel', '接口', '标准库与网络编程', 'Go modules'],
    links: [
      { label: 'Go 官网', url: 'https://go.dev/' },
      { label: 'A Tour of Go', url: 'https://go.dev/tour/' },
    ],
  },
  java: {
    intro: '老牌的主力语言，大公司的后端服务和安卓 App 大量使用，工作机会非常多。',
    includes: ['面向对象', '集合框架', 'JVM 与垃圾回收', '并发编程'],
    links: [
      { label: 'dev.java', url: 'https://dev.java/' },
      { label: 'Java 官方文档', url: 'https://docs.oracle.com/en/java/' },
    ],
  },
  kotlin: {
    intro: '更现代、更简洁的 Java 替代品，现在是安卓开发的官方首选语言。',
    includes: ['空安全', '协程', '与 Java 互操作', '扩展函数'],
    links: [
      { label: 'Kotlin 官网', url: 'https://kotlinlang.org/' },
      { label: 'Kotlin 文档', url: 'https://kotlinlang.org/docs/home.html' },
    ],
  },
  swift: {
    intro: '苹果推出的语言，用来开发 iPhone、iPad 和 Mac 上的 App。',
    includes: ['可选类型', '协议与扩展', '值类型与引用类型', 'async/await 并发'],
    links: [
      { label: 'Swift 官网', url: 'https://www.swift.org/' },
      { label: 'The Swift Programming Language', url: 'https://docs.swift.org/swift-book/' },
    ],
  },
  csharp: {
    intro: '微软的主力语言，常用于 Windows 软件和企业系统，也是 Unity 游戏开发用的语言。',
    includes: ['面向对象', 'LINQ', 'async/await', '.NET 运行时'],
    links: [
      { label: 'C# 文档', url: 'https://learn.microsoft.com/dotnet/csharp/' },
      { label: '.NET 官网', url: 'https://dotnet.microsoft.com/' },
    ],
  },
  python: {
    intro: '语法像英语一样好读，特别适合入门。也是 AI、数据分析和写自动化脚本的首选。',
    includes: ['基础语法与数据类型', '函数、类与模块', '包管理（pip）', '常用标准库'],
    links: [
      { label: 'Python 官网', url: 'https://www.python.org/' },
      { label: 'Python 官方教程（中文）', url: 'https://docs.python.org/zh-cn/3/tutorial/' },
    ],
  },
  javascript: {
    intro: '网页的“灵魂”，所有浏览器都能直接运行它。想做网页，绕不开它。',
    includes: ['基础语法与对象', '异步：Promise 与 async/await', 'DOM 操作', '模块化'],
    links: [
      { label: 'MDN JavaScript 文档', url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript' },
      { label: 'ECMAScript 规范', url: 'https://tc39.es/ecma262/' },
    ],
  },
  typescript: {
    intro: '给 JavaScript 加上类型检查，写大项目时能提前发现很多错误，现在前端基本都用它。',
    includes: ['类型标注与推断', '接口与泛型', '联合类型与类型收窄', '编译配置'],
    links: [
      { label: 'TypeScript 官网', url: 'https://www.typescriptlang.org/' },
      { label: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
    ],
  },
  sql: {
    intro: '和数据库“对话”的语言：查数据、改数据、建表都靠它。几乎所有方向都会用到。',
    includes: ['查询：SELECT、JOIN、GROUP BY', '增删改', '建表与约束', '索引与事务'],
    links: [
      { label: 'PostgreSQL SQL 教程', url: 'https://www.postgresql.org/docs/current/tutorial-sql.html' },
      { label: 'SQLite 支持的 SQL', url: 'https://sqlite.org/lang.html' },
    ],
  },
  shell: {
    intro: '在命令行里写的小脚本，能把各种程序串起来，把重复的操作自动化。',
    includes: ['常用命令', '管道与重定向', '变量与流程控制', '编写脚本'],
    links: [
      { label: 'GNU Bash', url: 'https://www.gnu.org/software/bash/' },
      { label: 'Bash 参考手册', url: 'https://www.gnu.org/software/bash/manual/' },
    ],
  },
  asm: {
    intro: 'CPU 能直接看懂的指令的文字版。平时很少直接写，但读得懂它，才能看清程序在机器上到底做了什么。',
    includes: ['寄存器与指令', '调用约定与栈帧', 'x86-64、ARM、RISC-V', '读反汇编'],
    links: [
      { label: 'Intel 64 与 IA-32 架构手册', url: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html' },
      { label: 'Arm 开发者文档', url: 'https://developer.arm.com/documentation' },
    ],
  },
  verilog: {
    intro: '用来“写电路”的语言。写出来的不是程序，而是会被做成芯片或烧进 FPGA 的硬件。',
    includes: ['模块与端口', '组合逻辑与时序逻辑', '状态机', '仿真与测试'],
    links: [
      { label: 'Verilator 开源仿真器', url: 'https://github.com/verilator/verilator' },
      { label: 'HDLBits 在线练习', url: 'https://hdlbits.01xz.net/' },
    ],
  },
  solidity: {
    intro: '在以太坊区块链上写“智能合约”的语言，合约一旦部署就会自动按规则执行。',
    includes: ['合约与状态变量', '函数与修饰器', 'Gas 与成本', '常见安全问题'],
    links: [
      { label: 'Solidity 官网', url: 'https://soliditylang.org/' },
      { label: 'Solidity 文档', url: 'https://docs.soliditylang.org/' },
    ],
  },

  // 框架与库
  react: {
    intro: '目前最流行的网页界面框架，把页面拆成一个个可复用的“组件”来搭。',
    includes: ['组件与 JSX', 'props 与 state', 'Hooks', '渲染与性能'],
    links: [
      { label: 'React 官网', url: 'https://react.dev/' },
      { label: 'React 中文文档', url: 'https://zh-hans.react.dev/learn' },
    ],
  },
  vue: {
    intro: '另一款很受欢迎的网页框架，上手比 React 更简单，中文资料也很多。',
    includes: ['模板语法', '响应式数据', '组件', '组合式 API'],
    links: [
      { label: 'Vue 官网', url: 'https://vuejs.org/' },
      { label: 'Vue 中文文档', url: 'https://cn.vuejs.org/guide/introduction.html' },
    ],
  },
  spring: {
    intro: 'Java 后端开发的标配框架，大部分 Java 后端岗位都会用到。',
    includes: ['依赖注入', 'Spring Boot', 'Web 与 REST API', '数据访问'],
    links: [
      { label: 'Spring 官网', url: 'https://spring.io/' },
      { label: 'Spring 入门指南', url: 'https://spring.io/guides' },
    ],
  },
  django: {
    intro: 'Python 的“全家桶”网站框架，自带后台管理和数据库操作，能很快做出一个完整网站。',
    includes: ['模型与 ORM', '视图与路由', '模板', '自带管理后台'],
    links: [
      { label: 'Django 官网', url: 'https://www.djangoproject.com/' },
      { label: 'Django 文档', url: 'https://docs.djangoproject.com/' },
    ],
  },
  fastapi: {
    intro: '用 Python 写接口（API）的现代框架，写起来简单，跑得也快，在 AI 项目里很常见。',
    includes: ['路由与请求参数', '类型校验（Pydantic）', '异步接口', '自动生成 API 文档'],
    links: [
      { label: 'FastAPI 官网', url: 'https://fastapi.tiangolo.com/' },
      { label: 'FastAPI 教程', url: 'https://fastapi.tiangolo.com/tutorial/' },
    ],
  },
  flutter: {
    intro: 'Google 出的框架，写一套代码，就能同时做出 iPhone、安卓、电脑和网页版的 App。',
    includes: ['Dart 语言', 'Widget 与布局', '状态管理', '调用原生能力'],
    links: [
      { label: 'Flutter 官网', url: 'https://flutter.dev/' },
      { label: 'Flutter 文档', url: 'https://docs.flutter.dev/' },
    ],
  },
  qt: {
    intro: '老牌的 C++ 界面框架，很多桌面软件和车机、仪表盘的界面都是用它做的。',
    includes: ['信号与槽', 'Widgets', 'QML', '跨平台构建'],
    links: [
      { label: 'Qt 官网', url: 'https://www.qt.io/' },
      { label: 'Qt 文档', url: 'https://doc.qt.io/' },
    ],
  },
  godot: {
    intro: '完全免费开源的游戏引擎，做 2D 和 3D 游戏都可以，对新手很友好。',
    includes: ['场景与节点', 'GDScript', '物理与动画', '导出到各平台'],
    links: [
      { label: 'Godot 官网', url: 'https://godotengine.org/' },
      { label: 'Godot 文档', url: 'https://docs.godotengine.org/' },
    ],
  },
  numpy: {
    intro: 'Python 做数值计算的基础库，几乎所有数据分析和 AI 库都建立在它之上。',
    includes: ['多维数组', '广播', '向量化运算', '线性代数'],
    links: [
      { label: 'NumPy 官网', url: 'https://numpy.org/' },
      { label: 'NumPy 文档', url: 'https://numpy.org/doc/stable/' },
    ],
  },
  pandas: {
    intro: '在 Python 里处理表格数据的利器，可以理解成“用代码操作的 Excel”。',
    includes: ['DataFrame', '读写 CSV 和 Excel', '筛选、分组与聚合', '数据清洗'],
    links: [
      { label: 'pandas 官网', url: 'https://pandas.pydata.org/' },
      { label: 'pandas 文档', url: 'https://pandas.pydata.org/docs/' },
    ],
  },
  pytorch: {
    intro: '最主流的深度学习框架，研究人员和公司都在用它搭建和训练神经网络。',
    includes: ['张量运算', '自动求导', '搭建和训练模型', 'GPU 加速'],
    links: [
      { label: 'PyTorch 官网', url: 'https://pytorch.org/' },
      { label: 'PyTorch 教程', url: 'https://docs.pytorch.org/tutorials/' },
    ],
  },
  transformers: {
    intro: 'Hugging Face 出品，几行代码就能下载并使用各种现成的大模型。',
    includes: ['加载预训练模型', '分词器', '推理管线', '微调训练'],
    links: [
      { label: 'Transformers 文档', url: 'https://huggingface.co/docs/transformers' },
      { label: 'Hugging Face 官网', url: 'https://huggingface.co/' },
    ],
  },
  langchain: {
    intro: '把大模型、工具和你自己的数据串起来，搭出能帮人干活的 AI 应用和 Agent。',
    includes: ['调用大模型', '提示词模板', '工具调用与 Agent', '检索增强（RAG）'],
    links: [
      { label: 'LangChain 官网', url: 'https://www.langchain.com/' },
      { label: 'LangChain 文档', url: 'https://docs.langchain.com/' },
    ],
  },
  spark: {
    intro: '一台电脑处理不过来的海量数据，就交给 Spark，让一群电脑一起算。',
    includes: ['RDD 与 DataFrame', 'Spark SQL', '流处理', '集群部署'],
    links: [
      { label: 'Apache Spark 官网', url: 'https://spark.apache.org/' },
      { label: 'Spark 文档', url: 'https://spark.apache.org/docs/latest/' },
    ],
  },

  // 平台与工具
  nodejs: {
    intro: '让 JavaScript 不只在浏览器里跑，也能在服务器上跑。很多前端工具也靠它运行。',
    includes: ['事件循环与异步 I/O', '模块系统', 'npm 包管理', '写 HTTP 服务'],
    links: [
      { label: 'Node.js 官网', url: 'https://nodejs.org/' },
      { label: 'Node.js 入门', url: 'https://nodejs.org/en/learn' },
    ],
  },
  docker: {
    intro: '把程序和它需要的一切打包成一个“集装箱”，放到哪台电脑上都能一样运行。',
    includes: ['镜像与容器', 'Dockerfile', '数据卷与网络', 'Docker Compose'],
    links: [
      { label: 'Docker 官网', url: 'https://www.docker.com/' },
      { label: 'Docker 文档', url: 'https://docs.docker.com/' },
    ],
  },
  k8s: {
    intro: '管理成百上千个 Docker 容器的“调度中心”，自动部署、扩容，坏了自动重启。',
    includes: ['Pod 与 Deployment', 'Service 与网络', '配置与存储', '自动扩缩容'],
    links: [
      { label: 'Kubernetes 官网', url: 'https://kubernetes.io/' },
      { label: 'Kubernetes 中文文档', url: 'https://kubernetes.io/zh-cn/docs/home/' },
    ],
  },
  nginx: {
    intro: '网站的“门卫”，负责接收用户请求，再分发给后面的服务。很多网站的入口都是它。',
    includes: ['静态文件服务', '反向代理', '负载均衡', 'HTTPS 配置'],
    links: [
      { label: 'nginx 官网', url: 'https://nginx.org/' },
      { label: 'nginx 文档', url: 'https://nginx.org/en/docs/' },
    ],
  },
  postgres: {
    intro: '功能最强大的开源数据库之一，稳定可靠，很多公司都用它存核心数据。',
    includes: ['SQL 与数据类型', '索引', '事务与 MVCC', '备份与复制'],
    links: [
      { label: 'PostgreSQL 官网', url: 'https://www.postgresql.org/' },
      { label: 'PostgreSQL 文档', url: 'https://www.postgresql.org/docs/' },
    ],
  },
  redis: {
    intro: '把数据放在内存里的数据库，速度极快，最常见的用途是做缓存。',
    includes: ['常用数据结构', '缓存策略', '持久化', '主从与集群'],
    links: [
      { label: 'Redis 官网', url: 'https://redis.io/' },
      { label: 'Redis 文档', url: 'https://redis.io/docs/latest/' },
    ],
  },
  kafka: {
    intro: '系统之间传递消息的“高速传送带”，每秒能处理海量事件。',
    includes: ['主题与分区', '生产者与消费者', '消费组', '数据持久化与复制'],
    links: [
      { label: 'Apache Kafka 官网', url: 'https://kafka.apache.org/' },
      { label: 'Kafka 文档', url: 'https://kafka.apache.org/documentation/' },
    ],
  },
  prometheus: {
    intro: '给服务装上“体检仪”，持续记录各种运行指标，出问题能及时报警。',
    includes: ['指标与标签', 'PromQL 查询', '告警规则', '与 Grafana 配合'],
    links: [
      { label: 'Prometheus 官网', url: 'https://prometheus.io/' },
      { label: 'Prometheus 文档', url: 'https://prometheus.io/docs/introduction/overview/' },
    ],
  },
  terraform: {
    intro: '用写代码的方式申请服务器、网络这些云资源，不用在网页上一个个手动点。',
    includes: ['HCL 配置语言', 'Provider 与资源', '状态管理', '模块复用'],
    links: [
      { label: 'Terraform 官网', url: 'https://developer.hashicorp.com/terraform' },
      { label: 'Terraform 教程', url: 'https://developer.hashicorp.com/terraform/tutorials' },
    ],
  },
  cuda: {
    intro: 'NVIDIA 显卡的编程平台，让你调动显卡的几千个核心同时计算。AI 训练全靠它。',
    includes: ['线程、块与网格', 'GPU 内存层次', '核函数编写', '性能优化'],
    links: [
      { label: 'CUDA Toolkit', url: 'https://developer.nvidia.com/cuda-toolkit' },
      { label: 'CUDA 编程指南', url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
    ],
  },
  llvm: {
    intro: '一套“编译器积木”，很多语言都借助它把代码编译成机器指令，比如 Rust、Swift。',
    includes: ['LLVM IR', '优化 Pass', '代码生成后端', 'Clang 前端'],
    links: [
      { label: 'LLVM 官网', url: 'https://llvm.org/' },
      { label: 'Kaleidoscope 教程：用 LLVM 写语言', url: 'https://llvm.org/docs/tutorial/' },
    ],
  },
  vivado: {
    intro: 'AMD（原 Xilinx）的 FPGA 设计软件，把你写的 Verilog 变成能在芯片上跑的电路。',
    includes: ['综合与实现', '时序约束与分析', '仿真', '下载到 FPGA 板'],
    links: [
      { label: 'Vivado 官网', url: 'https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado.html' },
      { label: 'AMD 技术文档', url: 'https://docs.amd.com/' },
    ],
  },
  ros: {
    intro: '机器人开发的“操作系统”，提供通信、驱动和各种现成算法，省去很多重复工作。',
    includes: ['节点与话题', '服务与动作', 'launch 启动配置', '仿真（Gazebo）'],
    links: [
      { label: 'ROS 官网', url: 'https://www.ros.org/' },
      { label: 'ROS 2 文档', url: 'https://docs.ros.org/' },
    ],
  },
  wireshark: {
    intro: '网络“窃听器”，能抓下电脑收发的每一个数据包，看清网络通信的细节。',
    includes: ['抓包与过滤', '协议解析', '追踪 TCP 流', '排查网络问题'],
    links: [
      { label: 'Wireshark 官网', url: 'https://www.wireshark.org/' },
      { label: 'Wireshark 文档', url: 'https://www.wireshark.org/docs/' },
    ],
  },
  ghidra: {
    intro: '美国国家安全局开源的逆向工具，能把编译好的程序还原成接近源码的样子来分析。',
    includes: ['反汇编', '反编译成 C 伪代码', '函数与数据分析', '脚本扩展'],
    links: [
      { label: 'Ghidra 官网', url: 'https://ghidra-sre.org/' },
      { label: 'Ghidra GitHub', url: 'https://github.com/NationalSecurityAgency/ghidra' },
    ],
  },
}
