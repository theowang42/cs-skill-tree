-- 应用层：大方向和细分方向。都按热度排序：综合从业人数（Stack Overflow 开发者调查里
-- Web 与应用开发者最多）和当前关注度（AI 讨论最多）。“其他方向”固定放最后。
--
-- 细分方向每行：id, 大方向, 名字, 介绍, 是否热门, 方块上三行, 具体做这些, 代表项目,
--               必学技能, 任选组。
--   必学技能只写最高层的那几个，它们的前置会自动带上（看 sub_learning_plan 视图）。
--   任选组：{"组名": ["技能", …]}，每组会一个就算满足；只有一个选项的组就是加分项。

-- ═════════ AI ═════════
INSERT INTO category_rows VALUES ('ai', 'AI',
 '让电脑学会“看、听、说、写”。你可以去训练模型、让模型跑得更快，或者用大模型做出能帮人干活的 Agent。这是现在最热门的方向。',
 '["Agent 开发","模型与算法","AI 系统"]');

INSERT INTO sub_rows VALUES
('agent', 'ai', 'Agent 开发',
 '用大模型做出能帮人干活的应用：会查资料、会调用工具、能连续完成多个步骤。门槛最低、最热门的 AI 方向，不需要会训练模型。', 1,
 '["调用大模型","RAG 检索","工具与 MCP"]',
 '["调用大模型 API 与写提示词","RAG：让模型读你自己的资料","工具调用与 MCP","把应用部署上线"]',
 '[["MCP 官方服务器集合","https://github.com/modelcontextprotocol/servers"],["LangGraph Agent 框架","https://github.com/langchain-ai/langgraph"],["OpenHands 编程 Agent","https://github.com/OpenHands/OpenHands"]]',
 '["agent", "rag", "fastapi", "docker", "git", "testing"]',
 '{"加分项": ["typescript"]}'),
('ai-algo', 'ai', '模型与算法',
 '研究和改进模型本身：让模型更聪明、更准。需要扎实的数学和机器学习基础，偏研究。', 0,
 '["大模型","视觉与语音","训练与微调"]',
 '["大语言模型","图像与语音模型","训练与微调","读论文、复现实验"]',
 '[["Hugging Face Transformers","https://github.com/huggingface/transformers"],["Diffusers 图像生成","https://github.com/huggingface/diffusers"],["nanoGPT 从零训练 GPT","https://github.com/karpathy/nanoGPT"]]',
 '["pytorch", "git", "linux"]',
 '{"进阶方向": ["finetune", "cv"]}'),
('ai-sys', 'ai', 'AI 系统',
 '让模型训练得更快、推理更省：和显卡、内存、并行计算打交道，是 AI 里最“硬核”的工程方向。', 0,
 '["训练框架","推理加速","GPU 编程"]',
 '["训练框架","推理加速与部署","GPU / CUDA 编程","分布式训练"]',
 '[["PyTorch","https://github.com/pytorch/pytorch"],["vLLM 推理引擎","https://github.com/vllm-project/vllm"],["llama.cpp 本地推理","https://github.com/ggml-org/llama.cpp"]]',
 '["cuda", "pytorch", "perf"]',
 '{"加分项": ["docker"]}');

-- ═════════ 应用 ═════════
INSERT INTO category_rows VALUES ('apps', '应用',
 '做大家每天都在用的软件：网站、手机 App、桌面软件和游戏。上手最快、岗位最多，适合想尽快做出东西的人。',
 '["后端 · 前端","客户端 · 游戏","开发者工具"]');

INSERT INTO sub_rows VALUES
('backend', 'apps', '后端开发',
 '网站和 App 背后的“大脑”：处理用户请求、读写数据库、保证服务稳定。岗位最多的方向之一。', 1,
 '["API 与业务逻辑","数据库与缓存","部署上线"]',
 '["设计和实现 API","数据库与缓存","用户、权限与安全","部署与监控"]',
 '[["Spring Boot","https://github.com/spring-projects/spring-boot"],["Django","https://github.com/django/django"],["FastAPI","https://github.com/fastapi/fastapi"]]',
 '["redis", "testing", "git", "web-security", "design-patterns", "microservices"]',
 '{"主力语言与框架": ["spring", "fastapi", "go"]}'),
