// CS 能力树的全部内容。改内容只需要改这个文件。

export type LayerId = 'foundation' | 'core' | 'advanced'

export interface Layer {
  id: LayerId
  name: string
  desc: string
}

export interface Block {
  id: string
  name: string
  layer: LayerId
  /** 掌握后你能… */
  summary: string
  /** 直接前置能力块 */
  requires: string[]
}

export interface Direction {
  name: string
  /** 难度，[最低, 最高]，1-5 星 */
  difficulty: [number, number]
  /** 包含的子方向 */
  subs: string[]
  /** 代表开源项目 */
  projects: string[]
  /** 依赖的能力块（只写最高层的，前置会自动带上） */
  requires: string[]
}

export interface Category {
  id: string
  index: string
  name: string
  summary: string
  directions: Direction[]
  /** 默认折叠的大类 */
  minor?: boolean
}

export const LEVELS = ['未开始', '了解', '入门', '熟练', '精通'] as const

/** 达到这一档才算"掌握"了某个能力块 */
export const MASTERED_LEVEL = 3

// 从上往下的显示顺序
export const LAYERS: Layer[] = [
  { id: 'advanced', name: '进阶层', desc: '面向具体领域的深入能力' },
  { id: 'core', name: '核心层', desc: 'CS 本科核心，几乎所有方向都绕不开' },
  { id: 'foundation', name: '基础层', desc: '一切的起点' },
]

// 同一层内按数组顺序从左到右排列，顺序经过调整以减少连线交叉
export const BLOCKS: Block[] = [
  // 基础层
  { id: 'math', name: '数学基础', layer: 'foundation', summary: '读懂证明，会用离散数学、线性代数、概率和微积分', requires: [] },
  { id: 'programming', name: '编程基础', layer: 'foundation', summary: '用 C 和一门高级语言独立写出完整程序', requires: [] },
  { id: 'tooling', name: '工具链与开源协作', layer: 'foundation', summary: '熟练使用 Linux、Git、调试器；会提 PR、参与代码评审、读英文文档', requires: [] },

  // 核心层
  { id: 'dsa', name: '数据结构与算法', layer: 'core', summary: '选对数据结构，分析复杂度，写出高效算法', requires: ['math', 'programming'] },
  { id: 'organization', name: '数字电路与计算机组成', layer: 'core', summary: '从逻辑门推到 CPU，说清指令怎么执行，懂缓存和内存层次', requires: ['programming'] },
  { id: 'os', name: '操作系统', layer: 'core', summary: '理解进程、虚拟内存、文件系统和并发', requires: ['organization'] },
  { id: 'network', name: '计算机网络', layer: 'core', summary: '说清从输入网址到页面打开的全过程，能写 socket 程序', requires: ['os'] },
  { id: 'database', name: '数据库系统', layer: 'core', summary: '会建模和写 SQL，懂索引、事务和存储引擎', requires: ['dsa', 'os'] },
  { id: 'plc', name: '编程语言与编译', layer: 'core', summary: '理解类型系统和多种范式，能写解释器或编译器', requires: ['dsa', 'organization'] },
  { id: 'swe', name: '软件工程与设计', layer: 'core', summary: '读懂大型代码库，设计模块，写测试，持续维护项目', requires: ['programming', 'tooling'] },

  // 进阶层
  { id: 'theory', name: '计算理论', layer: 'advanced', summary: '理解可计算性和复杂度，知道问题的边界（理论向，可选）', requires: ['math', 'dsa'] },
  { id: 'ml', name: '机器学习与深度学习', layer: 'advanced', summary: '从零实现神经网络，理解 Transformer 和大模型原理', requires: ['math', 'dsa'] },
  { id: 'graphics', name: '计算机图形学', layer: 'advanced', summary: '写出光栅化器或光线追踪器，懂渲染管线', requires: ['math', 'organization'] },
  { id: 'architecture', name: '计算机体系结构', layer: 'advanced', summary: '理解流水线、乱序执行、缓存一致性，能设计处理器', requires: ['organization'] },
  { id: 'hpc', name: '并行与高性能计算', layer: 'advanced', summary: '用 SIMD、多核和 GPU（CUDA）优化程序', requires: ['organization', 'os'] },
  { id: 'security', name: '计算机安全', layer: 'advanced', summary: '理解内存漏洞、Web 漏洞和密码学，会做攻防分析', requires: ['organization', 'os', 'network'] },
  { id: 'distributed', name: '分布式系统', layer: 'advanced', summary: '理解一致性、容错和 Raft，能设计可扩展的服务', requires: ['os', 'network', 'database'] },
]

