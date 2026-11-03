-- 0003 学习者：点亮状态、目标方向、操作记录。只有跑着 API 服务时才会写入，
-- 静态站点把同样的数据存在浏览器里，格式一致，可以互相导入导出。
-- 不做账号：第一次访问时服务端发一个随机 id，浏览器记住它。

CREATE TABLE learners (
  id            TEXT PRIMARY KEY CHECK (length(id) = 32 AND id NOT GLOB '*[^0-9a-f]*'),
  -- 当前目标方向，可以为空
  goal_sub_id   TEXT REFERENCES subs (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- 只存学习者亲手标过的状态。没有记录 = 没学。
-- locked / available 是推导出来的，不存。
CREATE TABLE learner_skills (
  learner_id  TEXT NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
  skill_id    TEXT NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('learning', 'done')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (learner_id, skill_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX learner_skills_by_skill ON learner_skills (skill_id, status);

-- 操作记录：每次状态变化一行，由触发器自动写。用来画“最近点亮”和成长曲线。
CREATE TABLE learner_events (
  id          INTEGER PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
  skill_id    TEXT NOT NULL,
  -- NULL 表示没学
  from_status TEXT CHECK (from_status IN ('learning', 'done')),
  to_status   TEXT CHECK (to_status IN ('learning', 'done')),
  at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX learner_events_by_learner ON learner_events (learner_id, id);

CREATE TRIGGER learner_skills_insert AFTER INSERT ON learner_skills BEGIN
  INSERT INTO learner_events (learner_id, skill_id, from_status, to_status)
  VALUES (NEW.learner_id, NEW.skill_id, NULL, NEW.status);
END;

CREATE TRIGGER learner_skills_update AFTER UPDATE OF status ON learner_skills
WHEN OLD.status IS NOT NEW.status BEGIN
  INSERT INTO learner_events (learner_id, skill_id, from_status, to_status)
  VALUES (NEW.learner_id, NEW.skill_id, OLD.status, NEW.status);
END;

-- 删除学习者时级联删掉的记录不用再记（学习者都没了）
CREATE TRIGGER learner_skills_delete AFTER DELETE ON learner_skills
WHEN EXISTS (SELECT 1 FROM learners WHERE id = OLD.learner_id) BEGIN
  INSERT INTO learner_events (learner_id, skill_id, from_status, to_status)
  VALUES (OLD.learner_id, OLD.skill_id, OLD.status, NULL);
END;

-- 每个学习者 × 每个技能的四种状态：
--   done / learning：学习者标的
--   available：前置全部 done，自己还没标 —— 这就是“能力边界”
--   locked：还有前置没 done
CREATE VIEW learner_skill_state AS
SELECT l.id AS learner_id,
       s.id AS skill_id,
       CASE
         WHEN ls.status IS NOT NULL THEN ls.status
         WHEN NOT EXISTS (
           SELECT 1
             FROM skill_prerequisites p
             LEFT JOIN learner_skills d
               ON d.learner_id = l.id AND d.skill_id = p.prerequisite_id AND d.status = 'done'
            WHERE p.skill_id = s.id AND d.skill_id IS NULL
         ) THEN 'available'
         ELSE 'locked'
       END AS state
  FROM learners l
 CROSS JOIN skills s
  LEFT JOIN learner_skills ls ON ls.learner_id = l.id AND ls.skill_id = s.id;

-- 能力边界：现在就能学的技能
CREATE VIEW learner_frontier AS
SELECT learner_id, skill_id FROM learner_skill_state WHERE state = 'available';

-- 每个学习者离每个细分方向还有多远。
--   必学部分按技能数算，任选组每组算 1 份，组里任意一个 done 就算满足。
CREATE VIEW learner_sub_readiness AS
WITH core AS (
  SELECT l.id AS learner_id, c.sub_id,
         COUNT(*) AS total,
         SUM(ls.status = 'done') AS done,
         SUM(ls.status = 'learning') AS learning
    FROM learners l
    JOIN sub_skill_closure c
    LEFT JOIN learner_skills ls ON ls.learner_id = l.id AND ls.skill_id = c.skill_id
   GROUP BY l.id, c.sub_id
),
groups AS (
  SELECT l.id AS learner_id, ch.sub_id, ch.choice,
         MAX(COALESCE(ls.status = 'done', 0)) AS satisfied
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
       COALESCE(core.done, 0) AS core_done,
       COALESCE(core.learning, 0) AS core_learning,
       COALESCE(ct.total, 0) AS choice_total,
       COALESCE(ct.done, 0) AS choice_done,
       ROUND(100.0 * (COALESCE(core.done, 0) + COALESCE(ct.done, 0)) / (core.total + COALESCE(ct.total, 0)), 1) AS percent
  FROM core
  LEFT JOIN choice_totals ct ON ct.learner_id = core.learner_id AND ct.sub_id = core.sub_id;
