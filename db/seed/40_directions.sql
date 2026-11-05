-- 职业：一个计算机毕业生最后主要会去的地方。每个都是技能树最上面一排的一枚徽章（终极节点）。
-- 粒度统一：都是招聘时最常写的岗位名，对齐“后端工程师”这一级，不拆到具体技术，也不粗到“程序员”。
-- 细分方向每行：id, 大方向, 名字, 介绍, 是否热门, 方块上三行, 具体做这些, 代表项目, 必学技能, 任选组。
-- 必学技能只写最高层的，前置自动带上；第一个是徽章在树上挂的位置（每个职业挂的技能不同）。
-- “加分项”不算进达成条件：要学的都点亮了，徽章就自己亮。

-- ═════════ AI 算法：训练模型本身 ═════════
INSERT INTO category_rows VALUES ('ai', 'AI 算法',
 '训练模型本身：大模型的预训练和对齐，推荐、视觉这些机器学习算法。',
 '["大模型", "推荐", "视觉"]');
INSERT INTO sub_rows VALUES
('llm-algo', 'ai', '大模型算法工程师',
 '从零预训练基座模型，再用指令微调和强化学习把它调成好用的助手。', 1,
 '["预训练", "后训练", "评测"]',
 '["清洗和配比训练数据", "做指令微调和偏好优化", "训练推理模型"]',
 '[["OLMo", "https://github.com/allenai/OLMo"], ["Hugging Face TRL", "https://github.com/huggingface/trl"]]',
 '["reasoning-rl", "pretrain-run"]', '{"加分项": ["distillation", "train-framework"]}'),
('ml-algo', 'ai', '机器学习算法工程师',
 '做推荐、搜索、视觉、风控这些线上算法，用模型直接提升业务指标。', 0,
 '["推荐", "视觉", "特征"]',
 '["做召回和排序模型", "做图像识别", "分析线上实验"]',
 '[["scikit-learn", "https://github.com/scikit-learn/scikit-learn"], ["Ultralytics YOLO", "https://github.com/ultralytics/ultralytics"]]',
 '["ranking", "detection", "gbdt", "feature", "ab-test"]', '{"加分项": ["multimodal", "rl"]}');

-- ═════════ AI Infra：让模型跑得更快更省（主线） ═════════
INSERT INTO category_rows VALUES ('ai-infra', 'AI Infra',
 '让大模型跑得更快、更省钱。推理支出已经超过训练，这是最可迁移、也最难被替代的 AI 方向。',
 '["推理引擎", "算子", "训练集群"]');
INSERT INTO sub_rows VALUES
('inference', 'ai-infra', '推理工程师',
 '部署和改进推理引擎，在服务器和端侧设备上让模型跑得更快更省。目标项目是 vLLM。', 1,
 '["vLLM", "分布式推理", "量化"]',
 '["部署推理服务", "优化吞吐和延迟", "给 vLLM 提 PR"]',
 '[["vLLM", "https://github.com/vllm-project/vllm"], ["llama.cpp", "https://github.com/ggml-org/llama.cpp"]]',
 '["dist-infer", "bench", "quantization", "perf", "english"]', '{"加分项": ["sglang", "trt-llm", "spec-decode", "edge-infer", "onnx", "ci"]}'),
('kernel-compiler', 'ai-infra', '算子与编译器工程师',
 '手写注意力、矩阵乘这些核心算子，再让编译器自动生成它们，把显卡的算力榨干。', 0,
 '["CUDA", "Triton", "AI 编译器"]',
 '["写融合算子", "分析访存瓶颈", "做编译优化"]',
 '[["Triton", "https://github.com/triton-lang/triton"], ["Apache TVM", "https://github.com/apache/tvm"]]',
 '["flash-attn", "cutlass", "tvm"]', '{}'),
('training-infra', 'ai-infra', '训练基础设施工程师',
 '让几百张卡一起训练一个模型还不出错。', 0,
 '["FSDP", "混合精度", "集群"]',
 '["搭训练集群", "优化训练吞吐", "排查训练故障"]',
 '[["Megatron-LM", "https://github.com/NVIDIA/Megatron-LM"], ["TorchTitan", "https://github.com/pytorch/torchtitan"]]',
 '["train-framework", "mlops", "perf"]', '{}');

