-- 0002 推导视图：前置闭包、分行、学习顺序。页面上的点亮和编号都用这些结果。
--
-- 递归一律用 UNION（去重）而不是 UNION ALL：行数被限制在“节点数 × 深度”以内，
-- 哪怕数据里不小心有环也能停下来；环本身由体检报错。

-- 每个技能的全部前置（直接 + 间接），depth 是最短的那条前置链有多长
CREATE VIEW skill_ancestors AS
WITH RECURSIVE walk (skill_id, ancestor_id, depth) AS (
  SELECT skill_id, prerequisite_id, 1 FROM skill_prerequisites
  UNION
  SELECT w.skill_id, p.prerequisite_id, w.depth + 1
    FROM walk w
    JOIN skill_prerequisites p ON p.skill_id = w.ancestor_id
   WHERE w.depth < 64
)
SELECT skill_id, ancestor_id, MIN(depth) AS depth
  FROM walk
 GROUP BY skill_id, ancestor_id;

-- 技能在自己领域 / 工具组里的“行”：只看同一个容器里的前置，最长前置链的长度。
-- 页面上一个领域卡片里，第 1 行是这个领域的入门点，越往下越深。
CREATE VIEW skill_tiers AS
WITH RECURSIVE
  same_container (skill_id, prerequisite_id) AS (
    SELECT p.skill_id, p.prerequisite_id
      FROM skill_prerequisites p
      JOIN skills a ON a.id = p.skill_id
      JOIN skills b ON b.id = p.prerequisite_id
     WHERE COALESCE(a.area_id, a.group_id) = COALESCE(b.area_id, b.group_id)
  ),
  chain (skill_id, length) AS (
    SELECT id, 1 FROM skills
    UNION
    SELECT s.skill_id, c.length + 1
      FROM chain c
      JOIN same_container s ON s.prerequisite_id = c.skill_id
     WHERE c.length < 64
  )
SELECT skill_id, MAX(length) AS tier
  FROM chain
 GROUP BY skill_id;

-- 选了某个细分方向后必学的全部技能：必学要求 + 它们的全部前置
CREATE VIEW sub_skill_closure AS
SELECT sub_id, skill_id FROM sub_requirements WHERE choice IS NULL
UNION
SELECT r.sub_id, a.ancestor_id
  FROM sub_requirements r
  JOIN skill_ancestors a ON a.skill_id = r.skill_id
 WHERE r.choice IS NULL;

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
SELECT sub_id, skill_id, MAX(length) AS step
  FROM chain
 GROUP BY sub_id, skill_id;

-- 任选组：每个细分方向有哪些“任选其一”的组，每组有哪些选项
CREATE VIEW sub_choices AS
SELECT sub_id, choice, skill_id
  FROM sub_requirements
 WHERE choice IS NOT NULL;

-- 反过来：哪些细分方向必学这个技能（直接或间接）
CREATE VIEW skill_unlocks AS
SELECT skill_id, sub_id FROM sub_skill_closure;

-- 每个技能的“分量”：有多少技能直接或间接依赖它，越大越是地基
CREATE VIEW skill_weight AS
SELECT s.id AS skill_id, COUNT(a.skill_id) AS dependents
  FROM skills s
  LEFT JOIN skill_ancestors a ON a.ancestor_id = s.id
 GROUP BY s.id;
