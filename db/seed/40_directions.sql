-- 方向：从技能树往外走，最后到达的职业位置。按“通用标准、只看重磅方向”的排序。
-- 细分方向每行：id, 大方向, 名字, 介绍, 是否热门, 方块上三行, 具体做这些, 代表项目, 必学技能, 任选组。
-- 方向画在技能树的最上面一排，从必学技能的第一个连上去。

INSERT INTO category_rows VALUES ('ai-infra', 'AI Infra',
 '让大模型跑得更快、更省钱。推理支出已经超过训练，这是最可迁移、也最难被替代的 AI 方向。',
 '["推理引擎", "GPU kernel", "AI 编译器"]');
INSERT INTO sub_rows VALUES
('inference', 'ai-infra', '推理工程师',
 '部署和改进推理引擎，让同样的显卡服务更多用户。目标项目是 vLLM。', 1,
 '["vLLM", "分布式推理", "量化"]',
 '["部署推理服务", "优化吞吐和延迟", "给 vLLM 提 PR"]',
 '[["vLLM", "https://github.com/vllm-project/vllm"], ["SGLang", "https://github.com/sgl-project/sglang"]]',
 '["dist-infer", "bench", "quantization", "perf", "english"]', '{"加分项": ["sglang", "trt-llm", "spec-decode", "ci"]}'),
('gpu-kernel', 'ai-infra', 'GPU Kernel 工程师',
 '手写注意力、矩阵乘这些核心算子，把显卡的算力榨干。', 0,
 '["CUDA", "Triton", "性能"]',
 '["写融合算子", "分析访存瓶颈", "给推理引擎加 kernel"]',
 '[["Triton", "https://github.com/triton-lang/triton"], ["FlashAttention", "https://github.com/Dao-AILab/flash-attention"]]',
 '["flash-attn", "cutlass", "vllm"]', '{}'),
('ai-compiler-eng', 'ai-infra', 'AI 编译器工程师',
 '把模型自动编译成高效的 kernel，换一种硬件也能跑得快。', 0,
 '["torch.compile", "MLIR", "TVM"]',
 '["写编译优化", "支持新硬件", "做图层面的融合"]',
 '[["PyTorch", "https://github.com/pytorch/pytorch"], ["TVM", "https://github.com/apache/tvm"]]',
 '["tvm", "perf"]', '{}'),
('edge', 'ai-infra', '端侧推理',
 '让大模型在笔记本和手机上跑起来。', 0,
 '["llama.cpp", "量化", "C++"]',
 '["量化模型", "写 CPU / Metal 后端", "做本地应用"]',
 '[["llama.cpp", "https://github.com/ggml-org/llama.cpp"]]',
 '["edge-infer", "onnx"]', '{"加分项": ["swift", "kotlin"]}'),
('training-infra', 'ai-infra', '训练基础设施',
 '让几百张卡一起训练一个模型还不出错。', 0,
 '["FSDP", "混合精度", "集群"]',
 '["搭训练集群", "优化训练吞吐", "排查训练故障"]',
 '[["Megatron-LM", "https://github.com/NVIDIA/Megatron-LM"], ["TorchTitan", "https://github.com/pytorch/torchtitan"]]',
 '["train-framework", "mlops", "perf"]', '{"加分项": ["distillation", "rlhf"]}');

INSERT INTO category_rows VALUES ('ai-product', 'AI 产品',
 '用大模型做出自己的产品。唯一真正归自己所有的东西；会推理部署的人做得起别人做不起的产品。',
 '["独立开发", "AI 应用", "Agent"]');
INSERT INTO sub_rows VALUES
('indie', 'ai-product', '独立开发者',
 '一个人做产品、上线、收费，在 X 上公开记录。', 1,
 '["产品", "分发", "收入"]',
 '["做一个付费产品", "在 X 上分发", "用自部署模型压成本"]',
 '[["Pieter Levels", "https://levels.io/"], ["Indie Hackers", "https://www.indiehackers.com/"]]',
 '["indie", "growth", "rag"]', '{"加分项": ["analytics", "data-eng", "vllm", "tailwind", "react-native", "nginx"]}'),
