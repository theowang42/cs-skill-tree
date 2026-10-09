// CS 能力树的全部内容。改内容只需要改这个文件。

export interface Block {
  id: string
  name: string
  /** 学什么，一两句话 */
  desc: string
  /** 直接前置能力块 */
  requires: string[]
}

export interface Category {
  id: string
  name: string
  /** 做什么，一两句话 */
  desc: string
  /** 需要的能力块（只写最高层的，前置会自动带上） */
  requires: string[]
}

export const CATEGORIES: Category[] = [
  { id: 'hardware', name: '硬件', desc: '用 Verilog 设计 CPU，给单片机和机器人写程序', requires: ['architecture', 'os'] },
  { id: 'systems', name: '系统', desc: '写操作系统、编译器、数据库这些底层软件', requires: ['os', 'plc', 'architecture', 'distributed', 'swe'] },
  { id: 'infra', name: '基础设施与数据', desc: '用 Kubernetes 部署和运维服务，处理海量数据', requires: ['distributed', 'math'] },
  { id: 'ai', name: 'AI', desc: '训练和部署模型，开发 Agent 应用', requires: ['ml', 'hpc', 'swe', 'network'] },
  { id: 'apps', name: '应用', desc: '做网页、服务端、手机和桌面软件、游戏', requires: ['swe', 'database', 'network', 'os', 'graphics', 'hpc'] },
  { id: 'security', name: '安全', desc: '找漏洞、做逆向，保护系统不被攻破', requires: ['security'] },
  { id: 'other', name: '其他方向', desc: '区块链、量子计算、形式化验证等交叉领域', requires: ['theory', 'plc', 'distributed', 'security', 'graphics'] },
]

// 从上往下显示
export const LAYERS: { name: string; blocks: Block[] }[] = [
  {
    name: '进阶层',
    blocks: [
      { id: 'theory', name: '计算理论', desc: '自动机、可计算性、P 与 NP', requires: ['math', 'dsa'] },
      { id: 'ml', name: '机器学习', desc: '神经网络、反向传播、Transformer', requires: ['math', 'dsa'] },
      { id: 'graphics', name: '图形学', desc: '光栅化、光线追踪、渲染管线', requires: ['math', 'organization'] },
      { id: 'architecture', name: '体系结构', desc: '流水线、乱序执行、缓存一致性', requires: ['organization'] },
      { id: 'hpc', name: '高性能计算', desc: '多线程、SIMD、GPU 与 CUDA 编程', requires: ['organization', 'os'] },
      { id: 'security', name: '安全', desc: '内存漏洞、Web 漏洞、密码学基础', requires: ['organization', 'os', 'network'] },
      { id: 'distributed', name: '分布式系统', desc: '一致性、容错、Raft 共识算法', requires: ['os', 'network', 'database'] },
    ],
  },
  {
    name: '核心层',
    blocks: [
      { id: 'dsa', name: '数据结构与算法', desc: '树、图、哈希表，排序、搜索、动态规划', requires: ['math', 'programming'] },
      { id: 'organization', name: '计算机组成', desc: '逻辑门、指令集、CPU 与内存层次', requires: ['programming'] },
      { id: 'os', name: '操作系统', desc: '进程、虚拟内存、文件系统、并发', requires: ['organization'] },
      { id: 'network', name: '计算机网络', desc: 'TCP/IP、HTTP、DNS，socket 编程', requires: ['os'] },
      { id: 'database', name: '数据库', desc: 'SQL、索引、事务、存储引擎', requires: ['dsa', 'os'] },
      { id: 'plc', name: '编程语言与编译', desc: '类型系统、语法解析，写一个解释器', requires: ['dsa', 'organization'] },
      { id: 'swe', name: '软件工程', desc: '读大型代码库、写测试、设计模块', requires: ['programming', 'tooling'] },
    ],
  },
  {
    name: '基础层',
    blocks: [
      { id: 'math', name: '数学基础', desc: '离散数学、线性代数、概率论', requires: [] },
      { id: 'programming', name: '编程基础', desc: '用 C 和 Python 独立写出完整程序', requires: [] },
      { id: 'tooling', name: '工具链', desc: 'Linux 命令行、Git、调试器', requires: [] },
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