('frontend', 'apps', 'Web 前端',
 '用户直接看到、点到的那部分网页。做出好看、好用、反应快的界面。', 1,
 '["页面与交互","React / Vue","前端工程化"]',
 '["HTML、CSS 与页面布局","JavaScript 交互","React / Vue 框架","打包构建与性能优化"]',
 '[["React","https://github.com/facebook/react"],["Vue","https://github.com/vuejs/core"],["Vite 构建工具","https://github.com/vitejs/vite"]]',
 '["frontend-eng", "nodejs", "html-css", "http", "git", "testing"]',
 '{"前端框架": ["react", "vue"]}'),
('client', 'apps', '客户端开发',
 '开发装在手机和电脑上的 App：iPhone、安卓、Windows、Mac 软件。', 0,
 '["iOS / 安卓","桌面软件","跨平台"]',
 '["iOS 与安卓开发","桌面软件","跨平台框架","发布到应用商店"]',
 '[["Flutter","https://github.com/flutter/flutter"],["Tauri","https://github.com/tauri-apps/tauri"],["Electron","https://github.com/electron/electron"]]',
 '["git", "testing", "http"]',
 '{"开发平台": ["android", "ios", "flutter"]}'),
('game', 'apps', '游戏与图形',
 '做游戏，或者做游戏引擎、渲染器、音视频处理这类和画面声音打交道的软件。', 0,
 '["游戏开发","渲染引擎","音视频"]',
 '["游戏玩法与引擎使用","实时渲染","物理与动画","音视频编解码"]',
 '[["Godot 游戏引擎","https://github.com/godotengine/godot"],["Bevy 游戏引擎","https://github.com/bevyengine/bevy"],["FFmpeg 音视频","https://github.com/FFmpeg/FFmpeg"]]',
 '["game-dev", "graphics", "git"]',
 '{}'),
('devtools', 'apps', '开发者工具',
 '给程序员做工具：编辑器、插件、构建工具、测试框架。你天天在用，最清楚哪里不好用，是参与开源最容易的入口。', 0,
 '["编辑器与插件","构建与测试","命令行工具"]',
 '["编辑器与插件","构建工具","测试框架","命令行工具"]',
 '[["VS Code","https://github.com/microsoft/vscode"],["Neovim","https://github.com/neovim/neovim"],["Playwright 测试框架","https://github.com/microsoft/playwright"]]',
 '["compiler", "cicd"]',
 '{"主力语言": ["typescript", "rust", "go"]}');

-- ═════════ 基础设施与数据 ═════════
INSERT INTO category_rows VALUES ('infra', '基础设施与数据',
 '让网站和 App 能 24 小时稳定运行，并且能处理海量数据。用户看不到你，但没有你，什么都跑不起来。',
 '["云原生与运维","数据分析","大数据工程"]');

INSERT INTO sub_rows VALUES
('cloud', 'infra', '云原生与运维',
 '让服务 24 小时稳定运行：用容器部署、自动扩容、出问题能第一时间发现。也就是常说的运维、SRE、DevOps。', 0,
 '["容器与 K8s","监控与告警","自动化运维"]',
 '["Docker 与 Kubernetes","监控、日志与告警","自动化部署（CI/CD）","用代码管理云资源"]',
 '[["Kubernetes","https://github.com/kubernetes/kubernetes"],["Prometheus 监控","https://github.com/prometheus/prometheus"],["Envoy 代理","https://github.com/envoyproxy/envoy"]]',
 '["kubernetes", "terraform", "monitoring", "nginx", "cicd", "shell"]',
 '{"加分项": ["go"]}'),
('datasci', 'infra', '数据分析',
 '从数据里找答案：清洗数据、做统计、画图表，帮业务做决定。上手快，数学和 Python 是关键。', 0,
 '["数据清洗","统计分析","可视化"]',
 '["数据清洗与整理","统计分析","数据可视化","SQL 查询"]',
 '[["pandas","https://github.com/pandas-dev/pandas"],["NumPy","https://github.com/numpy/numpy"],["Polars","https://github.com/pola-rs/polars"]]',
 '["pandas", "sql"]',
 '{"加分项": ["ml"]}'),
