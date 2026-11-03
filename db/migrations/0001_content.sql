-- 0001 内容表：技能树上的一切都存在这里。
--
--   layers（层） ─< areas（知识领域） ─< skills（技能，kind = 'concept'）
--   tool_groups（工具组）            ─< skills（技能，kind = 'tool'）
--   skills ─< skill_prerequisites >─ skills          技能之间的前置关系，是一张有向无环图
--   categories（大方向） ─< subs（细分方向） ─< sub_requirements >─ skills
--
-- 技能是树上最小的、能被“点亮”的单位。知识点和工具放在同一张表里，
-- 这样前置关系、点亮状态、方向要求都只需要一套。
--
-- 附属的列表（会学到、学会的标志、链接……）都用 (owner_id, position) 做主键，
-- position 从 1 开始连续编号，决定显示顺序。编号有没有断由 `npm run db:check` 检查。
--
-- id 一律是小写英文 slug，直接用在 URL、CSS 和进度文件里，改了会让用户的进度对不上，尽量别改。

-- ───────────── 层与知识领域 ─────────────

CREATE TABLE layers (
  id        TEXT    PRIMARY KEY,
  name      TEXT    NOT NULL UNIQUE,
  -- 1 是最底层（基础层），越大越靠上
  position  INTEGER NOT NULL UNIQUE CHECK (position >= 1)
) STRICT;

CREATE TABLE areas (
  id        TEXT    PRIMARY KEY,
  layer_id  TEXT    NOT NULL REFERENCES layers (id) ON UPDATE CASCADE,
  -- 同一层里从左到右的顺序
  position  INTEGER NOT NULL CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  -- 一句话介绍，给完全不懂的人看
  intro     TEXT    NOT NULL CHECK (length(intro) > 0),
  UNIQUE (layer_id, position)
) STRICT;

-- 领域的推荐公开课，主要参考 csdiy.wiki
CREATE TABLE area_courses (
  area_id   TEXT    NOT NULL REFERENCES areas (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'http://%' OR url LIKE 'https://%'),
  PRIMARY KEY (area_id, position)
) STRICT, WITHOUT ROWID;

-- ───────────── 工具组 ─────────────

CREATE TABLE tool_groups (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  -- 页面上的短标题，比如“语言”
  short_name  TEXT    NOT NULL,
  position    INTEGER NOT NULL UNIQUE CHECK (position >= 1)
) STRICT;

-- ───────────── 技能 ─────────────

CREATE TABLE skills (
  id        TEXT    PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  -- concept：知识点，属于某个知识领域；tool：语言、框架、平台，属于某个工具组
  kind      TEXT    NOT NULL CHECK (kind IN ('concept', 'tool')),
  area_id   TEXT    REFERENCES areas (id) ON UPDATE CASCADE,
  group_id  TEXT    REFERENCES tool_groups (id) ON UPDATE CASCADE,
  -- 同一领域 / 工具组里的顺序。领域里的技能会再按前置深度分行，position 只决定同一行里的先后
  position  INTEGER NOT NULL CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  -- 出品或维护它的组织，只有工具有
  org       TEXT,
  -- 一句话说清它是什么、为什么要学
  intro     TEXT    NOT NULL CHECK (length(intro) > 0),
  CHECK (
    (kind = 'concept' AND area_id IS NOT NULL AND group_id IS NULL AND org IS NULL) OR
    (kind = 'tool'    AND group_id IS NOT NULL AND area_id IS NULL AND org IS NOT NULL)
  ),
  UNIQUE (area_id, position),
  UNIQUE (group_id, position)
) STRICT;

CREATE INDEX skills_by_area  ON skills (area_id)  WHERE area_id  IS NOT NULL;
CREATE INDEX skills_by_group ON skills (group_id) WHERE group_id IS NOT NULL;

-- 学 skill_id 之前最好先会 prerequisite_id。只写直接前置，间接的由视图推导。
CREATE TABLE skill_prerequisites (
  skill_id         TEXT NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  prerequisite_id  TEXT NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (skill_id, prerequisite_id),
  CHECK (skill_id <> prerequisite_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX skill_prerequisites_by_prerequisite ON skill_prerequisites (prerequisite_id);

-- 学会的标志：自测时对照着看，做得到就可以点亮
CREATE TABLE skill_checks (
  skill_id  TEXT    NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (skill_id, position)
) STRICT, WITHOUT ROWID;

-- 要学的内容（工具用得多：学 Go 主要学 goroutine、接口……）
CREATE TABLE skill_topics (
  skill_id  TEXT    NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (skill_id, position)
) STRICT, WITHOUT ROWID;

-- 学习资料：工具是官网和文档，知识点是针对这一个点的好资料（领域通用的课在 area_courses）
CREATE TABLE skill_resources (
  skill_id  TEXT    NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'http://%' OR url LIKE 'https://%'),
  PRIMARY KEY (skill_id, position)
) STRICT, WITHOUT ROWID;

-- ───────────── 方向 ─────────────

CREATE TABLE categories (
  id        TEXT    PRIMARY KEY,
  -- 从左到右按热度排；“其他方向”固定最后
  position  INTEGER NOT NULL UNIQUE CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  intro     TEXT    NOT NULL CHECK (length(intro) > 0)
) STRICT;

-- 方块上显示的 3 行概括
CREATE TABLE category_items (
  category_id  TEXT    NOT NULL REFERENCES categories (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text         TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (category_id, position)
) STRICT, WITHOUT ROWID;

CREATE TABLE subs (
  id           TEXT    PRIMARY KEY,
  category_id  TEXT    NOT NULL REFERENCES categories (id) ON UPDATE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 1),
  name         TEXT    NOT NULL UNIQUE,
  intro        TEXT    NOT NULL CHECK (length(intro) > 0),
  -- 1 = 首页“试试热门方向”给快捷入口
  is_hot       INTEGER NOT NULL DEFAULT 0 CHECK (is_hot IN (0, 1)),
  UNIQUE (category_id, position)
) STRICT;

CREATE TABLE sub_items (
  sub_id    TEXT    NOT NULL REFERENCES subs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 具体做这些
CREATE TABLE sub_topics (
  sub_id    TEXT    NOT NULL REFERENCES subs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 代表性的开源项目
CREATE TABLE sub_projects (
  sub_id    TEXT    NOT NULL REFERENCES subs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'http://%' OR url LIKE 'https://%'),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

-- 细分方向要求的技能。
--   choice 为空：必学。只写最高层的那几个，前置会自动带上。
--   choice 不为空：同一个 choice 标签下的技能任选其一（比如“主力语言”里 Java、Go、Python 挑一个）。
--                  只有一个选项的组就是“加分项”。
CREATE TABLE sub_requirements (
  sub_id    TEXT NOT NULL REFERENCES subs (id)   ON UPDATE CASCADE ON DELETE CASCADE,
  skill_id  TEXT NOT NULL REFERENCES skills (id) ON UPDATE CASCADE ON DELETE CASCADE,
  choice    TEXT CHECK (choice IS NULL OR length(choice) > 0),
  PRIMARY KEY (sub_id, skill_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX sub_requirements_by_skill ON sub_requirements (skill_id);

-- 推荐给新手的起步路线由视图算，不用手写
