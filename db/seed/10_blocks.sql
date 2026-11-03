-- 能力块：层、块、前置、方块文字、面板内容、推荐公开课。
-- 改某个块的内容：搜它的 id（比如 'os'）。新增块：在它所在的层末尾加一行，position 递增。

INSERT INTO layers (id, name, position) VALUES
  ('foundation', '基础层', 1),
  ('core', '核心层', 2),
  ('advanced', '进阶层', 3);

-- ───────── 基础层 ─────────

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('programming', 'foundation', 1, '编程基础',
   '从零开始学写代码：让电脑按你的想法一步步做事。这是一切的起点。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('programming', 1, '变量与控制流'),
  ('programming', 2, '函数与递归'),
  ('programming', 3, '指针与内存');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('programming', 1, '变量、条件与循环'),
  ('programming', 2, '函数与递归'),
  ('programming', 3, '指针与内存管理'),
  ('programming', 4, '调试自己的程序');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('programming', 1, 'Harvard CS50 计算机科学导论', 'https://cs50.harvard.edu/x/'),
  ('programming', 2, 'UCB CS61A 程序的结构与解释（Python）', 'https://cs61a.org/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('tooling', 'foundation', 2, '工具链',
   '程序员每天都在用的工具：命令行、Git、调试器。还有怎么参与开源项目、给别人的项目提交代码。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('tooling', 1, 'Linux'),
  ('tooling', 2, 'Git'),
  ('tooling', 3, '调试器');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('tooling', 1, 'Shell 与命令行'),
  ('tooling', 2, 'Git 版本控制'),
  ('tooling', 3, '编辑器与调试器'),
  ('tooling', 4, '提 PR 与代码评审');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('tooling', 1, 'MIT Missing Semester 计算机教育中缺失的一课', 'https://missing.csail.mit.edu/'),
  ('tooling', 2, 'Pro Git（免费中文版）', 'https://git-scm.com/book/zh/v2');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('math', 'foundation', 3, '数学基础',
   'CS 要用到的数学：逻辑证明、计数、概率和矩阵。不用学得很深，但很多方向都绕不开它。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('math', 1, '离散数学'),
  ('math', 2, '线性代数'),
  ('math', 3, '概率论');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('math', 1, '逻辑与证明'),
  ('math', 2, '集合、图论与组合计数'),
  ('math', 3, '概率论'),
  ('math', 4, '线性代数');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('math', 1, 'MIT 6.042J 计算机科学中的数学', 'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/'),
  ('math', 2, 'UCB CS70 离散数学与概率论', 'http://www.eecs70.org/'),
  ('math', 3, 'MIT 18.06 线性代数', 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/');

-- ───────── 核心层 ─────────

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('dsa', 'core', 1, '数据结构与算法',
   '写程序的基本功：怎么组织数据、怎么设计步骤，让程序又快又省内存。面试必考。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('dsa', 1, '数据结构'),
  ('dsa', 2, '排序与搜索'),
  ('dsa', 3, '动态规划');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('dsa', 'math'),
  ('dsa', 'programming');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('dsa', 1, '数组、链表、栈与队列'),
  ('dsa', 2, '树、堆、哈希表与图'),
  ('dsa', 3, '排序与搜索'),
  ('dsa', 4, '贪心与动态规划'),
  ('dsa', 5, '复杂度分析');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('dsa', 1, 'UCB CS61B 数据结构', 'https://sp24.datastructur.es/'),
  ('dsa', 2, 'Princeton 算法（Coursera）', 'https://www.coursera.org/learn/algorithms-part1'),
  ('dsa', 3, 'MIT 6.006 算法导论', 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('organization', 'core', 2, '计算机组成',
   '从最简单的电路开始，一步步搭出一台计算机。学完你会明白，你写的代码在硬件上到底是怎么跑的。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('organization', 1, '逻辑门'),
  ('organization', 2, '指令集'),
  ('organization', 3, '内存层次');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('organization', 'programming');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('organization', 1, '二进制与数字逻辑'),
  ('organization', 2, '指令集与汇编'),
  ('organization', 3, 'CPU 数据通路'),
  ('organization', 4, '缓存与内存层次');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('organization', 1, 'Nand2Tetris 从与非门造一台计算机', 'https://www.nand2tetris.org/'),
  ('organization', 2, 'UCB CS61C 计算机组成', 'https://cs61c.org/'),
  ('organization', 3, 'CMU 15-213 深入理解计算机系统（CSAPP）', 'https://www.cs.cmu.edu/~213/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('os', 'core', 3, '操作系统',
   '操作系统是电脑的“大管家”，管着 CPU、内存和硬盘，让你同时开浏览器、听歌、写代码也不会乱套。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('os', 1, '进程与并发'),
  ('os', 2, '虚拟内存'),
  ('os', 3, '文件系统');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('os', 'organization');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('os', 1, '进程与线程'),
  ('os', 2, 'CPU 调度'),
  ('os', 3, '虚拟内存'),
  ('os', 4, '文件系统'),
  ('os', 5, '并发与锁');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('os', 1, 'MIT 6.1810（原 6.S081）操作系统', 'https://pdos.csail.mit.edu/6.1810/'),
  ('os', 2, '南京大学 操作系统（蒋炎岩）', 'https://jyywiki.cn/OS/2022/index.html'),
  ('os', 3, 'UCB CS162 操作系统', 'https://cs162.org/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('swe', 'core', 4, '软件工程',
   '一个人写小程序很简单，一群人维护一个大项目才难。这里学的是怎么让代码好读、好改、不容易出错。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('swe', 1, '阅读大型代码'),
  ('swe', 2, '测试'),
  ('swe', 3, '模块设计');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('swe', 'programming'),
  ('swe', 'tooling');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('swe', 1, '阅读和理解大型代码库'),
  ('swe', 2, '单元测试与集成测试'),
  ('swe', 3, '模块化与接口设计'),
  ('swe', 4, '代码评审与重构');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('swe', 1, 'MIT 6.031 软件构造', 'https://web.mit.edu/6.031/'),
  ('swe', 2, 'UCB CS169 软件工程', 'http://www.saasbook.info/courses');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('network', 'core', 5, '计算机网络',
   '数据是怎么从你的电脑跑到地球另一端的服务器，再安全地跑回来的。打开一个网页的背后，藏着一整套规则。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('network', 1, 'TCP/IP'),
  ('network', 2, 'HTTP'),
  ('network', 3, 'Socket 编程');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('network', 'programming');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('network', 1, '分层模型'),
  ('network', 2, 'TCP/IP 与可靠传输'),
  ('network', 3, 'HTTP、DNS 与 TLS'),
  ('network', 4, 'Socket 编程');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('network', 1, 'Stanford CS144 计算机网络', 'https://cs144.github.io/'),
  ('network', 2, '《计算机网络：自顶向下方法》配套资源', 'https://gaia.cs.umass.edu/kurose_ross/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('database', 'core', 6, '数据库',
   '专门用来存数据、查数据的软件是怎么做出来的：怎样又快又可靠地在海量数据里找到想要的那一条。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('database', 1, 'SQL'),
  ('database', 2, '索引'),
  ('database', 3, '事务');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('database', 'dsa');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('database', 1, '关系模型与 SQL'),
  ('database', 2, 'B+ 树与索引'),
  ('database', 3, '查询执行与优化'),
  ('database', 4, '事务与并发控制'),
  ('database', 5, '故障恢复');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('database', 1, 'CMU 15-445 数据库系统', 'https://15445.courses.cs.cmu.edu/'),
  ('database', 2, 'UCB CS186 数据库系统', 'https://cs186berkeley.net/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('compiler', 'core', 7, '编译原理',
   '编译器是“翻译官”，把人写的代码翻译成机器能懂的指令。学完你可以自己设计一门小语言。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('compiler', 1, '词法与语法分析'),
  ('compiler', 2, '类型系统'),
  ('compiler', 3, '代码生成');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('compiler', 'dsa'),
  ('compiler', 'organization');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('compiler', 1, '词法分析与语法分析'),
  ('compiler', 2, '抽象语法树'),
  ('compiler', 3, '类型检查'),
  ('compiler', 4, '中间代码与代码生成');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('compiler', 1, '北京大学 编译原理实践', 'https://pku-minic.github.io/online-doc/#/'),
  ('compiler', 2, 'Stanford CS143 编译原理', 'https://web.stanford.edu/class/cs143/');

-- ───────── 进阶层 ─────────

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('distributed', 'advanced', 1, '分布式系统',
   '让成百上千台机器像一台机器一样协同工作，就算其中几台坏了，服务也不受影响。大型网站都靠它。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('distributed', 1, '一致性'),
  ('distributed', 2, '容错'),
  ('distributed', 3, '共识算法');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('distributed', 'os'),
  ('distributed', 'network');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('distributed', 1, '复制与一致性'),
  ('distributed', 2, '容错与故障检测'),
  ('distributed', 3, 'Raft 共识算法'),
  ('distributed', 4, '分布式事务');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('distributed', 1, 'MIT 6.5840（原 6.824）分布式系统', 'https://pdos.csail.mit.edu/6.824/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('security', 'advanced', 2, '安全基础',
   '搞清楚系统为什么会被黑：常见漏洞是怎么产生的、怎么被利用、又该怎么防。也会学加密的基本原理。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('security', 1, '内存漏洞'),
  ('security', 2, 'Web 漏洞'),
  ('security', 3, '密码学');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('security', 'organization'),
  ('security', 'os'),
  ('security', 'network');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('security', 1, '内存安全漏洞（栈溢出等）'),
  ('security', 2, 'Web 安全（注入、XSS）'),
  ('security', 3, '密码学基础'),
  ('security', 4, '网络攻防');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('security', 1, 'UCB CS161 计算机安全', 'https://su20.cs161.org/'),
  ('security', 2, 'MIT 6.858 计算机系统安全', 'http://css.csail.mit.edu/6.858/2022/'),
  ('security', 3, 'pwn.college 攻防练习（ASU CSE365）', 'https://pwn.college/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('architecture', 'advanced', 3, '体系结构',
   '深入 CPU 内部，看它用了哪些巧妙的设计，把指令执行得又快又对。想设计芯片就要学它。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('architecture', 1, '流水线'),
  ('architecture', 2, '乱序执行'),
  ('architecture', 3, '缓存一致性');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('architecture', 'organization');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('architecture', 1, '流水线与冒险'),
  ('architecture', 2, '分支预测与乱序执行'),
  ('architecture', 3, '缓存与一致性协议'),
  ('architecture', 4, '多核与内存模型');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('architecture', 1, 'ETH 计算机体系结构（Onur Mutlu）', 'https://safari.ethz.ch/architecture/fall2022/doku.php?id=start'),
  ('architecture', 2, '一生一芯', 'https://ysyx.org/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('hpc', 'advanced', 4, '高性能计算',
   '让程序跑得飞快：同时用上 CPU 的多个核心，或者调动显卡（GPU）的几千个核心一起算。AI 训练离不开它。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('hpc', 1, '多线程'),
  ('hpc', 2, 'SIMD'),
  ('hpc', 3, 'GPU 编程');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('hpc', 'organization'),
  ('hpc', 'os');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('hpc', 1, '多线程与同步'),
  ('hpc', 2, 'SIMD 向量化'),
  ('hpc', 3, 'GPU 与 CUDA 编程'),
  ('hpc', 4, '性能分析与调优');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('hpc', 1, 'CMU 15-418 / Stanford CS149 并行计算', 'https://gfxcourses.stanford.edu/cs149/fall21'),
  ('hpc', 2, 'MIT 6.172 软件性能工程', 'https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('ml', 'advanced', 5, '机器学习',
   '教电脑从数据里找规律，而不是由人一条条写规则。ChatGPT、人脸识别、推荐系统都建立在它之上。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('ml', 1, '神经网络'),
  ('ml', 2, '反向传播'),
  ('ml', 3, 'Transformer');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('ml', 'math'),
  ('ml', 'dsa');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('ml', 1, '监督学习与模型评估'),
  ('ml', 2, '神经网络与反向传播'),
  ('ml', 3, '卷积网络'),
  ('ml', 4, 'Transformer 与大模型');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('ml', 1, '吴恩达 机器学习（Coursera）', 'https://www.coursera.org/specializations/machine-learning-introduction'),
  ('ml', 2, '台湾大学 李宏毅 机器学习（中文）', 'https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php'),
  ('ml', 3, 'Stanford CS231n 深度学习与视觉', 'https://cs231n.stanford.edu/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('theory', 'advanced', 6, '计算理论',
   '研究“计算”本身的极限：哪些问题电脑永远算不出来，哪些问题算得出但要花很久。偏理论，可以晚点再学。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('theory', 1, '自动机'),
  ('theory', 2, '可计算性'),
  ('theory', 3, 'P 与 NP');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('theory', 'math'),
  ('theory', 'dsa');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('theory', 1, '有限自动机与正则语言'),
  ('theory', 2, '上下文无关文法'),
  ('theory', 3, '图灵机与可计算性'),
  ('theory', 4, '复杂度类 P、NP 与 NP 完全');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('theory', 1, 'MIT 18.404J 计算理论', 'https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/');

INSERT INTO blocks (id, layer_id, position, name, intro) VALUES
  ('graphics', 'advanced', 7, '图形学',
   '研究电脑怎么“画画”：从一堆三角形，算出游戏和电影里逼真的画面和光影。');
INSERT INTO block_items (block_id, position, text) VALUES
  ('graphics', 1, '光栅化'),
  ('graphics', 2, '光线追踪'),
  ('graphics', 3, '渲染管线');
INSERT INTO block_prerequisites (block_id, prerequisite_id) VALUES
  ('graphics', 'math'),
  ('graphics', 'organization');
INSERT INTO block_topics (block_id, position, text) VALUES
  ('graphics', 1, '变换与投影'),
  ('graphics', 2, '光栅化与深度测试'),
  ('graphics', 3, '着色与纹理'),
  ('graphics', 4, '光线追踪');
INSERT INTO block_courses (block_id, position, label, url) VALUES
  ('graphics', 1, 'GAMES101 现代计算机图形学入门（中文）', 'https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html');
