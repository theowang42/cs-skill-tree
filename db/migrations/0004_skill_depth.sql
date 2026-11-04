-- 0004 星图用的全局深度：从没有前置的技能出发、到它的最长前置链有多长。
-- 第 1 圈是入门，越往外越进阶。和 skill_tiers 的区别：那个只看同领域内的前置，这个看全部。

CREATE VIEW skill_depth AS
WITH RECURSIVE chain (skill_id, length) AS (
  SELECT id, 1 FROM skills
  UNION
  SELECT p.skill_id, c.length + 1
    FROM chain c
    JOIN skill_prerequisites p ON p.prerequisite_id = c.skill_id
   WHERE c.length < 64
)
SELECT skill_id, MAX(length) AS depth
  FROM chain
 GROUP BY skill_id;

-- 学习者点亮到了第几圈（每个领域各自算），画“已探索的星域”用
CREATE VIEW learner_reach AS
SELECT ls.learner_id,
       COALESCE(s.area_id, s.group_id) AS container_id,
       MAX(d.depth) AS depth
  FROM learner_skills ls
  JOIN skills s ON s.id = ls.skill_id
  JOIN skill_depth d ON d.skill_id = ls.skill_id
 WHERE ls.status = 'done'
 GROUP BY ls.learner_id, container_id;

-- 星图的等级：5 级固定尺度，同一级的星放在同一圈，每级的含义全图一致。
--   1 入门：没有任何基础也能开始
--   2 基础：所有方向都会用到
--   3 进阶：某个领域的主干
--   4 专精：某个领域的深处
--   5 前沿：研究或大型系统才会碰到
-- 知识点先由所在层（基础 / 核心 / 进阶）和领域内的层级（skill_tiers）映射出一个基础等级，
-- 再取它和全部前置的基础等级里最大的那个，这样前置永远不会在更高的等级。
-- 工具不单独定级，等于它全部前置里最高的等级（Python 和“变量与控制流”同级）。
CREATE VIEW skill_level AS
WITH base (skill_id, level) AS (
  SELECT s.id,
         CASE
           WHEN s.kind = 'tool' THEN 1
           -- 基础层：1 → 入门，2~3 → 基础，更深 → 进阶
           WHEN l.position = 1 THEN CASE WHEN t.tier = 1 THEN 1 WHEN t.tier <= 3 THEN 2 ELSE 3 END
           -- 核心层：1~2 → 基础，3 → 进阶，更深 → 专精
           WHEN l.position = 2 THEN CASE WHEN t.tier <= 2 THEN 2 WHEN t.tier = 3 THEN 3 ELSE 4 END
           -- 进阶层：1 → 进阶，2 → 专精，更深 → 前沿
           ELSE CASE WHEN t.tier = 1 THEN 3 WHEN t.tier = 2 THEN 4 ELSE 5 END
         END
    FROM skills s
    LEFT JOIN areas a ON a.id = s.area_id
    LEFT JOIN layers l ON l.id = a.layer_id
    JOIN skill_tiers t ON t.skill_id = s.id
)
SELECT b.skill_id,
       MAX(b.level, COALESCE((
         SELECT MAX(pb.level)
           FROM skill_ancestors an
           JOIN base pb ON pb.skill_id = an.ancestor_id
          WHERE an.skill_id = b.skill_id
       ), 1)) AS level
  FROM base b;
