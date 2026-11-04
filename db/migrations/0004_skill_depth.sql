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