('ai-app', 'ai-product', 'AI 应用工程师',
 '在公司里做大模型应用：RAG、Agent、评测。', 1,
 '["RAG", "Agent", "后端"]',
 '["做问答和检索", "做 Agent 工作流", "接进业务系统"]',
 '[["LangGraph", "https://github.com/langchain-ai/langgraph"], ["MCP 服务器", "https://github.com/modelcontextprotocol/servers"]]',
 '["mcp", "eval", "prompt", "finetune"]', '{"加分项": ["multimodal", "voice", "websocket", "testing", "system-design"]}');

INSERT INTO category_rows VALUES ('systems', '底层系统',
 '操作系统、分布式、数据库。已经成熟，适合学原理打地基，不一定深挖。',
 '["系统编程", "分布式", "数据库"]');
INSERT INTO sub_rows VALUES
('systems-eng', 'systems', '系统工程师',
 '写贴近操作系统的高性能软件。', 0,
 '["内核", "并发", "性能"]',
 '["写系统服务", "排查性能问题", "读 Linux 源码"]',
 '[["Linux", "https://github.com/torvalds/linux"]]',
 '["ebpf", "perf", "concurrency", "gdb"]', '{"加分项": ["rust", "shell", "virtualization", "arch"]}'),
('distributed-eng', 'systems', '分布式 / 数据库',
 '做存储、数据库、分布式基础设施。', 0,
 '["分布式", "存储", "共识"]',
 '["写存储引擎", "做复制和分片", "保证一致性"]',
 '[["PostgreSQL", "https://github.com/postgres/postgres"], ["etcd", "https://github.com/etcd-io/etcd"]]',
 '["kafka", "db-internals", "go", "system-design"]', '{"加分项": ["leetcode", "java", "cloud"]}');

INSERT INTO category_rows VALUES ('other', '边线',
 '安全、机器人、区块链、量化。按通用标准不是主线：安全是按漏洞拿钱的劳动，机器人还在早期，区块链和量化放在资本层。',
 '["量化", "安全", "机器人"]');
INSERT INTO sub_rows VALUES
('quant', 'other', '量化研究',
 '用数据研究市场，是资本层的工具。', 0,
 '["回测", "统计", "数据"]',
 '["做回测", "检验交易想法"]',
 '[["Qlib", "https://github.com/microsoft/qlib"]]',
 '["risk", "factor", "viz"]', '{}'),
('security', 'other', '安全',
 '找漏洞、补漏洞。', 0,
 '["Web 安全", "二进制", "CTF"]',
 '["渗透测试", "漏洞挖掘"]',
 '[["OWASP", "https://owasp.org/"]]',
 '["reverse", "ctf", "pentest", "fuzzing"]', '{}'),
('robotics', 'other', '机器人',
 '让模型控制真实世界的机器。', 0,
 '["ROS 2", "控制", "仿真"]',
 '["写机器人软件", "接入视觉和语言模型"]',
 '[["ROS 2", "https://github.com/ros2/ros2"]]',
 '["robot-learning", "slam", "control"]', '{}'),
('blockchain', 'other', '区块链',
 '写智能合约和链上应用。', 0,
 '["智能合约", "以太坊"]',
 '["写合约", "做链上应用"]',
 '[["go-ethereum", "https://github.com/ethereum/go-ethereum"]]',
 '["dapp", "defi", "web-security"]', '{}');

-- 每个职业的图标（终极节点中间那个）
UPDATE subs SET icon = CASE id
  WHEN 'inference'       THEN 'circle-gauge'
  WHEN 'gpu-kernel'      THEN 'cpu'
  WHEN 'ai-compiler-eng' THEN 'square-code'
  WHEN 'edge'            THEN 'monitor-smartphone'
  WHEN 'training-infra'  THEN 'brain-cog'
  WHEN 'indie'           THEN 'laptop'
  WHEN 'ai-app'          THEN 'bot-message-square'
  WHEN 'systems-eng'     THEN 'server-cog'
  WHEN 'distributed-eng' THEN 'earth'
  WHEN 'quant'           THEN 'chart-spline'
  WHEN 'security'        THEN 'fingerprint'
  WHEN 'robotics'        THEN 'bot'
  WHEN 'blockchain'      THEN 'link'
END;
