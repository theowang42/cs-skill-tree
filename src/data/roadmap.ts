// CS 能力树的全部内容。改内容只需要改这个文件。

export interface Block {
  id: string
  name: string
  /** 学什么，每项一行 */
  items: string[]
  /** 直接前置能力块 */
  requires: string[]
}

export interface Category {
  id: string
  name: string
  /** 做什么，每项一行 */
  items: string[]
  /** 需要的能力块（只写最高层的，前置会自动带上） */
  requires: string[]
  /** 需要的语言和工具 */
  tools: string[]
}

export interface Tool {
  id: string
  name: string
  /** 出品或维护它的公司、组织 */
  org: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'hardware',
    name: '硬件',
    items: ['芯片设计', '嵌入式', '机器人'],
    requires: ['architecture', 'os'],
    tools: ['c', 'cpp', 'asm', 'verilog', 'python', 'vivado', 'ros'],
  },
  {
    id: 'systems',
    name: '系统',
    items: ['操作系统', '编译器', '数据库内核'],
    requires: ['os', 'compiler', 'architecture', 'distributed', 'swe'],
    tools: ['c', 'cpp', 'rust', 'go', 'asm', 'shell', 'llvm', 'docker'],
  },
  {
    id: 'infra',
    name: '基础设施与数据',
    items: ['云原生', '运维', '大数据'],
    requires: ['distributed', 'swe', 'math'],
    tools: ['go', 'java', 'python', 'sql', 'shell', 'pandas', 'spark', 'docker', 'k8s', 'nginx', 'postgres', 'redis', 'kafka', 'prometheus', 'terraform'],
  },
  {
    id: 'ai',
    name: 'AI',
    items: ['模型训练', '推理部署', 'Agent 开发'],
    requires: ['ml', 'hpc', 'swe', 'network'],
    tools: ['python', 'cpp', 'typescript', 'numpy', 'pytorch', 'transformers', 'langchain', 'cuda', 'docker'],
  },
  {
    id: 'apps',
    name: '应用',
    items: ['Web 前后端', '客户端', '游戏与多媒体'],
    requires: ['swe', 'database', 'network', 'os', 'graphics', 'hpc'],
    tools: [
      'javascript', 'typescript', 'java', 'kotlin', 'swift', 'csharp', 'go', 'python', 'sql', 'cpp',
      'react', 'vue', 'spring', 'django', 'fastapi', 'flutter', 'qt', 'godot',
      'nodejs', 'nginx', 'postgres', 'redis', 'docker',
    ],
  },
  {
    id: 'security',
    name: '安全',
    items: ['漏洞挖掘', '逆向工程', '攻防对抗'],
    requires: ['security', 'compiler'],
    tools: ['c', 'asm', 'python', 'javascript', 'shell', 'wireshark', 'ghidra'],
  },
  {
    id: 'other',
    name: '其他方向',
    items: ['区块链', '量子计算', '形式化验证'],
    requires: ['theory', 'compiler', 'distributed', 'security'],
    tools: ['solidity', 'rust', 'python'],
  },
]

