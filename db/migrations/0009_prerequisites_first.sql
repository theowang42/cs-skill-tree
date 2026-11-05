-- 前置都点亮了才能点亮。应用层（server/learners.ts 和 src/lib/tree.ts 的 planChanges）先按规则算好再写；
-- 这里在数据库里再挡一道，谁绕过应用层直接写表也写不进不合规的数据。

-- 已有数据里前置没点亮的点亮记录：不算数
DELETE FROM learner_skills
 WHERE EXISTS (
   SELECT 1 FROM skill_ancestors a
    WHERE a.skill_id = learner_skills.skill_id
      AND NOT EXISTS (SELECT 1 FROM learner_skills d WHERE d.learner_id = learner_skills.learner_id AND d.skill_id = a.ancestor_id)
 );

-- 点亮：直接前置必须都已经点亮（批量写入要按依赖顺序）
CREATE TRIGGER learner_skills_prerequisites_first BEFORE INSERT ON learner_skills
WHEN EXISTS (
  SELECT 1 FROM skill_prerequisites p
   WHERE p.skill_id = NEW.skill_id
     AND NOT EXISTS (SELECT 1 FROM learner_skills d WHERE d.learner_id = NEW.learner_id AND d.skill_id = p.prerequisite_id)
) BEGIN
  SELECT RAISE(ABORT, '前置还没点亮，不能点亮这个技能');
END;

-- 取消点亮：依赖它的一起熄灭。一层层往下传要开 recursive_triggers（openDatabase 里开了）
CREATE TRIGGER learner_skills_cascade_unlight AFTER DELETE ON learner_skills BEGIN
  DELETE FROM learner_skills
   WHERE learner_id = OLD.learner_id
     AND skill_id IN (SELECT skill_id FROM skill_prerequisites WHERE prerequisite_id = OLD.skill_id);
END;
