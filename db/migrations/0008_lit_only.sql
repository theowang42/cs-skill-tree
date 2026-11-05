-- 只有两种状态：点亮了，和没点亮。去掉“在学”。
--   learner_skills 里的一行就表示点亮；status 列保留，只能是 'done'，导入导出的文件格式不变。
--   旧数据里的“在学”当作没点亮：删掉那一行，操作记录里的“在学”也改成“没点亮”。

DELETE FROM learner_skills WHERE status = 'learning';
UPDATE learner_events SET from_status = NULL WHERE from_status = 'learning';
UPDATE learner_events SET to_status = NULL WHERE to_status = 'learning';
-- “没点亮 → 没点亮”不是变化，删掉
DELETE FROM learner_events WHERE from_status IS NULL AND to_status IS NULL;

-- 改 CHECK 约束要重建表；用触发器挡住新的“在学”，效果一样
CREATE TRIGGER learner_skills_lit_only_insert BEFORE INSERT ON learner_skills
WHEN NEW.status <> 'done' BEGIN
  SELECT RAISE(ABORT, 'learner_skills.status 只能是 done（点亮）');
END;

CREATE TRIGGER learner_skills_lit_only_update BEFORE UPDATE OF status ON learner_skills
WHEN NEW.status <> 'done' BEGIN
  SELECT RAISE(ABORT, 'learner_skills.status 只能是 done（点亮）');
END;

-- 方向的进度：不再算“在学”
DROP VIEW learner_sub_readiness;
CREATE VIEW learner_sub_readiness AS
WITH core AS (
  SELECT l.id AS learner_id, c.sub_id,
         COUNT(*) AS total,
         COUNT(ls.skill_id) AS done
    FROM learners l
    JOIN sub_skill_closure c
    LEFT JOIN learner_skills ls ON ls.learner_id = l.id AND ls.skill_id = c.skill_id
   GROUP BY l.id, c.sub_id
),
groups AS (
  SELECT l.id AS learner_id, ch.sub_id, ch.choice,
         MAX(ls.skill_id IS NOT NULL) AS satisfied
    FROM learners l
    JOIN sub_choices ch
    LEFT JOIN learner_skills ls ON ls.learner_id = l.id AND ls.skill_id = ch.skill_id
   GROUP BY l.id, ch.sub_id, ch.choice
),
choice_totals AS (
  SELECT learner_id, sub_id, COUNT(*) AS total, SUM(satisfied) AS done
    FROM groups
   GROUP BY learner_id, sub_id
)
SELECT core.learner_id,
       core.sub_id,
       core.total AS core_total,
       core.done AS core_done,
       COALESCE(ct.total, 0) AS choice_total,
       COALESCE(ct.done, 0) AS choice_done,
       ROUND(100.0 * (core.done + COALESCE(ct.done, 0)) / (core.total + COALESCE(ct.total, 0)), 1) AS percent
  FROM core
  LEFT JOIN choice_totals ct ON ct.learner_id = core.learner_id AND ct.sub_id = core.sub_id;
