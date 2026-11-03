-- 层和知识领域。领域的顺序就是页面上从左到右的顺序：越多方向用到、越基础的越靠左。
-- 公开课主要参考 CS 自学指南 csdiy.wiki。

INSERT INTO layers (id, name, position) VALUES
  ('foundation', '基础层', 1),
  ('core',       '核心层', 2),
  ('advanced',   '进阶层', 3);

-- ───────── 基础层 ─────────

INSERT INTO area_rows VALUES ('programming', 'foundation', '编程基础',
  '从零开始学写代码：让电脑按你的想法一步步做事。这是一切的起点。',
  '[["Harvard CS50 计算机科学导论", "https://cs50.harvard.edu/x/"],
    ["UCB CS61A 程序的结构与解释（Python）", "https://cs61a.org/"]]');

INSERT INTO area_rows VALUES ('tooling', 'foundation', '工具链',
  '程序员每天都在用的工具：命令行、Git、调试器、构建工具。还有怎么参与开源项目。',
  '[["MIT Missing Semester 计算机教育中缺失的一课", "https://missing.csail.mit.edu/"],
    ["Pro Git（免费中文版）", "https://git-scm.com/book/zh/v2"]]');

INSERT INTO area_rows VALUES ('math', 'foundation', '数学基础',
  'CS 要用到的数学：逻辑证明、计数、概率和矩阵。不用学得很深，但很多方向都绕不开它。',
  '[["MIT 6.042J 计算机科学中的数学", "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/"],
    ["UCB CS70 离散数学与概率论", "http://www.eecs70.org/"],
    ["MIT 18.06 线性代数", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"]]');

-- ───────── 核心层 ─────────

INSERT INTO area_rows VALUES ('dsa', 'core', '数据结构与算法',
  '写程序的基本功：怎么组织数据、怎么设计步骤，让程序又快又省内存。面试必考。',
  '[["UCB CS61B 数据结构", "https://sp24.datastructur.es/"],
    ["Princeton 算法（Coursera）", "https://www.coursera.org/learn/algorithms-part1"],
    ["MIT 6.006 算法导论", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"]]');

INSERT INTO area_rows VALUES ('swe', 'core', '软件工程',
  '一个人写小程序很简单，一群人维护一个大项目才难。这里学的是怎么让代码好读、好改、不容易出错。',
  '[["MIT 6.031 软件构造", "https://web.mit.edu/6.031/"],
    ["UCB CS169 软件工程", "http://www.saasbook.info/courses"]]');

INSERT INTO area_rows VALUES ('network', 'core', '计算机网络',
  '数据是怎么从你的电脑跑到地球另一端的服务器，再安全地跑回来的。打开一个网页的背后，藏着一整套规则。',
  '[["Stanford CS144 计算机网络", "https://cs144.github.io/"],
    ["《计算机网络：自顶向下方法》配套资源", "https://gaia.cs.umass.edu/kurose_ross/"]]');

INSERT INTO area_rows VALUES ('organization', 'core', '计算机组成',
  '从最简单的电路开始，一步步搭出一台计算机。学完你会明白，你写的代码在硬件上到底是怎么跑的。',
  '[["Nand2Tetris 从与非门造一台计算机", "https://www.nand2tetris.org/"],
    ["UCB CS61C 计算机组成", "https://cs61c.org/"],
    ["CMU 15-213 深入理解计算机系统（CSAPP）", "https://www.cs.cmu.edu/~213/"]]');

INSERT INTO area_rows VALUES ('os', 'core', '操作系统',
  '操作系统是电脑的“大管家”，管着 CPU、内存和硬盘，让你同时开浏览器、听歌、写代码也不会乱套。',
  '[["MIT 6.1810（原 6.S081）操作系统", "https://pdos.csail.mit.edu/6.1810/"],
    ["南京大学 操作系统（蒋炎岩）", "https://jyywiki.cn/OS/2022/index.html"],
    ["UCB CS162 操作系统", "https://cs162.org/"]]');

INSERT INTO area_rows VALUES ('database', 'core', '数据库',
  '专门用来存数据、查数据的软件是怎么做出来的：怎样又快又可靠地在海量数据里找到想要的那一条。',
  '[["CMU 15-445 数据库系统", "https://15445.courses.cs.cmu.edu/"],
    ["UCB CS186 数据库系统", "https://cs186berkeley.net/"]]');

INSERT INTO area_rows VALUES ('ui', 'core', '界面开发',
  '用户看得见、摸得着的那部分：网页和 App 的布局、交互、状态和性能。做应用的人都要会一点。',
  '[["MDN 学习 Web 开发（中文）", "https://developer.mozilla.org/zh-CN/docs/Learn_web_development"],
    ["Stanford CS142 Web 应用", "https://web.stanford.edu/class/cs142/"],
    ["web.dev 学习路径", "https://web.dev/learn"]]');

INSERT INTO area_rows VALUES ('compiler', 'core', '编译原理',
  '编译器是“翻译官”，把人写的代码翻译成机器能懂的指令。学完你可以自己设计一门小语言。',
  '[["北京大学 编译原理实践", "https://pku-minic.github.io/online-doc/#/"],
    ["Stanford CS143 编译原理", "https://web.stanford.edu/class/cs143/"],
    ["Crafting Interpreters 手写解释器", "https://craftinginterpreters.com/"]]');

-- ───────── 进阶层 ─────────

INSERT INTO area_rows VALUES ('distributed', 'advanced', '分布式系统',
  '让成百上千台机器像一台机器一样协同工作，就算其中几台坏了，服务也不受影响。大型网站和大数据都靠它。',
  '[["MIT 6.5840（原 6.824）分布式系统", "https://pdos.csail.mit.edu/6.824/"],
    ["《数据密集型应用系统设计》（DDIA）", "https://dataintensive.net/"]]');

INSERT INTO area_rows VALUES ('ml', 'advanced', '数据与机器学习',
  '教电脑从数据里找规律，而不是由人一条条写规则。从数据分析到 ChatGPT，都建立在它之上。',
  '[["吴恩达 机器学习（Coursera）", "https://www.coursera.org/specializations/machine-learning-introduction"],
    ["台湾大学 李宏毅 机器学习（中文）", "https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php"],
    ["Stanford CS231n 深度学习与视觉", "https://cs231n.stanford.edu/"]]');

INSERT INTO area_rows VALUES ('llm-apps', 'advanced', '大模型应用',
  '不训练模型，而是把现成的大模型用好：写提示词、接入自己的资料、让它调用工具、做成能干活的 Agent。',
  '[["Anthropic 提示工程交互教程", "https://github.com/anthropics/prompt-eng-interactive-tutorial"],
    ["Hugging Face Agents 课程", "https://huggingface.co/learn/agents-course"],
    ["DeepLearning.AI 短课程", "https://www.deeplearning.ai/short-courses/"]]');

INSERT INTO area_rows VALUES ('security', 'advanced', '安全',
  '搞清楚系统为什么会被黑：常见漏洞是怎么产生的、怎么被利用、又该怎么防。也会学加密的基本原理。',
  '[["UCB CS161 计算机安全", "https://su20.cs161.org/"],
    ["MIT 6.858 计算机系统安全", "http://css.csail.mit.edu/6.858/2022/"],
    ["pwn.college 攻防练习（ASU CSE365）", "https://pwn.college/"]]');

INSERT INTO area_rows VALUES ('hpc', 'advanced', '高性能计算',
  '让程序跑得飞快：同时用上 CPU 的多个核心，或者调动显卡的几千个核心一起算。AI 训练离不开它。',
  '[["CMU 15-418 / Stanford CS149 并行计算", "https://gfxcourses.stanford.edu/cs149/fall21"],
    ["MIT 6.172 软件性能工程", "https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/"]]');

INSERT INTO area_rows VALUES ('architecture', 'advanced', '体系结构',
  '深入 CPU 内部，看它用了哪些巧妙的设计，把指令执行得又快又对。想设计芯片就要学它。',
  '[["ETH 计算机体系结构（Onur Mutlu）", "https://safari.ethz.ch/architecture/fall2022/doku.php?id=start"],
    ["一生一芯", "https://ysyx.org/"]]');

INSERT INTO area_rows VALUES ('graphics', 'advanced', '图形学',
  '研究电脑怎么“画画”：从一堆三角形，算出游戏和电影里逼真的画面、光影和动画。',
  '[["GAMES101 现代计算机图形学入门（中文）", "https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html"],
    ["Ray Tracing in One Weekend", "https://raytracing.github.io/"]]');

INSERT INTO area_rows VALUES ('embedded', 'advanced', '嵌入式与硬件',
  '离硬件最近的地方：给单片机和机器人写程序，或者用硬件描述语言设计自己的芯片。',
  '[["HDLBits Verilog 在线练习", "https://hdlbits.01xz.net/"],
    ["Zephyr 实时系统入门", "https://docs.zephyrproject.org/latest/develop/getting_started/index.html"],
    ["ROS 2 官方教程", "https://docs.ros.org/en/rolling/Tutorials.html"]]');

INSERT INTO area_rows VALUES ('theory', 'advanced', '计算理论',
  '研究“计算”本身：哪些问题电脑永远算不出来，哪些算得出但要花很久，以及怎么用数学证明程序是对的。',
  '[["MIT 18.404J 计算理论", "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/"],
    ["Software Foundations 软件基础", "https://softwarefoundations.cis.upenn.edu/"]]');
