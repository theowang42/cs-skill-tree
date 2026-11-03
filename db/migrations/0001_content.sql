-- 0001 内容表：技能树上能看到的一切都存在这里。
--
-- 四类实体，从上往下和页面上的层次一一对应：
--   categories（大方向） ─┬─ subs（细分方向） ──┬── sub_requirements ──> blocks（能力块）
--                         │                      └── sub_tools ──────────> tools（工具）
--   blocks 之间用 block_prerequisites 连成一张有向无环图（前置关系）。
--
-- 每个实体都有三类附属行：
--   *_items   方块上显示的 2~3 行概括
--   *_topics  右侧面板里“会学到 / 具体做这些”的列表
--   *_courses / *_links / *_projects  右侧面板里的外链
-- 它们都用 (owner_id, position) 做主键，position 从 1 开始，决定显示顺序。
--
-- 约定：所有 id 都是小写英文 slug，直接当 URL 和 CSS 用；name 是中文显示名。

-- ───────────── 能力块（基础层 / 核心层 / 进阶层） ─────────────

CREATE TABLE layers (
  id        TEXT    PRIMARY KEY,
  name      TEXT    NOT NULL UNIQUE,
  -- 1 是最底层（基础层），数字越大越靠上
  position  INTEGER NOT NULL UNIQUE CHECK (position >= 1)
) STRICT;

CREATE TABLE blocks (
  id        TEXT    PRIMARY KEY,
  layer_id  TEXT    NOT NULL REFERENCES layers (id) ON UPDATE CASCADE,
  -- 同一层里从左到右的顺序
  position  INTEGER NOT NULL CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  -- 一句话介绍，给完全不懂的人看
  intro     TEXT    NOT NULL CHECK (length(intro) > 0),
  UNIQUE (layer_id, position)
) STRICT;

CREATE TABLE block_items (
  block_id  TEXT    NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (block_id, position)
) STRICT, WITHOUT ROWID;

-- 学 block_id 之前最好先会 prerequisite_id。只写直接前置，间接前置由视图推导。
CREATE TABLE block_prerequisites (
  block_id         TEXT NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  prerequisite_id  TEXT NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (block_id, prerequisite_id),
  CHECK (block_id <> prerequisite_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX block_prerequisites_by_prerequisite ON block_prerequisites (prerequisite_id);

CREATE TABLE block_topics (
  block_id  TEXT    NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (block_id, position)
) STRICT, WITHOUT ROWID;

-- 推荐公开课，主要参考 csdiy.wiki
CREATE TABLE block_courses (
  block_id  TEXT    NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'http://%' OR url LIKE 'https://%'),
  PRIMARY KEY (block_id, position)
) STRICT, WITHOUT ROWID;

-- ───────────── 工具层：语言、框架、平台 ─────────────

CREATE TABLE tool_groups (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  -- 方块上方的短标题，比如“语言”
  short_name  TEXT    NOT NULL,
  position    INTEGER NOT NULL UNIQUE CHECK (position >= 1)
) STRICT;

CREATE TABLE tools (
  id        TEXT    PRIMARY KEY,
  group_id  TEXT    NOT NULL REFERENCES tool_groups (id) ON UPDATE CASCADE,
  -- 同一组里从左到右的顺序，按需求量排
  position  INTEGER NOT NULL CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  -- 出品或维护它的公司、组织
  org       TEXT    NOT NULL,
  intro     TEXT    NOT NULL CHECK (length(intro) > 0),
  UNIQUE (group_id, position)
) STRICT;

CREATE TABLE tool_topics (
  tool_id   TEXT    NOT NULL REFERENCES tools (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (tool_id, position)
) STRICT, WITHOUT ROWID;

-- 官网、官方文档、官方教程
CREATE TABLE tool_links (
  tool_id   TEXT    NOT NULL REFERENCES tools (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position >= 1),
  label     TEXT    NOT NULL CHECK (length(label) > 0),
  url       TEXT    NOT NULL CHECK (url LIKE 'http://%' OR url LIKE 'https://%'),
  PRIMARY KEY (tool_id, position)
) STRICT, WITHOUT ROWID;

-- ───────────── 应用层：大方向和细分方向 ─────────────

CREATE TABLE categories (
  id        TEXT    PRIMARY KEY,
  -- 从左到右，按热度排；“其他方向”固定最后
  position  INTEGER NOT NULL UNIQUE CHECK (position >= 1),
  name      TEXT    NOT NULL UNIQUE,
  intro     TEXT    NOT NULL CHECK (length(intro) > 0)
) STRICT;

CREATE TABLE category_items (
  category_id  TEXT    NOT NULL REFERENCES categories (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text         TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (category_id, position)
) STRICT, WITHOUT ROWID;

-- 细分方向才真正决定要学什么
CREATE TABLE subs (
  id           TEXT    PRIMARY KEY,
  category_id  TEXT    NOT NULL REFERENCES categories (id) ON UPDATE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 1),
  name         TEXT    NOT NULL UNIQUE,
  intro        TEXT    NOT NULL CHECK (length(intro) > 0),
  -- 1 = 在左栏“试试热门方向”里给快捷入口
  is_hot       INTEGER NOT NULL DEFAULT 0 CHECK (is_hot IN (0, 1)),
  UNIQUE (category_id, position)
) STRICT;

CREATE TABLE sub_items (
  sub_id    TEXT    NOT NULL REFERENCES subs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text      TEXT    NOT NULL CHECK (length(text) > 0),
  PRIMARY KEY (sub_id, position)
) STRICT, WITHOUT ROWID;

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

-- 细分方向直接需要的能力块。只写最高层的那几个，前置由视图自动带上。
CREATE TABLE sub_requirements (
  sub_id    TEXT NOT NULL REFERENCES subs (id)   ON UPDATE CASCADE ON DELETE CASCADE,
  block_id  TEXT NOT NULL REFERENCES blocks (id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (sub_id, block_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX sub_requirements_by_block ON sub_requirements (block_id);

-- 细分方向会用到的语言和工具
CREATE TABLE sub_tools (
  sub_id   TEXT NOT NULL REFERENCES subs (id)  ON UPDATE CASCADE ON DELETE CASCADE,
  tool_id  TEXT NOT NULL REFERENCES tools (id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (sub_id, tool_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX sub_tools_by_tool ON sub_tools (tool_id);
