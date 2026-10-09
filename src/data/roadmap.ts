// CS 能力树的全部内容。改内容只需要改这个文件。

export interface Block {
  id: string
  name: string
  /** 学什么，每项一行 */
  items: string[]
  /** 直接前置能力块 */
  requires: string[]
}

/** 细分方向：真正决定要学什么 */
export interface Sub {
  id: string
  name: string
  /** 做什么，每项一行 */
  items: string[]
  /** 需要的能力块（只写最高层的，前置会自动带上） */
  requires: string[]
  /** 需要的语言和工具 */
  tools: string[]
}

/** 大方向：先选它，再在里面选一个细分方向 */
export interface Category {
  id: string
  name: string
  /** 方块里显示的概括，每项一行 */
  items: string[]
  subs: Sub[]
}

export interface Tool {
  id: string
  name: string
  /** 出品或维护它的公司、组织 */
  org: string
}

// 大方向和细分方向都按热度排序：综合从业人数（Stack Overflow 开发者调查里
// Web 与应用开发者最多）和当前关注度（AI 讨论最多）。“其他方向”固定放最后。
// 同一个大方向里差异大的工作拆成不同细分方向，各自有一套依赖，
// 比如做 Agent 不需要学 CUDA 和计算机组成。
export const CATEGORIES: Category[] = [
  {
    id: 'ai',
    name: 'AI',
    items: ['Agent 开发', '模型与算法', 'AI 系统'],
    subs: [
      { id: 'agent', name: 'Agent 开发', items: ['调用大模型', 'RAG 检索', '工具与 MCP'], requires: ['swe', 'network', 'dsa'], tools: ['python', 'typescript', 'langchain', 'fastapi', 'docker'] },
      { id: 'ai-algo', name: '模型与算法', items: ['大模型', '视觉与语音', '训练与微调'], requires: ['ml'], tools: ['python', 'numpy', 'pandas', 'pytorch', 'transformers'] },
      { id: 'ai-sys', name: 'AI 系统', items: ['训练框架', '推理加速', 'GPU 编程'], requires: ['ml', 'hpc', 'swe'], tools: ['python', 'cpp', 'cuda', 'pytorch', 'docker'] },
    ],
  },
  {
    id: 'apps',
    name: '应用',
    items: ['后端 · 前端', '客户端 · 游戏', '开发者工具'],
    subs: [
      { id: 'backend', name: '后端开发', items: ['API 与业务逻辑', '数据库与缓存', '部署上线'], requires: ['database', 'network', 'swe'], tools: ['java', 'go', 'python', 'sql', 'spring', 'django', 'fastapi', 'postgres', 'redis', 'nginx', 'docker'] },
      { id: 'frontend', name: 'Web 前端', items: ['页面与交互', 'React / Vue', '前端工程化'], requires: ['swe', 'network', 'dsa'], tools: ['javascript', 'typescript', 'react', 'vue', 'nodejs'] },
      { id: 'client', name: '客户端开发', items: ['iOS / 安卓', '桌面软件', '跨平台'], requires: ['swe', 'os'], tools: ['kotlin', 'swift', 'csharp', 'cpp', 'flutter', 'qt'] },
      { id: 'game', name: '游戏与图形', items: ['游戏开发', '渲染引擎', '音视频'], requires: ['graphics', 'hpc'], tools: ['cpp', 'csharp', 'godot'] },
      { id: 'devtools', name: '开发者工具', items: ['编辑器与插件', '构建与测试', '命令行工具'], requires: ['swe', 'compiler'], tools: ['typescript', 'rust', 'go', 'shell', 'nodejs'] },
    ],
  },
  {
    id: 'infra',
    name: '基础设施与数据',
    items: ['云原生与运维', '数据分析', '大数据工程'],
    subs: [
      { id: 'cloud', name: '云原生与运维', items: ['容器与 K8s', '监控与告警', '自动化运维'], requires: ['distributed', 'tooling'], tools: ['go', 'shell', 'docker', 'k8s', 'nginx', 'prometheus', 'terraform'] },
      { id: 'datasci', name: '数据分析', items: ['数据清洗', '统计分析', '可视化'], requires: ['math', 'dsa'], tools: ['python', 'sql', 'numpy', 'pandas'] },
      { id: 'bigdata', name: '大数据工程', items: ['批处理', '流处理', '数据仓库'], requires: ['database', 'distributed'], tools: ['java', 'python', 'sql', 'spark', 'kafka', 'postgres'] },
    ],
  },
  {
    id: 'systems',
    name: '系统',
    items: ['操作系统内核', '数据库内核', '编译器'],
    subs: [
      { id: 'kernel', name: '操作系统内核', items: ['内核与驱动', '虚拟化', '容器底层'], requires: ['os', 'tooling'], tools: ['c', 'rust', 'asm', 'shell'] },
      { id: 'db-dev', name: '数据库内核', items: ['存储引擎', '查询优化', '分布式数据库'], requires: ['database', 'distributed'], tools: ['cpp', 'go', 'rust', 'sql', 'postgres'] },
      { id: 'compiler-dev', name: '编译器与语言', items: ['编译器', '语言运行时', 'WebAssembly'], requires: ['compiler', 'architecture'], tools: ['cpp', 'rust', 'llvm', 'asm'] },
      { id: 'distro', name: 'Linux 发行版', items: ['打包与集成', '桌面环境', '配置与脚本'], requires: ['os', 'swe'], tools: ['shell', 'c', 'cpp', 'python'] },
    ],
  },
  {
    id: 'security',
    name: '安全',
    items: ['Web 与网络安全', '漏洞研究', '逆向工程'],
    subs: [
      { id: 'websec', name: 'Web 与网络安全', items: ['渗透测试', 'Web 漏洞', '流量分析'], requires: ['security', 'database'], tools: ['python', 'javascript', 'sql', 'shell', 'wireshark'] },
      { id: 'vuln', name: '漏洞研究与逆向', items: ['二进制漏洞', '逆向工程', '模糊测试'], requires: ['security', 'compiler'], tools: ['c', 'asm', 'python', 'ghidra'] },
    ],
  },
  {
    id: 'hardware',
    name: '硬件',
    items: ['嵌入式', '机器人', '芯片设计'],
    subs: [
      { id: 'embedded', name: '嵌入式与机器人', items: ['单片机', '实时系统', '机器人'], requires: ['os'], tools: ['c', 'cpp', 'python', 'ros'] },
      { id: 'chip', name: '芯片设计', items: ['数字电路', 'CPU 设计', 'FPGA'], requires: ['architecture'], tools: ['verilog', 'vivado', 'c', 'python'] },
    ],
  },
  {
    id: 'other',
    name: '其他方向',
    items: ['区块链', '量子计算', '形式化验证'],
    subs: [
      { id: 'blockchain', name: '区块链', items: ['智能合约', '共识协议', '链上应用'], requires: ['distributed', 'security'], tools: ['solidity', 'rust', 'go'] },
      { id: 'quantum', name: '量子计算', items: ['量子比特', '量子算法', '量子编程'], requires: ['math', 'theory'], tools: ['python'] },
      { id: 'formal', name: '形式化验证', items: ['定理证明', '模型检验', '程序验证'], requires: ['theory', 'compiler'], tools: [] },
    ],
  },
]

