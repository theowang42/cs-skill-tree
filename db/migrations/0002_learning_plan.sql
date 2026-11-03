-- 0002 推导视图：由前置关系算出“选了某个方向要学哪些块、按什么顺序学”。
-- 页面上点亮和编号用的就是这几张视图，前端自己不做图算法。

-- 每个能力块的全部前置（直接 + 间接），depth 是最短的前置链长度。
-- 用 UNION（去重）而不是 UNION ALL，万一数据里有环也能终止；环由 check 命令另外查。
CREATE VIEW block_ancestors AS
WITH RECURSIVE walk (block_id, ancestor_id, depth) AS (
  SELECT block_id, prerequisite_id, 1 FROM block_prerequisites
  UNION
  SELECT w.block_id, p.prerequisite_id, w.depth + 1
    FROM walk w
    JOIN block_prerequisites p ON p.block_id = w.ancestor_id
   WHERE w.depth < 64
)
SELECT block_id, ancestor_id, MIN(depth) AS depth
  FROM walk
 GROUP BY block_id, ancestor_id;

-- 选了某个细分方向后要学的全部能力块：直接要求的 + 它们的全部前置。
CREATE VIEW sub_block_closure AS
SELECT sub_id, block_id FROM sub_requirements
UNION
SELECT r.sub_id, a.ancestor_id
  FROM sub_requirements r
  JOIN block_ancestors a ON a.block_id = r.block_id;

-- 学习顺序：没有前置的是第 1 步，其余是“它最晚的前置那一步 + 1”，
-- 也就是从某个无前置块出发、走到它的最长前置链的长度。
CREATE VIEW sub_learning_plan AS
WITH RECURSIVE chain (sub_id, block_id, length) AS (
  SELECT sub_id, block_id, 1 FROM sub_block_closure
  UNION ALL
  SELECT c.sub_id, p.block_id, c.length + 1
    FROM chain c
    JOIN block_prerequisites p ON p.prerequisite_id = c.block_id
    JOIN sub_block_closure s  ON s.sub_id = c.sub_id AND s.block_id = p.block_id
   WHERE c.length < 64
)
SELECT sub_id, block_id, MAX(length) AS step
  FROM chain
 GROUP BY sub_id, block_id;

-- 反过来：学会了某个能力块，可以去做哪些方向
CREATE VIEW block_unlocks AS
SELECT block_id, sub_id FROM sub_block_closure;