('bigdata', 'infra', '大数据工程',
 '一台电脑处理不了的海量数据，要用一群电脑一起处理。负责搭建数据流水线和数据仓库。', 0,
 '["批处理","流处理","数据仓库"]',
 '["批处理（Spark）","实时流处理（Kafka、Flink）","数据仓库","数据流水线"]',
 '[["Apache Spark","https://github.com/apache/spark"],["Apache Kafka","https://github.com/apache/kafka"],["Apache Flink","https://github.com/apache/flink"]]',
 '["spark", "kafka"]',
 '{"主力语言": ["java", "python"]}');

-- ═════════ 系统 ═════════
INSERT INTO category_rows VALUES ('systems', '系统',
 '写“软件底下的软件”：操作系统、编译器、数据库。难度高，但学会了你会真正明白电脑是怎么工作的。',
 '["操作系统内核","数据库内核","编译器"]');

INSERT INTO sub_rows VALUES
('kernel', 'systems', '操作系统内核',
 '写操作系统最底层的代码：调度、内存管理、驱动、虚拟机。难，但能真正看清电脑是怎么运转的。', 0,
 '["内核与驱动","虚拟化","容器底层"]',
 '["内核与驱动","虚拟化与虚拟机","容器底层原理","eBPF"]',
 '[["Linux 内核","https://github.com/torvalds/linux"],["QEMU 虚拟机","https://github.com/qemu/qemu"],["Firecracker 微虚拟机","https://github.com/firecracker-microvm/firecracker"]]',
 '["concurrency", "net-prog", "git", "shell"]',
 '{"加分项": ["rust"]}'),
('db-dev', 'systems', '数据库内核',
 '自己动手造数据库：怎么把数据存到硬盘上、怎么查得快、怎么在多台机器之间保持一致。', 0,
 '["存储引擎","查询优化","分布式数据库"]',
 '["存储引擎","查询优化与执行","事务与并发","分布式数据库"]',
 '[["PostgreSQL","https://github.com/postgres/postgres"],["DuckDB","https://github.com/duckdb/duckdb"],["TiKV 分布式存储","https://github.com/tikv/tikv"]]',
 '["distributed", "perf"]',
 '{"主力语言": ["cpp", "go", "rust"]}'),
('compiler-dev', 'systems', '编译器与语言',
 '做编程语言本身：编译器、解释器、运行时。你写的每一行代码都要经过它们。', 0,
 '["编译器","语言运行时","WebAssembly"]',
 '["编译器前端与后端","代码优化","语言运行时与垃圾回收","WebAssembly"]',
 '[["LLVM","https://github.com/llvm/llvm-project"],["Rust 编译器","https://github.com/rust-lang/rust"],["CPython","https://github.com/python/cpython"]]',
 '["compiler"]',
 '{"加分项": ["rust"]}'),
('distro', 'systems', 'Linux 发行版',
 '把各种开源组件组装成一个好用的系统：打包软件、调配置、打磨桌面体验。门槛不高，改动马上能看到效果。', 0,
 '["打包与集成","桌面环境","配置与脚本"]',
 '["软件打包","系统集成与启动流程","桌面环境与窗口管理器","配置与脚本"]',
 '[["Omarchy","https://github.com/omacom/omarchy"],["Hyprland","https://github.com/hyprwm/Hyprland"],["NixOS / nixpkgs","https://github.com/NixOS/nixpkgs"]]',
 '["shell", "linux-sys", "git"]',
 '{"加分项": ["python"]}');

-- ═════════ 安全 ═════════
INSERT INTO category_rows VALUES ('security', '安全',
 '站在攻击者的角度找漏洞，再把它们补上。需要对系统底层非常熟悉，像侦探一样工作。',
 '["Web 与网络安全","漏洞研究","逆向工程"]');

INSERT INTO sub_rows VALUES
('websec', 'security', 'Web 与网络安全',
 '帮网站和网络找漏洞、做防护：渗透测试、分析流量、发现 SQL 注入这类问题。安全行业里岗位最多的方向。', 0,
 '["渗透测试","Web 漏洞","流量分析"]',
 '["渗透测试","Web 漏洞（注入、XSS）","网络流量分析","安全加固"]',
 '[["ZAP 漏洞扫描","https://github.com/zaproxy/zaproxy"],["sqlmap 注入检测","https://github.com/sqlmapproject/sqlmap"],["Wireshark 抓包","https://github.com/wireshark/wireshark"]]',
 '["pentest", "crypto"]',
 '{"加分项": ["javascript"]}'),