export const SUBS = CATEGORIES.flatMap((c) => c.subs.map((s) => ({ ...s, category: c })))

// 工具层：具体的语言、框架和平台。被应用层直接用到。
// 工具层和能力块都按需求量排序：先看被几个细分方向用到，相同时按大众使用热度。
export const TOOL_GROUPS: { name: string; tools: Tool[] }[] = [
  {
    name: '编程语言',
    tools: [
      { id: 'python', name: 'Python', org: 'Python 基金会' },
      { id: 'cpp', name: 'C++', org: '贝尔实验室' },
      { id: 'shell', name: 'Shell', org: 'GNU' },
      { id: 'c', name: 'C', org: '贝尔实验室' },
      { id: 'go', name: 'Go', org: 'Google' },
      { id: 'sql', name: 'SQL', org: 'IBM' },
      { id: 'rust', name: 'Rust', org: 'Rust 基金会' },
      { id: 'asm', name: '汇编', org: 'Intel / ARM' },
      { id: 'typescript', name: 'TypeScript', org: 'Microsoft' },
      { id: 'javascript', name: 'JavaScript', org: 'Ecma' },
      { id: 'java', name: 'Java', org: 'Oracle' },
      { id: 'csharp', name: 'C#', org: 'Microsoft' },
      { id: 'kotlin', name: 'Kotlin', org: 'JetBrains' },
      { id: 'swift', name: 'Swift', org: 'Apple' },
      { id: 'verilog', name: 'Verilog', org: 'IEEE' },
      { id: 'solidity', name: 'Solidity', org: '以太坊基金会' },
    ],
  },
  {
    name: '框架与库',
    tools: [
      { id: 'numpy', name: 'NumPy', org: 'NumFOCUS' },
      { id: 'pandas', name: 'pandas', org: 'NumFOCUS' },
      { id: 'fastapi', name: 'FastAPI', org: '开源社区' },
      { id: 'pytorch', name: 'PyTorch', org: 'PyTorch 基金会' },
      { id: 'react', name: 'React', org: 'Meta' },
      { id: 'spring', name: 'Spring', org: 'Broadcom' },
      { id: 'django', name: 'Django', org: 'Django 基金会' },
      { id: 'vue', name: 'Vue', org: '尤雨溪' },
      { id: 'flutter', name: 'Flutter', org: 'Google' },
      { id: 'transformers', name: 'Transformers', org: 'Hugging Face' },
      { id: 'langchain', name: 'LangChain', org: 'LangChain' },
      { id: 'spark', name: 'Spark', org: 'Apache' },
      { id: 'qt', name: 'Qt', org: 'Qt Group' },
      { id: 'godot', name: 'Godot', org: 'Godot 基金会' },
    ],
  },
  {
    name: '平台与工具',
    tools: [
      { id: 'docker', name: 'Docker', org: 'Docker' },
      { id: 'postgres', name: 'PostgreSQL', org: '开源社区' },
      { id: 'nginx', name: 'Nginx', org: 'F5' },
      { id: 'nodejs', name: 'Node.js', org: 'OpenJS 基金会' },
      { id: 'redis', name: 'Redis', org: 'Redis' },
      { id: 'k8s', name: 'Kubernetes', org: 'CNCF' },
      { id: 'cuda', name: 'CUDA', org: 'NVIDIA' },
      { id: 'kafka', name: 'Kafka', org: 'Apache' },
      { id: 'terraform', name: 'Terraform', org: 'HashiCorp' },
      { id: 'prometheus', name: 'Prometheus', org: 'CNCF' },
      { id: 'llvm', name: 'LLVM', org: 'LLVM 基金会' },
      { id: 'wireshark', name: 'Wireshark', org: 'Wireshark 基金会' },
      { id: 'ros', name: 'ROS 2', org: 'Open Robotics' },
      { id: 'vivado', name: 'Vivado', org: 'AMD' },
      { id: 'ghidra', name: 'Ghidra', org: '美国 NSA' },
    ],
  },
]

