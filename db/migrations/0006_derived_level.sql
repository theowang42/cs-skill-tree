-- 0006 等级不再手写：没写 level 的技能，等级就是它在树上的深度（最多 5）。
-- 技能树改成从中心往外长的网，深度本身就是“有多深”，不需要再单独维护一套等级。
DROP VIEW skill_level;
CREATE VIEW skill_level AS
SELECT s.id AS skill_id, COALESCE(s.level, MIN(5, d.depth)) AS level
  FROM skills s
  JOIN skill_depth d ON d.skill_id = s.id;
