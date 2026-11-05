-- 0005 技能改成“能写进简历的技能”：每个技能手写等级和图标，不再从领域内层级推导。
--   level：1 入门 · 2 基础 · 3 进阶 · 4 专精 · 5 前沿
--   icon：Lucide 图标名（如 'database'），或 'si:' 开头的 Simple Icons 品牌图标（如 'si:python'）
ALTER TABLE skills ADD COLUMN level INTEGER CHECK (level IS NULL OR level BETWEEN 1 AND 5);
ALTER TABLE skills ADD COLUMN icon TEXT CHECK (icon IS NULL OR length(icon) > 0);

DROP VIEW skill_level;
CREATE VIEW skill_level AS
SELECT id AS skill_id, COALESCE(level, 1) AS level FROM skills;