// 工具层：具体的语言、框架和平台。被应用层直接用到。
export const TOOL_GROUPS: { name: string; tools: Tool[] }[] = [
  {
    name: '编程语言',
    tools: [
      { id: 'c', name: 'C', org: '贝尔实验室' },
      { id: 'cpp', name: 'C++', org: '贝尔实验室' },
      { id: 'rust', name: 'Rust', org: 'Rust 基金会' },
      { id: 'go', name: 'Go', org: 'Google' },
      { id: 'java', name: 'Java', org: 'Oracle' },
      { id: 'kotlin', name: 'Kotlin', org: 'JetBrains' },
      { id: 'swift', name: 'Swift', org: 'Apple' },
      { id: 'csharp', name: 'C#', org: 'Microsoft' },
      { id: 'python', name: 'Python', org: 'Python 基金会' },
      { id: 'javascript', name: 'JavaScript', org: 'Ecma' },
      { id: 'typescript', name: 'TypeScript', org: 'Microsoft' },
      { id: 'sql', name: 'SQL', org: 'IBM' },
      { id: 'shell', name: 'Shell', org: 'GNU' },
      { id: 'asm', name: '汇编', org: 'Intel / ARM' },
      { id: 'verilog', name: 'Verilog', org: 'IEEE' },
      { id: 'solidity', name: 'Solidity', org: '以太坊基金会' },
    ],
  },
  {
    name: '框架与库',
    tools: [
      { id: 'react', name: 'React', org: 'Meta' },
      { id: 'vue', name: 'Vue', org: '尤雨溪' },
      { id: 'spring', name: 'Spring', org: 'Broadcom' },
      { id: 'django', name: 'Django', org: 'Django 基金会' },
      { id: 'fastapi', name: 'FastAPI', org: '开源社区' },
      { id: 'flutter', name: 'Flutter', org: 'Google' },
      { id: 'qt', name: 'Qt', org: 'Qt Group' },
      { id: 'godot', name: 'Godot', org: 'Godot 基金会' },
      { id: 'numpy', name: 'NumPy', org: 'NumFOCUS' },
      { id: 'pandas', name: 'pandas', org: 'NumFOCUS' },
      { id: 'pytorch', name: 'PyTorch', org: 'PyTorch 基金会' },
      { id: 'transformers', name: 'Transformers', org: 'Hugging Face' },
      { id: 'langchain', name: 'LangChain', org: 'LangChain' },
      { id: 'spark', name: 'Spark', org: 'Apache' },
    ],
  },
  {
    name: '平台与工具',
    tools: [
      { id: 'nodejs', name: 'Node.js', org: 'OpenJS 基金会' },
      { id: 'docker', name: 'Docker', org: 'Docker' },
      { id: 'k8s', name: 'Kubernetes', org: 'CNCF' },
      { id: 'nginx', name: 'Nginx', org: 'F5' },
      { id: 'postgres', name: 'PostgreSQL', org: '开源社区' },
      { id: 'redis', name: 'Redis', org: 'Redis' },
      { id: 'kafka', name: 'Kafka', org: 'Apache' },
      { id: 'prometheus', name: 'Prometheus', org: 'CNCF' },
      { id: 'terraform', name: 'Terraform', org: 'HashiCorp' },
      { id: 'cuda', name: 'CUDA', org: 'NVIDIA' },
      { id: 'llvm', name: 'LLVM', org: 'LLVM 基金会' },
      { id: 'vivado', name: 'Vivado', org: 'AMD' },
      { id: 'ros', name: 'ROS 2', org: 'Open Robotics' },
      { id: 'wireshark', name: 'Wireshark', org: 'Wireshark 基金会' },
      { id: 'ghidra', name: 'Ghidra', org: '美国 NSA' },
    ],
  },
]

// 能力块，从上往下显示
export const LAYERS: { name: string; blocks: Block[] }[] = [
  {
    name: '进阶层',
    blocks: [
      { id: 'theory', name: '计算理论', items: ['自动机', '可计算性', 'P 与 NP'], requires: ['math', 'dsa'] },
      { id: 'ml', name: '机器学习', items: ['神经网络', '反向传播', 'Transformer'], requires: ['math', 'dsa'] },
      { id: 'graphics', name: '图形学', items: ['光栅化', '光线追踪', '渲染管线'], requires: ['math', 'organization'] },
      { id: 'architecture', name: '体系结构', items: ['流水线', '乱序执行', '缓存一致性'], requires: ['organization'] },
      { id: 'hpc', name: '高性能计算', items: ['多线程', 'SIMD', 'GPU 编程'], requires: ['organization', 'os'] },
      { id: 'security', name: '安全', items: ['内存漏洞', 'Web 漏洞', '密码学'], requires: ['organization', 'os', 'network'] },
      { id: 'distributed', name: '分布式系统', items: ['一致性', '容错', '共识算法'], requires: ['os', 'network', 'database'] },
    ],
  },
  {
    name: '核心层',
    blocks: [
      { id: 'dsa', name: '数据结构与算法', items: ['数据结构', '排序与搜索', '动态规划'], requires: ['math', 'programming'] },
      { id: 'organization', name: '计算机组成', items: ['逻辑门', '指令集', '内存层次'], requires: ['programming'] },
      { id: 'os', name: '操作系统', items: ['进程与并发', '虚拟内存', '文件系统'], requires: ['organization'] },
      { id: 'network', name: '计算机网络', items: ['TCP/IP', 'HTTP', 'Socket 编程'], requires: ['os'] },
      { id: 'database', name: '数据库', items: ['SQL', '索引', '事务'], requires: ['dsa', 'os'] },
      { id: 'compiler', name: '编译原理', items: ['词法与语法分析', '类型系统', '代码生成'], requires: ['dsa', 'organization'] },
      { id: 'swe', name: '软件工程', items: ['阅读大型代码', '测试', '模块设计'], requires: ['programming', 'tooling'] },
    ],
  },
  {
    name: '基础层',
    blocks: [
      { id: 'math', name: '数学基础', items: ['离散数学', '线性代数', '概率论'], requires: [] },
      { id: 'programming', name: '编程基础', items: ['变量与控制流', '函数与递归', '指针与内存'], requires: [] },
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