// 能力块，从上往下显示
export const LAYERS: { name: string; blocks: Block[] }[] = [
  {
    name: '进阶层',
    blocks: [
      { id: 'distributed', name: '分布式系统', items: ['一致性', '容错', '共识算法'], requires: ['os', 'network', 'database'] },
      { id: 'security', name: '安全基础', items: ['内存漏洞', 'Web 漏洞', '密码学'], requires: ['organization', 'os', 'network'] },
      { id: 'hpc', name: '高性能计算', items: ['多线程', 'SIMD', 'GPU 编程'], requires: ['organization', 'os'] },
      { id: 'architecture', name: '体系结构', items: ['流水线', '乱序执行', '缓存一致性'], requires: ['organization'] },
      { id: 'ml', name: '机器学习', items: ['神经网络', '反向传播', 'Transformer'], requires: ['math', 'dsa'] },
      { id: 'theory', name: '计算理论', items: ['自动机', '可计算性', 'P 与 NP'], requires: ['math', 'dsa'] },
      { id: 'graphics', name: '图形学', items: ['光栅化', '光线追踪', '渲染管线'], requires: ['math', 'organization'] },
    ],
  },
  {
    name: '核心层',
    blocks: [
      { id: 'organization', name: '计算机组成', items: ['逻辑门', '指令集', '内存层次'], requires: ['programming'] },
      { id: 'dsa', name: '数据结构与算法', items: ['数据结构', '排序与搜索', '动态规划'], requires: ['math', 'programming'] },
      { id: 'os', name: '操作系统', items: ['进程与并发', '虚拟内存', '文件系统'], requires: ['organization'] },
      { id: 'network', name: '计算机网络', items: ['TCP/IP', 'HTTP', 'Socket 编程'], requires: ['programming'] },
      { id: 'swe', name: '软件工程', items: ['阅读大型代码', '测试', '模块设计'], requires: ['programming', 'tooling'] },
      { id: 'database', name: '数据库', items: ['SQL', '索引', '事务'], requires: ['dsa', 'os'] },
      { id: 'compiler', name: '编译原理', items: ['词法与语法分析', '类型系统', '代码生成'], requires: ['dsa', 'organization'] },
    ],
  },
  {
    name: '基础层',
    blocks: [
      { id: 'programming', name: '编程基础', items: ['变量与控制流', '函数与递归', '指针与内存'], requires: [] },
      { id: 'math', name: '数学基础', items: ['离散数学', '线性代数', '概率论'], requires: [] },
      { id: 'tooling', name: '工具链', items: ['Linux', 'Git', '调试器'], requires: [] },
    ],
  },
]

const BLOCK_BY_ID = new Map(LAYERS.flatMap((l) => l.blocks).map((b) => [b.id, b]))

/** 一组能力块连同它们所有的前置块 */
export function closure(ids: string[]): Set<string> {
  const seen = new Set<string>()
  const stack = [...ids]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(BLOCK_BY_ID.get(id)?.requires ?? []))
  }
  return seen
}
