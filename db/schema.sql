-- 技能树的全部内容。每次构建都从空库开始：建表 → 灌 content/ 里的 Markdown → 体检 → 导出 JSON。
--
--   areas（领域） ─< skills（技能） ─< skill_prerequisites >─ skills    前置关系，是一张有向无环图
--   categories（大方向） ─< subs（职业） ─< sub_requirements >─ skills
--
-- 附属的列表都用 (owner_id, position) 做主键，position 从 1 开始，决定显示顺序。
-- id 是小写英文 slug，直接用在网址和进度文件里，改了会让用户的进度对不上，尽量别改。

CREATE TABLE areas (
  id        TEXT    PRIMARY KEY,
  -- 绕圆一圈的顺序
  position  INTEGER NOT NULL UNIQUE,
  name      TEXT    NOT NULL UNIQUE,
  intro     TEXT    NOT NULL CHECK (length(intro) > 0)
) STRICT;

CREATE TABLE skills (
  id           TEXT    PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  area_id      TEXT    NOT NULL REFERENCES areas (id),
  -- 同一领域里的顺序；领域里先按前置深度分行，position 只决定同一行里的先后
  position     INTEGER NOT NULL,
  -- Lucide 图标名，或 'si:' 开头的 Simple Icons 品牌图标
  icon         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL UNIQUE,
  intro        TEXT    NOT NULL CHECK (length(intro) > 0),
  -- 树上画出来的那根枝连向谁：主前置，必须是它的前置之一。没有前置的技能从中心长出来
  parent_id    TEXT    REFERENCES skills (id),
  -- 编程语言：树上画成六边形
  is_language  INTEGER NOT NULL DEFAULT 0 CHECK (is_language IN (0, 1)),
  -- 怎么算会了：一个自己能检验的标准。还没写讲解的技能是 NULL
  verify       TEXT    CHECK (length(verify) > 0),
  UNIQUE (area_id, position)
) STRICT;

-- 学什么：要掌握的要点
CREATE TABLE skill_learn (
  skill_id  TEXT    NOT NULL REFERENCES skills (id),
  position  INTEGER NOT NULL,
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (skill_id, position)
) STRICT, WITHOUT ROWID;

-- 学 skill_id 之前要先会 prerequisite_id。只写直接前置，间接的由视图推导
CREATE TABLE skill_prerequisites (
  skill_id         TEXT NOT NULL REFERENCES skills (id),
  prerequisite_id  TEXT NOT NULL REFERENCES skills (id),
  PRIMARY KEY (skill_id, prerequisite_id),
  CHECK (skill_id <> prerequisite_id)
) STRICT, WITHOUT ROWID;

-- 去哪学：官方课程页、官方文档或公认最好的教程
CREATE TABLE skill_resources (
  skill_id  TEXT    NOT NULL REFERENCES skills (id),
  position  INTEGER NOT NULL,
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'https://%'),
  -- 课程、书、视频、文章、文档、练习；还没写讲解的技能可以不标
  kind      TEXT    CHECK (kind IN ('课程', '书', '视频', '文章', '文档', '论文', '练习')),
  is_free   INTEGER CHECK (is_free IN (0, 1)),
  PRIMARY KEY (skill_id, position)
) STRICT, WITHOUT ROWID;

CREATE TABLE categories (
  id        TEXT    PRIMARY KEY,
  position  INTEGER NOT NULL UNIQUE,
  name      TEXT    NOT NULL UNIQUE,
  intro     TEXT    NOT NULL CHECK (length(intro) > 0)
) STRICT;

CREATE TABLE subs (
  id           TEXT    PRIMARY KEY,
  category_id  TEXT    NOT NULL REFERENCES categories (id),
  position     INTEGER NOT NULL,
  icon         TEXT    NOT NULL,
  name         TEXT    NOT NULL UNIQUE,
  intro        TEXT    NOT NULL CHECK (length(intro) > 0),
  is_hot       INTEGER NOT NULL CHECK (is_hot IN (0, 1)),
  -- 徽章挂在树上哪个技能后面，必须是它必学的技能
  anchor_id    TEXT    NOT NULL REFERENCES skills (id),
  UNIQUE (category_id, position)
) STRICT;