export const CATEGORIES: Category[] = [
  {
    id: 'hardware',
    index: '①',
    name: '硬件',
    summary: '设计芯片，或让软件直接控制物理世界',
    directions: [
      { name: '芯片设计', difficulty: [5, 5], subs: ['FPGA', 'EDA 工具', 'RISC-V'], projects: ['香山 XiangShan', 'Chisel', 'Verilator'], requires: ['architecture'] },
      { name: '嵌入式与机器人', difficulty: [3, 3], subs: ['物联网', 'RTOS', '自动驾驶', '无人机'], projects: ['Zephyr', 'RT-Thread', 'ROS 2', 'PX4'], requires: ['organization', 'os'] },
    ],
  },
  {
    id: 'systems',
    index: '②',
    name: '系统',
    summary: '构建所有软件运行的底座',
    directions: [
      { name: '操作系统内核与虚拟化', difficulty: [5, 5], subs: ['内核', '驱动', 'eBPF', '虚拟机', '容器'], projects: ['Linux', 'QEMU', 'Firecracker', 'runc'], requires: ['os', 'organization'] },
      { name: 'Linux 发行版与桌面', difficulty: [2, 3], subs: ['打包', '系统集成', '桌面环境', '窗口管理器', '国产 OS'], projects: ['Omarchy', 'Arch Linux', 'NixOS', 'Hyprland', 'KDE', 'deepin'], requires: ['os', 'tooling', 'swe'] },
      { name: '编译器与编程语言', difficulty: [4, 4], subs: ['编译器', '语言运行时', 'WebAssembly'], projects: ['LLVM', 'Rust', 'CPython', 'Wasmtime'], requires: ['plc', 'architecture'] },
      { name: '数据库与存储', difficulty: [4, 4], subs: ['数据库内核', '分布式存储', '文件系统'], projects: ['PostgreSQL', 'SQLite', 'DuckDB', 'TiKV', 'Ceph'], requires: ['database', 'distributed'] },
    ],
  },
  {
    id: 'infra',
    index: '③',
    name: '基础设施与数据',
    summary: '让服务稳定运行，让数据产生价值',
    directions: [
      { name: '云原生与运维', difficulty: [3, 3], subs: ['Kubernetes 生态', '网络代理', 'SRE', '可观测性'], projects: ['Kubernetes', 'Envoy', 'Nginx', 'Prometheus', 'Grafana'], requires: ['distributed', 'network', 'tooling'] },
      { name: '大数据与数据科学', difficulty: [2, 3], subs: ['批处理', '流处理', '数据分析', '科学计算'], projects: ['Spark', 'Flink', 'Kafka', 'pandas', 'NumPy'], requires: ['database', 'math'] },
    ],
  },
  {
    id: 'ai',
    index: '④',
    name: 'AI',
    summary: '训练、优化和使用智能模型',
    directions: [
      { name: 'AI 系统', difficulty: [4, 4], subs: ['训练框架', '推理优化', 'AI 编译器'], projects: ['PyTorch', 'vLLM', 'llama.cpp', 'Triton'], requires: ['ml', 'hpc'] },
      { name: 'AI 算法', difficulty: [4, 4], subs: ['大模型', '计算机视觉', '语音', '搜索推荐'], projects: ['Transformers', 'Diffusers', 'Milvus'], requires: ['ml'] },
      { name: 'AI 应用与 Agent', difficulty: [2, 2], subs: ['Agent', 'RAG', 'MCP 工具'], projects: ['MCP 生态', 'OpenHands', 'LangGraph', 'browser-use'], requires: ['swe', 'network', 'ml'] },
    ],
  },
  {
    id: 'apps',
    index: '⑤',
    name: '应用',
    summary: '做出用户和开发者每天在用的软件',
    directions: [
      { name: 'Web 前端', difficulty: [2, 2], subs: ['框架', '工程化', '可视化', '浏览器引擎（进阶）'], projects: ['React', 'Vue', 'Vite', 'Servo'], requires: ['swe', 'network'] },
      { name: '后端开发', difficulty: [2, 2], subs: ['Web 框架', 'API', '微服务'], projects: ['Django', 'FastAPI', 'Spring', 'Gin'], requires: ['database', 'network', 'swe'] },
      { name: '客户端开发', difficulty: [2, 2], subs: ['桌面', 'iOS', 'Android', '跨平台'], projects: ['Flutter', 'Tauri', 'Electron'], requires: ['swe', 'os'] },
      { name: '图形、游戏与多媒体', difficulty: [3, 3], subs: ['游戏引擎', '渲染', '3D 建模', '音视频'], projects: ['Godot', 'Bevy', 'Blender', 'FFmpeg'], requires: ['graphics', 'hpc'] },
      { name: '开发者工具与测试', difficulty: [2, 2], subs: ['编辑器', '版本控制', '构建系统', '测试框架'], projects: ['VS Code', 'Neovim', 'Git', 'Playwright'], requires: ['swe', 'tooling'] },
    ],
  },
  {
    id: 'security',
    index: '⑥',
    name: '安全',
    summary: '找出系统的弱点，并把它们补上',
    directions: [
      { name: '安全', difficulty: [4, 4], subs: ['漏洞研究', '逆向工程', '模糊测试', '密码学'], projects: ['OSS-Fuzz', 'Ghidra', 'Wireshark', 'OpenSSL'], requires: ['security'] },
    ],
  },
  {
    id: 'other',
    index: '⑦',
    name: '其他方向',
    summary: '小众或交叉领域，以后可以升级为主方向',
    minor: true,
    directions: [
      { name: '区块链', difficulty: [4, 4], subs: ['智能合约', '共识协议'], projects: ['geth', 'reth'], requires: ['distributed', 'security'] },
      { name: '量子计算', difficulty: [4, 4], subs: ['量子算法', '量子编程框架'], projects: ['Qiskit'], requires: ['math', 'theory'] },
      { name: '形式化验证', difficulty: [5, 5], subs: ['定理证明', '模型检验'], projects: ['Lean', 'Rocq', 'TLA+'], requires: ['theory', 'plc'] },
      { name: '生物信息学', difficulty: [3, 3], subs: ['基因组分析', '蛋白质结构'], projects: ['Biopython'], requires: ['dsa', 'math'] },
      { name: '地理信息系统', difficulty: [3, 3], subs: ['地图渲染', '空间数据'], projects: ['QGIS'], requires: ['database', 'graphics'] },
    ],
  },
]

const BLOCK_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]))

export function getBlock(id: string): Block {
  const b = BLOCK_BY_ID.get(id)
  if (!b) throw new Error(`未知能力块: ${id}`)
  return b
}

/** 一组能力块连同它们所有的前置块 */
export function closure(ids: string[]): Set<string> {
  const seen = new Set<string>()
  const stack = [...ids]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...getBlock(id).requires)
  }
  return seen
}