-- ═════════ 产品与客户端：用户直接用到的东西 ═════════
INSERT INTO category_rows VALUES ('client', '产品与客户端',
 '做用户直接用到的东西：AI 应用、整个产品、网页、手机 App、游戏。自己的产品是唯一真正归自己所有的东西。',
 '["AI 应用", "前端", "移动端"]');
INSERT INTO sub_rows VALUES
('ai-app', 'client', 'AI 应用工程师',
 '在公司里做大模型应用：RAG、Agent、评测。', 1,
 '["RAG", "Agent", "后端"]',
 '["做问答和检索", "做 Agent 工作流", "接进业务系统"]',
 '[["LangGraph", "https://github.com/langchain-ai/langgraph"], ["MCP 服务器", "https://github.com/modelcontextprotocol/servers"]]',
 '["mcp", "eval", "prompt", "finetune"]', '{"加分项": ["multimodal", "voice", "websocket", "testing", "system-design"]}'),
('product-eng', 'client', '产品工程师',
 '从设计、开发到上线收费，一个人能把产品做完；也是做独立开发的那套能力。', 1,
 '["产品", "分发", "收入"]',
 '["做一个付费产品", "在 X 上分发", "用自部署模型压成本"]',
 '[["Pieter Levels", "https://levels.io/"], ["Indie Hackers", "https://www.indiehackers.com/"]]',
 '["indie", "growth", "rag"]', '{"加分项": ["analytics", "data-eng", "vllm", "tailwind", "react-native", "nginx"]}');

INSERT INTO sub_rows VALUES
('backend', 'systems', '后端工程师',
 '写接口、管数据库、扛流量，让服务稳定地跑。', 0,
 '["接口", "数据库", "缓存"]',
 '["设计接口和数据表", "加缓存和队列", "排查线上问题"]',
 '[["ByteByteGo", "https://bytebytego.com/"]]',
 '["system-design", "postgres", "ci"]', '{"加分项": ["go", "java"]}'),
('frontend', 'client', '前端工程师',
 '做网页和 Web 应用的界面，也能自己写接口做成全栈。', 0,
 '["React", "TypeScript", "全栈"]',
 '["做交互复杂的页面", "做组件库", "一个人做完全栈应用"]',
 '[["Full Stack Open", "https://fullstackopen.com/zh/"]]',
 '["design-system", "web-perf", "build-tools", "e2e", "nextjs", "auth", "ci"]', '{"加分项": ["vue", "threejs", "tailwind", "fastapi"]}'),
('mobile', 'client', '移动端工程师',
 '做 iOS 和 Android 应用。', 0,
 '["iOS", "Android", "跨平台"]',
 '["做原生 App", "做跨平台 App", "上架应用商店"]',
 '[["React Native", "https://github.com/facebook/react-native"]]',
 '["app-release", "swiftui", "compose", "auth", "ci"]', '{"加分项": ["flutter", "dart"]}'),
('gamedev', 'client', '游戏开发工程师',
 '用游戏引擎和图形学做出能玩的游戏。', 0,
 '["引擎", "图形学", "玩法"]',
 '["写游戏玩法", "做渲染效果", "优化帧率"]',
 '[["Godot", "https://github.com/godotengine/godot"]]',
 '["physics", "shader", "netcode", "perf", "ci"]', '{}');

-- ═════════ 后端与系统：AI Infra 的根 ═════════
INSERT INTO category_rows VALUES ('systems', '后端与系统',
 '让服务稳定地跑：后端、分布式、运维、操作系统和嵌入式。已经成熟，也是 AI Infra 的根。',
 '["后端", "分布式", "系统"]');