-- 职业的三个关键词
CREATE TABLE sub_items (
  sub_id    TEXT    NOT NULL REFERENCES subs (id),
  position  INTEGER NOT NULL,
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 平时做什么
CREATE TABLE sub_topics (
  sub_id    TEXT    NOT NULL REFERENCES subs (id),
  position  INTEGER NOT NULL,
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 代表性的开源项目
CREATE TABLE sub_projects (
  sub_id    TEXT    NOT NULL REFERENCES subs (id),
  position  INTEGER NOT NULL,
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'https://%'),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 职业要的技能。必学只写最高层的那几个，前置自动带上；加分项不算进达成条件
CREATE TABLE sub_requirements (
  sub_id    TEXT    NOT NULL REFERENCES subs (id),
  skill_id  TEXT    NOT NULL REFERENCES skills (id),
  is_bonus  INTEGER NOT NULL CHECK (is_bonus IN (0, 1)),
  PRIMARY KEY (sub_id, skill_id)
) STRICT, WITHOUT ROWID;

-- ───────────── 推导视图 ─────────────
-- 递归一律用 UNION（去重）并限制深度：数据里不小心有环也能停下来，环本身由体检报错。

-- 每个技能的全部前置（直接 + 间接）
CREATE VIEW skill_ancestors AS
WITH RECURSIVE walk (skill_id, ancestor_id, depth) AS (
  SELECT skill_id, prerequisite_id, 1 FROM skill_prerequisites
  UNION
  SELECT w.skill_id, p.prerequisite_id, w.depth + 1
    FROM walk w
    JOIN skill_prerequisites p ON p.skill_id = w.ancestor_id
   WHERE w.depth < 64
)
SELECT DISTINCT skill_id, ancestor_id FROM walk;

-- 领域内的行：只看同领域的前置，最长前置链的长度。导出时技能按它排序，布局按这个顺序摆
CREATE VIEW skill_tiers AS
WITH RECURSIVE
  same_area (skill_id, prerequisite_id) AS (
    SELECT p.skill_id, p.prerequisite_id
      FROM skill_prerequisites p
      JOIN skills a ON a.id = p.skill_id
      JOIN skills b ON b.id = p.prerequisite_id
     WHERE a.area_id = b.area_id
  ),
  chain (skill_id, length) AS (
    SELECT id, 1 FROM skills
    UNION
    SELECT s.skill_id, c.length + 1
      FROM chain c
      JOIN same_area s ON s.prerequisite_id = c.skill_id
     WHERE c.length < 64
  )
SELECT skill_id, MAX(length) AS tier FROM chain GROUP BY skill_id;

-- 有多少技能直接或间接依赖它：“下一个学什么”按它从大到小排
CREATE VIEW skill_weight AS
SELECT s.id AS skill_id, COUNT(a.skill_id) AS dependents
  FROM skills s
  LEFT JOIN skill_ancestors a ON a.ancestor_id = s.id
 GROUP BY s.id;

-- 职业必学的全部技能：必学要求 + 它们的全部前置
CREATE VIEW sub_skill_closure AS
SELECT sub_id, skill_id FROM sub_requirements WHERE is_bonus = 0
UNION
SELECT r.sub_id, a.ancestor_id
  FROM sub_requirements r
  JOIN skill_ancestors a ON a.skill_id = r.skill_id
 WHERE r.is_bonus = 0;

-- 学习顺序：闭包里没有前置的是第 1 步，其余是“最晚的前置那一步 + 1”
CREATE VIEW sub_learning_plan AS
WITH RECURSIVE chain (sub_id, skill_id, length) AS (
  SELECT sub_id, skill_id, 1 FROM sub_skill_closure
  UNION
  SELECT c.sub_id, p.skill_id, c.length + 1
    FROM chain c
    JOIN skill_prerequisites p ON p.prerequisite_id = c.skill_id
    JOIN sub_skill_closure s ON s.sub_id = c.sub_id AND s.skill_id = p.skill_id
   WHERE c.length < 64
)
SELECT sub_id, skill_id, MAX(length) AS step FROM chain GROUP BY sub_id, skill_id;