('vuln', 'security', '漏洞研究与逆向',
 '钻到程序最底层找漏洞：分析编译好的程序、找内存错误、写利用代码。需要懂汇编和系统底层。', 0,
 '["二进制漏洞","逆向工程","模糊测试"]',
 '["二进制漏洞与利用","逆向工程","模糊测试","CTF 比赛"]',
 '[["angr 二进制分析框架","https://github.com/angr/angr"],["OSS-Fuzz 模糊测试","https://github.com/google/oss-fuzz"],["how2heap 堆利用","https://github.com/shellphish/how2heap"]]',
 '["pwn", "python"]',
 '{}');

-- ═════════ 硬件 ═════════
INSERT INTO category_rows VALUES ('hardware', '硬件',
 '离硬件最近的方向：设计 CPU 芯片，或者给单片机、机器人、无人机写程序，让代码在真实世界里动起来。',
 '["嵌入式","机器人","芯片设计"]');

INSERT INTO sub_rows VALUES
('embedded', 'hardware', '嵌入式与机器人',
 '给单片机、机器人、无人机写程序，让代码控制真实世界的硬件。', 0,
 '["单片机","实时系统","机器人"]',
 '["单片机编程","实时操作系统","传感器与通信","机器人软件（ROS）"]',
 '[["Zephyr 实时系统","https://github.com/zephyrproject-rtos/zephyr"],["ROS 2 机器人系统","https://github.com/ros2/ros2"],["PX4 无人机飞控","https://github.com/PX4/PX4-Autopilot"]]',
 '["embedded", "git"]',
 '{"加分项": ["cpp"]}'),
('chip', 'hardware', '芯片设计',
 '设计 CPU 和芯片：用硬件描述语言写电路，再在 FPGA 上验证，最后可能真的做成芯片。', 0,
 '["数字电路","CPU 设计","FPGA"]',
 '["数字电路设计","处理器设计","FPGA 验证","芯片设计工具"]',
 '[["香山处理器 XiangShan","https://github.com/OpenXiangShan/XiangShan"],["Chisel 硬件语言","https://github.com/chipsalliance/chisel"],["Yosys 开源综合工具","https://github.com/YosysHQ/yosys"]]',
 '["fpga"]',
 '{"脚本语言": ["python"]}');

-- ═════════ 其他方向 ═════════
INSERT INTO category_rows VALUES ('other', '其他方向',
 '一些小众或交叉的方向，比如区块链、量子计算、用数学证明程序没有 bug。感兴趣可以了解一下。',
 '["区块链","量子计算","形式化验证"]');

INSERT INTO sub_rows VALUES
('blockchain', 'other', '区块链',
 '构建去中心化的系统：智能合约、区块链客户端、链上应用。', 0,
 '["智能合约","共识协议","链上应用"]',
 '["智能合约","共识协议","密码学应用","链上应用开发"]',
 '[["go-ethereum","https://github.com/ethereum/go-ethereum"],["reth 以太坊客户端","https://github.com/paradigmxyz/reth"]]',
 '["crypto", "distributed"]',
 '{"客户端语言": ["rust", "go"]}'),
('quantum', 'other', '量子计算',
 '用量子力学的原理做计算，写能在量子计算机上运行的程序。很前沿，数学要求高。', 0,
 '["量子比特","量子算法","量子编程"]',
 '["量子比特与量子门","量子算法","量子编程框架"]',
 '[["Qiskit","https://github.com/Qiskit/qiskit"]]',
 '["ml"]',
 '{}'),
('formal', 'other', '形式化验证',
 '用数学证明程序没有 bug。芯片、操作系统、密码学这些不能出错的领域会用到。', 0,
 '["定理证明","模型检验","程序验证"]',
 '["定理证明","模型检验","程序验证"]',
 '[["Lean 定理证明器","https://github.com/leanprover/lean4"],["TLA+ 模型检验","https://github.com/tlaplus/tlaplus"]]',
 '["compiler"]',
 '{"加分项": ["rust"]}');