INSERT INTO sub_rows VALUES
('systems-eng', 'systems', '系统工程师',
 '写贴近硬件和操作系统的软件：内核、驱动、嵌入式固件。', 0,
 '["内核", "嵌入式", "性能"]',
 '["写系统服务和驱动", "排查性能问题", "读 Linux 源码"]',
 '[["Linux", "https://github.com/torvalds/linux"]]',
 '["ebpf", "driver", "rtos", "perf", "gdb", "concurrency", "arch", "virtualization", "networking", "cpp", "ci"]', '{"加分项": ["rust", "shell"]}'),
('distributed-eng', 'systems', '分布式系统工程师',
 '做复制、分片、消息队列和数据库这些让很多台机器协同工作的基础设施。', 0,
 '["共识", "存储", "数据库"]',
 '["做复制和分片", "写存储引擎", "保证一致性"]',
 '[["etcd", "https://github.com/etcd-io/etcd"], ["PostgreSQL", "https://github.com/postgres/postgres"]]',
 '["kafka", "system-design", "db-internals", "go"]', '{"加分项": ["leetcode", "java", "cloud"]}'),
('sre', 'systems', 'SRE / 云原生工程师',
 '让线上服务一直可用：监控、告警、扩容、故障恢复。', 0,
 '["Kubernetes", "监控", "云"]',
 '["搭监控和告警", "管 Kubernetes 集群", "处理线上故障"]',
 '[["Google SRE 书", "https://sre.google/books/"]]',
 '["incident", "iac", "shell", "go", "nginx", "ci"]', '{"加分项": ["ebpf"]}');

-- ═════════ 数据与安全 ═════════
INSERT INTO category_rows VALUES ('data', '数据与安全',
 '和数据、风险打交道：数据工程、安全、量化。按通用标准不是主线：安全是按漏洞拿钱的劳动，量化是资本层的研究工具。',
 '["数据", "安全", "量化"]');
INSERT INTO sub_rows VALUES
('data', 'data', '数据工程师',
 '搭数据管道和数仓，用 Spark 处理大数据，再把数据分析清楚。', 0,
 '["ETL", "Spark", "分析"]',
 '["搭数据管道", "处理大规模数据", "做数据报表和分析"]',
 '[["Apache Airflow", "https://github.com/apache/airflow"], ["dbt", "https://github.com/dbt-labs/dbt-core"]]',
 '["spark", "analytics", "viz", "cloud"]', '{"加分项": ["timeseries"]}');

INSERT INTO sub_rows VALUES
('security', 'data', '安全工程师',
 '找漏洞、补漏洞：Web、二进制、渗透都会。', 0,
 '["Web 安全", "二进制", "CTF"]',
 '["渗透测试", "漏洞挖掘", "参加 CTF"]',
 '[["OWASP", "https://owasp.org/"]]',
 '["reverse", "ctf", "pentest", "fuzzing"]', '{}'),
('quant', 'data', '量化研究员',
 '用数据研究市场，做出能实盘的策略。', 0,
 '["回测", "因子", "风控"]',
 '["做回测", "研究因子", "控制风险"]',
 '[["Qlib", "https://github.com/microsoft/qlib"]]',
 '["portfolio", "factor", "derivatives", "viz", "gbdt", "sql", "cpp"]', '{}');

-- 每个职业的图标（徽章中间那个）
UPDATE subs SET icon = CASE id
  WHEN 'llm-algo'        THEN 'atom'
  WHEN 'ml-algo'         THEN 'target'
  WHEN 'inference'       THEN 'circle-gauge'
  WHEN 'kernel-compiler' THEN 'cpu'
  WHEN 'training-infra'  THEN 'brain-cog'
  WHEN 'ai-app'          THEN 'bot-message-square'
  WHEN 'product-eng'     THEN 'laptop'
  WHEN 'backend'         THEN 'server'
  WHEN 'frontend'        THEN 'layout-template'
  WHEN 'mobile'          THEN 'smartphone'
  WHEN 'gamedev'         THEN 'gamepad'
  WHEN 'systems-eng'     THEN 'server-cog'
  WHEN 'distributed-eng' THEN 'earth'
  WHEN 'sre'             THEN 'life-buoy'
  WHEN 'data'            THEN 'database'
  WHEN 'security'        THEN 'fingerprint'
  WHEN 'quant'           THEN 'chart-spline'
END;
