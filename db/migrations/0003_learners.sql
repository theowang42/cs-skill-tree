-- 0003 学习者数据：只有跑着 API 服务时才会写入，静态站点不用这几张表。
-- 不做账号系统：浏览器第一次访问时由服务端发一个随机 id，存在 localStorage 里。

CREATE TABLE learners (
  id            TEXT PRIMARY KEY CHECK (length(id) = 32),
  -- 当前的目标方向，可以为空
  goal_sub_id   TEXT REFERENCES subs (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE learner_progress (
  learner_id  TEXT NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('learning', 'done')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (learner_id, block_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX learner_progress_by_block ON learner_progress (block_id, status);

-- 每个学习者离目标还差多少：目标方向要学的块 × 已完成状态
CREATE VIEW learner_goal_progress AS
SELECT l.id          AS learner_id,
       l.goal_sub_id AS sub_id,
       p.block_id,
       p.step,
       COALESCE(g.status, 'todo') AS status
  FROM learners l
  JOIN sub_learning_plan p ON p.sub_id = l.goal_sub_id
  LEFT JOIN learner_progress g ON g.learner_id = l.id AND g.block_id = p.block_id;
