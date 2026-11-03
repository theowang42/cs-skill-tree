-- 应用层：大方向和细分方向。都按热度排序：综合从业人数（Stack Overflow 开发者调查里
-- Web 与应用开发者最多）和当前关注度（AI 讨论最多）。“其他方向”固定放最后。
-- 同一个大方向里差异大的工作拆成不同细分方向，各自有一套依赖，比如做 Agent 不需要学 CUDA 和计算机组成。
--
-- sub_requirements 只写最高层的能力块，前置会由视图自动带上；sub_tools 写会用到的语言和工具。

-- ═════════ AI ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('ai', 1, 'AI',
   '让电脑学会“看、听、说、写”。你可以去训练模型、让模型跑得更快，或者用大模型做出能帮人干活的 Agent。这是现在最热门的方向。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('ai', 1, 'Agent 开发'),
  ('ai', 2, '模型与算法'),
  ('ai', 3, 'AI 系统');

-- AI › Agent 开发
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('agent', 'ai', 1, 'Agent 开发',
   '用大模型做出能帮人干活的应用：会查资料、会调用工具、能连续完成多个步骤。门槛最低、最热门的 AI 方向，不需要会训练模型。', 1);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('agent', 1, '调用大模型'),
  ('agent', 2, 'RAG 检索'),
  ('agent', 3, '工具与 MCP');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('agent', 'swe'),
  ('agent', 'network'),
  ('agent', 'dsa');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('agent', 'python'),
  ('agent', 'typescript'),
  ('agent', 'langchain'),
  ('agent', 'fastapi'),
  ('agent', 'docker');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('agent', 1, '调用大模型 API 与写提示词'),
  ('agent', 2, 'RAG：让模型读你自己的资料'),
  ('agent', 3, '工具调用与 MCP'),
  ('agent', 4, '把应用部署上线');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('agent', 1, 'MCP 官方服务器集合', 'https://github.com/modelcontextprotocol/servers'),
  ('agent', 2, 'LangGraph Agent 框架', 'https://github.com/langchain-ai/langgraph'),
  ('agent', 3, 'OpenHands 编程 Agent', 'https://github.com/OpenHands/OpenHands');

-- AI › 模型与算法
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('ai-algo', 'ai', 2, '模型与算法',
   '研究和改进模型本身：让模型更聪明、更准。需要扎实的数学和机器学习基础，偏研究。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('ai-algo', 1, '大模型'),
  ('ai-algo', 2, '视觉与语音'),
  ('ai-algo', 3, '训练与微调');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('ai-algo', 'ml'),
  ('ai-algo', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('ai-algo', 'python'),
  ('ai-algo', 'numpy'),
  ('ai-algo', 'pandas'),
  ('ai-algo', 'pytorch'),
  ('ai-algo', 'transformers');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('ai-algo', 1, '大语言模型'),
  ('ai-algo', 2, '图像与语音模型'),
  ('ai-algo', 3, '训练与微调'),
  ('ai-algo', 4, '读论文、复现实验');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('ai-algo', 1, 'Hugging Face Transformers', 'https://github.com/huggingface/transformers'),
  ('ai-algo', 2, 'Diffusers 图像生成', 'https://github.com/huggingface/diffusers'),
  ('ai-algo', 3, 'nanoGPT 从零训练 GPT', 'https://github.com/karpathy/nanoGPT');

-- AI › AI 系统
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('ai-sys', 'ai', 3, 'AI 系统',
   '让模型训练得更快、推理更省：和显卡、内存、并行计算打交道，是 AI 里最“硬核”的工程方向。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('ai-sys', 1, '训练框架'),
  ('ai-sys', 2, '推理加速'),
  ('ai-sys', 3, 'GPU 编程');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('ai-sys', 'ml'),
  ('ai-sys', 'hpc'),
  ('ai-sys', 'distributed'),
  ('ai-sys', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('ai-sys', 'python'),
  ('ai-sys', 'cpp'),
  ('ai-sys', 'cuda'),
  ('ai-sys', 'pytorch'),
  ('ai-sys', 'docker');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('ai-sys', 1, '训练框架'),
  ('ai-sys', 2, '推理加速与部署'),
  ('ai-sys', 3, 'GPU / CUDA 编程'),
  ('ai-sys', 4, '分布式训练');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('ai-sys', 1, 'PyTorch', 'https://github.com/pytorch/pytorch'),
  ('ai-sys', 2, 'vLLM 推理引擎', 'https://github.com/vllm-project/vllm'),
  ('ai-sys', 3, 'llama.cpp 本地推理', 'https://github.com/ggml-org/llama.cpp');

-- ═════════ 应用 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('apps', 2, '应用',
   '做大家每天都在用的软件：网站、手机 App、桌面软件和游戏。上手最快、岗位最多，适合想尽快做出东西的人。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('apps', 1, '后端 · 前端'),
  ('apps', 2, '客户端 · 游戏'),
  ('apps', 3, '开发者工具');

-- 应用 › 后端开发
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('backend', 'apps', 1, '后端开发',
   '网站和 App 背后的“大脑”：处理用户请求、读写数据库、保证服务稳定。岗位最多的方向之一。', 1);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('backend', 1, 'API 与业务逻辑'),
  ('backend', 2, '数据库与缓存'),
  ('backend', 3, '部署上线');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('backend', 'database'),
  ('backend', 'network'),
  ('backend', 'os'),
  ('backend', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('backend', 'java'),
  ('backend', 'go'),
  ('backend', 'python'),
  ('backend', 'sql'),
  ('backend', 'spring'),
  ('backend', 'django'),
  ('backend', 'fastapi'),
  ('backend', 'postgres'),
  ('backend', 'redis'),
  ('backend', 'nginx'),
  ('backend', 'docker');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('backend', 1, '设计和实现 API'),
  ('backend', 2, '数据库与缓存'),
  ('backend', 3, '用户、权限与安全'),
  ('backend', 4, '部署与监控');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('backend', 1, 'Spring Boot', 'https://github.com/spring-projects/spring-boot'),
  ('backend', 2, 'Django', 'https://github.com/django/django'),
  ('backend', 3, 'FastAPI', 'https://github.com/fastapi/fastapi');

-- 应用 › Web 前端
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('frontend', 'apps', 2, 'Web 前端',
   '用户直接看到、点到的那部分网页。做出好看、好用、反应快的界面。', 1);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('frontend', 1, '页面与交互'),
  ('frontend', 2, 'React / Vue'),
  ('frontend', 3, '前端工程化');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('frontend', 'swe'),
  ('frontend', 'network'),
  ('frontend', 'dsa');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('frontend', 'javascript'),
  ('frontend', 'typescript'),
  ('frontend', 'react'),
  ('frontend', 'vue'),
  ('frontend', 'nodejs');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('frontend', 1, 'HTML、CSS 与页面布局'),
  ('frontend', 2, 'JavaScript 交互'),
  ('frontend', 3, 'React / Vue 框架'),
  ('frontend', 4, '打包构建与性能优化');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('frontend', 1, 'React', 'https://github.com/facebook/react'),
  ('frontend', 2, 'Vue', 'https://github.com/vuejs/core'),
  ('frontend', 3, 'Vite 构建工具', 'https://github.com/vitejs/vite');

-- 应用 › 客户端开发
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('client', 'apps', 3, '客户端开发',
   '开发装在手机和电脑上的 App：iPhone、安卓、Windows、Mac 软件。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('client', 1, 'iOS / 安卓'),
  ('client', 2, '桌面软件'),
  ('client', 3, '跨平台');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('client', 'swe'),
  ('client', 'network'),
  ('client', 'dsa');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('client', 'kotlin'),
  ('client', 'swift'),
  ('client', 'csharp'),
  ('client', 'cpp'),
  ('client', 'flutter'),
  ('client', 'qt');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('client', 1, 'iOS 与安卓开发'),
  ('client', 2, '桌面软件'),
  ('client', 3, '跨平台框架'),
  ('client', 4, '发布到应用商店');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('client', 1, 'Flutter', 'https://github.com/flutter/flutter'),
  ('client', 2, 'Tauri', 'https://github.com/tauri-apps/tauri'),
  ('client', 3, 'Electron', 'https://github.com/electron/electron');

-- 应用 › 游戏与图形
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('game', 'apps', 4, '游戏与图形',
   '做游戏，或者做游戏引擎、渲染器、音视频处理这类和画面声音打交道的软件。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('game', 1, '游戏开发'),
  ('game', 2, '渲染引擎'),
  ('game', 3, '音视频');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('game', 'graphics'),
  ('game', 'hpc'),
  ('game', 'dsa'),
  ('game', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('game', 'cpp'),
  ('game', 'csharp'),
  ('game', 'godot');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('game', 1, '游戏玩法与引擎使用'),
  ('game', 2, '实时渲染'),
  ('game', 3, '物理与动画'),
  ('game', 4, '音视频编解码');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('game', 1, 'Godot 游戏引擎', 'https://github.com/godotengine/godot'),
  ('game', 2, 'Bevy 游戏引擎', 'https://github.com/bevyengine/bevy'),
  ('game', 3, 'FFmpeg 音视频', 'https://github.com/FFmpeg/FFmpeg');

-- 应用 › 开发者工具
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('devtools', 'apps', 5, '开发者工具',
   '给程序员做工具：编辑器、插件、构建工具、测试框架。你天天在用，最清楚哪里不好用，是参与开源最容易的入口。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('devtools', 1, '编辑器与插件'),
  ('devtools', 2, '构建与测试'),
  ('devtools', 3, '命令行工具');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('devtools', 'swe'),
  ('devtools', 'dsa');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('devtools', 'typescript'),
  ('devtools', 'rust'),
  ('devtools', 'go'),
  ('devtools', 'shell'),
  ('devtools', 'nodejs');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('devtools', 1, '编辑器与插件'),
  ('devtools', 2, '构建工具'),
  ('devtools', 3, '测试框架'),
  ('devtools', 4, '命令行工具');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('devtools', 1, 'VS Code', 'https://github.com/microsoft/vscode'),
  ('devtools', 2, 'Neovim', 'https://github.com/neovim/neovim'),
  ('devtools', 3, 'Playwright 测试框架', 'https://github.com/microsoft/playwright');

-- ═════════ 基础设施与数据 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('infra', 3, '基础设施与数据',
   '让网站和 App 能 24 小时稳定运行，并且能处理海量数据。用户看不到你，但没有你，什么都跑不起来。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('infra', 1, '云原生与运维'),
  ('infra', 2, '数据分析'),
  ('infra', 3, '大数据工程');

-- 基础设施与数据 › 云原生与运维
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('cloud', 'infra', 1, '云原生与运维',
   '让服务 24 小时稳定运行：用容器部署、自动扩容、出问题能第一时间发现。也就是常说的运维、SRE、DevOps。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('cloud', 1, '容器与 K8s'),
  ('cloud', 2, '监控与告警'),
  ('cloud', 3, '自动化运维');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('cloud', 'distributed'),
  ('cloud', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('cloud', 'go'),
  ('cloud', 'shell'),
  ('cloud', 'docker'),
  ('cloud', 'k8s'),
  ('cloud', 'nginx'),
  ('cloud', 'prometheus'),
  ('cloud', 'terraform');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('cloud', 1, 'Docker 与 Kubernetes'),
  ('cloud', 2, '监控、日志与告警'),
  ('cloud', 3, '自动化部署（CI/CD）'),
  ('cloud', 4, '用代码管理云资源');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('cloud', 1, 'Kubernetes', 'https://github.com/kubernetes/kubernetes'),
  ('cloud', 2, 'Prometheus 监控', 'https://github.com/prometheus/prometheus'),
  ('cloud', 3, 'Envoy 代理', 'https://github.com/envoyproxy/envoy');

-- 基础设施与数据 › 数据分析
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('datasci', 'infra', 2, '数据分析',
   '从数据里找答案：清洗数据、做统计、画图表，帮业务做决定。上手快，数学和 Python 是关键。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('datasci', 1, '数据清洗'),
  ('datasci', 2, '统计分析'),
  ('datasci', 3, '可视化');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('datasci', 'math'),
  ('datasci', 'database'),
  ('datasci', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('datasci', 'python'),
  ('datasci', 'sql'),
  ('datasci', 'numpy'),
  ('datasci', 'pandas');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('datasci', 1, '数据清洗与整理'),
  ('datasci', 2, '统计分析'),
  ('datasci', 3, '数据可视化'),
  ('datasci', 4, 'SQL 查询');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('datasci', 1, 'pandas', 'https://github.com/pandas-dev/pandas'),
  ('datasci', 2, 'NumPy', 'https://github.com/numpy/numpy'),
  ('datasci', 3, 'Polars', 'https://github.com/pola-rs/polars');

-- 基础设施与数据 › 大数据工程
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('bigdata', 'infra', 3, '大数据工程',
   '一台电脑处理不了的海量数据，要用一群电脑一起处理。负责搭建数据流水线和数据仓库。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('bigdata', 1, '批处理'),
  ('bigdata', 2, '流处理'),
  ('bigdata', 3, '数据仓库');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('bigdata', 'database'),
  ('bigdata', 'distributed'),
  ('bigdata', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('bigdata', 'java'),
  ('bigdata', 'python'),
  ('bigdata', 'sql'),
  ('bigdata', 'spark'),
  ('bigdata', 'kafka'),
  ('bigdata', 'postgres');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('bigdata', 1, '批处理（Spark）'),
  ('bigdata', 2, '实时流处理（Kafka、Flink）'),
  ('bigdata', 3, '数据仓库'),
  ('bigdata', 4, '数据流水线');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('bigdata', 1, 'Apache Spark', 'https://github.com/apache/spark'),
  ('bigdata', 2, 'Apache Kafka', 'https://github.com/apache/kafka'),
  ('bigdata', 3, 'Apache Flink', 'https://github.com/apache/flink');

-- ═════════ 系统 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('systems', 4, '系统',
   '写“软件底下的软件”：操作系统、编译器、数据库。难度高，但学会了你会真正明白电脑是怎么工作的。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('systems', 1, '操作系统内核'),
  ('systems', 2, '数据库内核'),
  ('systems', 3, '编译器');

-- 系统 › 操作系统内核
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('kernel', 'systems', 1, '操作系统内核',
   '写操作系统最底层的代码：调度、内存管理、驱动、虚拟机。难，但能真正看清电脑是怎么运转的。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('kernel', 1, '内核与驱动'),
  ('kernel', 2, '虚拟化'),
  ('kernel', 3, '容器底层');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('kernel', 'os'),
  ('kernel', 'architecture'),
  ('kernel', 'dsa'),
  ('kernel', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('kernel', 'c'),
  ('kernel', 'rust'),
  ('kernel', 'asm'),
  ('kernel', 'shell');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('kernel', 1, '内核与驱动'),
  ('kernel', 2, '虚拟化与虚拟机'),
  ('kernel', 3, '容器底层原理'),
  ('kernel', 4, 'eBPF');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('kernel', 1, 'Linux 内核', 'https://github.com/torvalds/linux'),
  ('kernel', 2, 'QEMU 虚拟机', 'https://github.com/qemu/qemu'),
  ('kernel', 3, 'Firecracker 微虚拟机', 'https://github.com/firecracker-microvm/firecracker');

-- 系统 › 数据库内核
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('db-dev', 'systems', 2, '数据库内核',
   '自己动手造数据库：怎么把数据存到硬盘上、怎么查得快、怎么在多台机器之间保持一致。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('db-dev', 1, '存储引擎'),
  ('db-dev', 2, '查询优化'),
  ('db-dev', 3, '分布式数据库');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('db-dev', 'database'),
  ('db-dev', 'distributed'),
  ('db-dev', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('db-dev', 'cpp'),
  ('db-dev', 'go'),
  ('db-dev', 'rust'),
  ('db-dev', 'sql'),
  ('db-dev', 'postgres');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('db-dev', 1, '存储引擎'),
  ('db-dev', 2, '查询优化与执行'),
  ('db-dev', 3, '事务与并发'),
  ('db-dev', 4, '分布式数据库');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('db-dev', 1, 'PostgreSQL', 'https://github.com/postgres/postgres'),
  ('db-dev', 2, 'DuckDB', 'https://github.com/duckdb/duckdb'),
  ('db-dev', 3, 'TiKV 分布式存储', 'https://github.com/tikv/tikv');

-- 系统 › 编译器与语言
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('compiler-dev', 'systems', 3, '编译器与语言',
   '做编程语言本身：编译器、解释器、运行时。你写的每一行代码都要经过它们。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('compiler-dev', 1, '编译器'),
  ('compiler-dev', 2, '语言运行时'),
  ('compiler-dev', 3, 'WebAssembly');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('compiler-dev', 'compiler'),
  ('compiler-dev', 'architecture'),
  ('compiler-dev', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('compiler-dev', 'cpp'),
  ('compiler-dev', 'rust'),
  ('compiler-dev', 'llvm'),
  ('compiler-dev', 'asm');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('compiler-dev', 1, '编译器前端与后端'),
  ('compiler-dev', 2, '代码优化'),
  ('compiler-dev', 3, '语言运行时与垃圾回收'),
  ('compiler-dev', 4, 'WebAssembly');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('compiler-dev', 1, 'LLVM', 'https://github.com/llvm/llvm-project'),
  ('compiler-dev', 2, 'Rust 编译器', 'https://github.com/rust-lang/rust'),
  ('compiler-dev', 3, 'CPython', 'https://github.com/python/cpython');

-- 系统 › Linux 发行版
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('distro', 'systems', 4, 'Linux 发行版',
   '把各种开源组件组装成一个好用的系统：打包软件、调配置、打磨桌面体验。门槛不高，改动马上能看到效果。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('distro', 1, '打包与集成'),
  ('distro', 2, '桌面环境'),
  ('distro', 3, '配置与脚本');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('distro', 'os'),
  ('distro', 'swe');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('distro', 'shell'),
  ('distro', 'c'),
  ('distro', 'cpp'),
  ('distro', 'python');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('distro', 1, '软件打包'),
  ('distro', 2, '系统集成与启动流程'),
  ('distro', 3, '桌面环境与窗口管理器'),
  ('distro', 4, '配置与脚本');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('distro', 1, 'Omarchy', 'https://github.com/omacom/omarchy'),
  ('distro', 2, 'Hyprland', 'https://github.com/hyprwm/Hyprland'),
  ('distro', 3, 'NixOS / nixpkgs', 'https://github.com/NixOS/nixpkgs');

-- ═════════ 安全 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('security', 5, '安全',
   '站在攻击者的角度找漏洞，再把它们补上。需要对系统底层非常熟悉，像侦探一样工作。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('security', 1, 'Web 与网络安全'),
  ('security', 2, '漏洞研究'),
  ('security', 3, '逆向工程');

-- 安全 › Web 与网络安全
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('websec', 'security', 1, 'Web 与网络安全',
   '帮网站和网络找漏洞、做防护：渗透测试、分析流量、发现 SQL 注入这类问题。安全行业里岗位最多的方向。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('websec', 1, '渗透测试'),
  ('websec', 2, 'Web 漏洞'),
  ('websec', 3, '流量分析');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('websec', 'security'),
  ('websec', 'database'),
  ('websec', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('websec', 'python'),
  ('websec', 'javascript'),
  ('websec', 'sql'),
  ('websec', 'shell'),
  ('websec', 'wireshark');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('websec', 1, '渗透测试'),
  ('websec', 2, 'Web 漏洞（注入、XSS）'),
  ('websec', 3, '网络流量分析'),
  ('websec', 4, '安全加固');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('websec', 1, 'ZAP 漏洞扫描', 'https://github.com/zaproxy/zaproxy'),
  ('websec', 2, 'sqlmap 注入检测', 'https://github.com/sqlmapproject/sqlmap'),
  ('websec', 3, 'Wireshark 抓包', 'https://github.com/wireshark/wireshark');

-- 安全 › 漏洞研究与逆向
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('vuln', 'security', 2, '漏洞研究与逆向',
   '钻到程序最底层找漏洞：分析编译好的程序、找内存错误、写利用代码。需要懂汇编和系统底层。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('vuln', 1, '二进制漏洞'),
  ('vuln', 2, '逆向工程'),
  ('vuln', 3, '模糊测试');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('vuln', 'security'),
  ('vuln', 'compiler'),
  ('vuln', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('vuln', 'c'),
  ('vuln', 'asm'),
  ('vuln', 'python'),
  ('vuln', 'ghidra');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('vuln', 1, '二进制漏洞与利用'),
  ('vuln', 2, '逆向工程'),
  ('vuln', 3, '模糊测试'),
  ('vuln', 4, 'CTF 比赛');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('vuln', 1, 'Ghidra 逆向工具', 'https://github.com/NationalSecurityAgency/ghidra'),
  ('vuln', 2, 'OSS-Fuzz 模糊测试', 'https://github.com/google/oss-fuzz'),
  ('vuln', 3, 'pwn.college 攻防练习', 'https://pwn.college/');

-- ═════════ 硬件 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('hardware', 6, '硬件',
   '离硬件最近的方向：设计 CPU 芯片，或者给单片机、机器人、无人机写程序，让代码在真实世界里动起来。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('hardware', 1, '嵌入式'),
  ('hardware', 2, '机器人'),
  ('hardware', 3, '芯片设计');

-- 硬件 › 嵌入式与机器人
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('embedded', 'hardware', 1, '嵌入式与机器人',
   '给单片机、机器人、无人机写程序，让代码控制真实世界的硬件。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('embedded', 1, '单片机'),
  ('embedded', 2, '实时系统'),
  ('embedded', 3, '机器人');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('embedded', 'os'),
  ('embedded', 'dsa'),
  ('embedded', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('embedded', 'c'),
  ('embedded', 'cpp'),
  ('embedded', 'python'),
  ('embedded', 'ros');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('embedded', 1, '单片机编程'),
  ('embedded', 2, '实时操作系统'),
  ('embedded', 3, '传感器与通信'),
  ('embedded', 4, '机器人软件（ROS）');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('embedded', 1, 'Zephyr 实时系统', 'https://github.com/zephyrproject-rtos/zephyr'),
  ('embedded', 2, 'ROS 2 机器人系统', 'https://github.com/ros2/ros2'),
  ('embedded', 3, 'PX4 无人机飞控', 'https://github.com/PX4/PX4-Autopilot');

-- 硬件 › 芯片设计
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('chip', 'hardware', 2, '芯片设计',
   '设计 CPU 和芯片：用硬件描述语言写电路，再在 FPGA 上验证，最后可能真的做成芯片。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('chip', 1, '数字电路'),
  ('chip', 2, 'CPU 设计'),
  ('chip', 3, 'FPGA');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('chip', 'architecture'),
  ('chip', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('chip', 'verilog'),
  ('chip', 'vivado'),
  ('chip', 'c'),
  ('chip', 'python');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('chip', 1, '数字电路设计'),
  ('chip', 2, '处理器设计'),
  ('chip', 3, 'FPGA 验证'),
  ('chip', 4, '芯片设计工具');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('chip', 1, '香山处理器 XiangShan', 'https://github.com/OpenXiangShan/XiangShan'),
  ('chip', 2, 'Chisel 硬件语言', 'https://github.com/chipsalliance/chisel'),
  ('chip', 3, 'Verilator 仿真器', 'https://github.com/verilator/verilator');

-- ═════════ 其他方向 ═════════

INSERT INTO categories (id, position, name, intro) VALUES
  ('other', 7, '其他方向',
   '一些小众或交叉的方向，比如区块链、量子计算、用数学证明程序没有 bug。感兴趣可以了解一下。');
INSERT INTO category_items (category_id, position, text) VALUES
  ('other', 1, '区块链'),
  ('other', 2, '量子计算'),
  ('other', 3, '形式化验证');

-- 其他方向 › 区块链
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('blockchain', 'other', 1, '区块链',
   '构建去中心化的系统：智能合约、区块链客户端、链上应用。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('blockchain', 1, '智能合约'),
  ('blockchain', 2, '共识协议'),
  ('blockchain', 3, '链上应用');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('blockchain', 'distributed'),
  ('blockchain', 'security'),
  ('blockchain', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('blockchain', 'solidity'),
  ('blockchain', 'rust'),
  ('blockchain', 'go');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('blockchain', 1, '智能合约'),
  ('blockchain', 2, '共识协议'),
  ('blockchain', 3, '密码学应用'),
  ('blockchain', 4, '链上应用开发');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('blockchain', 1, 'go-ethereum', 'https://github.com/ethereum/go-ethereum'),
  ('blockchain', 2, 'reth 以太坊客户端', 'https://github.com/paradigmxyz/reth');

-- 其他方向 › 量子计算
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('quantum', 'other', 2, '量子计算',
   '用量子力学的原理做计算，写能在量子计算机上运行的程序。很前沿，数学要求高。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('quantum', 1, '量子比特'),
  ('quantum', 2, '量子算法'),
  ('quantum', 3, '量子编程');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('quantum', 'math'),
  ('quantum', 'theory'),
  ('quantum', 'tooling');
INSERT INTO sub_tools (sub_id, tool_id) VALUES
  ('quantum', 'python');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('quantum', 1, '量子比特与量子门'),
  ('quantum', 2, '量子算法'),
  ('quantum', 3, '量子编程框架');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('quantum', 1, 'Qiskit', 'https://github.com/Qiskit/qiskit');

-- 其他方向 › 形式化验证
INSERT INTO subs (id, category_id, position, name, intro, is_hot) VALUES
  ('formal', 'other', 3, '形式化验证',
   '用数学证明程序没有 bug。芯片、操作系统、密码学这些不能出错的领域会用到。', 0);
INSERT INTO sub_items (sub_id, position, text) VALUES
  ('formal', 1, '定理证明'),
  ('formal', 2, '模型检验'),
  ('formal', 3, '程序验证');
INSERT INTO sub_requirements (sub_id, block_id) VALUES
  ('formal', 'theory'),
  ('formal', 'compiler'),
  ('formal', 'tooling');
INSERT INTO sub_topics (sub_id, position, text) VALUES
  ('formal', 1, '定理证明'),
  ('formal', 2, '模型检验'),
  ('formal', 3, '程序验证');
INSERT INTO sub_projects (sub_id, position, label, url) VALUES
  ('formal', 1, 'Lean 定理证明器', 'https://github.com/leanprover/lean4'),
  ('formal', 2, 'TLA+ 模型检验', 'https://github.com/tlaplus/tlaplus');
