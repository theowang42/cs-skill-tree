-- 播种用的临时视图：每个领域 / 技能 / 方向在种子文件里只占一行。
-- 往这些视图里 INSERT，触发器会把一行拆到真正的表里，并自动按出现顺序编号。
-- 列表类字段用 JSON 数组写，比如 '["a", "b"]'；链接写成 '[["标题", "https://…"], …]'。
-- 这些都是 TEMP 对象，只在播种的这次连接里存在，99_cleanup.sql 会删掉。

-- 分支（知识领域）：id, 所在层, 名字, 一句话
CREATE TEMP VIEW area_rows (id, layer, name, intro) AS
SELECT NULL, NULL, NULL, NULL WHERE 0;

CREATE TEMP TRIGGER area_rows_insert INSTEAD OF INSERT ON area_rows BEGIN
  INSERT INTO areas (id, layer_id, position, name, intro)
  VALUES (NEW.id, NEW.layer, (SELECT COUNT(*) + 1 FROM areas WHERE layer_id = NEW.layer), NEW.name, NEW.intro);
END;

-- 技能：id, 分支, 等级, 图标, 名字, 一句话, 直接前置（第一个是树上画出来的主前置）, 去哪学
CREATE TEMP VIEW skill_rows (id, area, level, icon, name, intro, requires, links) AS
SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL WHERE 0;

CREATE TEMP TRIGGER skill_rows_insert INSTEAD OF INSERT ON skill_rows BEGIN
  INSERT INTO skills (id, kind, area_id, position, name, intro, level, icon, parent_id)
  VALUES (NEW.id, 'concept', NEW.area, (SELECT COUNT(*) + 1 FROM skills WHERE area_id = NEW.area), NEW.name, NEW.intro, NEW.level, NEW.icon,
          json_extract(NEW.requires, '$[0]'));
  INSERT INTO skill_prerequisites (skill_id, prerequisite_id) SELECT NEW.id, value FROM json_each(NEW.requires);
  INSERT INTO skill_resources (skill_id, position, label, url)
  SELECT NEW.id, key + 1, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(NEW.links);
END;

-- 大方向：id, 名字, 介绍, 方块上的三行
CREATE TEMP VIEW category_rows (id, name, intro, items) AS
SELECT NULL, NULL, NULL, NULL WHERE 0;

CREATE TEMP TRIGGER category_rows_insert INSTEAD OF INSERT ON category_rows BEGIN
  INSERT INTO categories (id, position, name, intro)
  VALUES (NEW.id, (SELECT COUNT(*) + 1 FROM categories), NEW.name, NEW.intro);
  INSERT INTO category_items (category_id, position, text) SELECT NEW.id, key + 1, value FROM json_each(NEW.items);
END;

-- 细分方向：id, 大方向, 名字, 介绍, 是否热门, 方块上的三行, 具体做这些, 代表项目,
--           必学技能（只写最高层的；第一个是方向在树上挂的位置）, 任选组（{"组名": ["技能", …]}）
CREATE TEMP VIEW sub_rows (id, category, name, intro, hot, items, topics, projects, requires, choices) AS
SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL WHERE 0;

CREATE TEMP TRIGGER sub_rows_insert INSTEAD OF INSERT ON sub_rows BEGIN
  INSERT INTO subs (id, category_id, position, name, intro, is_hot, anchor_id)
  VALUES (NEW.id, NEW.category, (SELECT COUNT(*) + 1 FROM subs WHERE category_id = NEW.category), NEW.name, NEW.intro, NEW.hot,
          json_extract(NEW.requires, '$[0]'));
  INSERT INTO sub_items (sub_id, position, text) SELECT NEW.id, key + 1, value FROM json_each(NEW.items);
  INSERT INTO sub_topics (sub_id, position, text) SELECT NEW.id, key + 1, value FROM json_each(NEW.topics);
  INSERT INTO sub_projects (sub_id, position, label, url)
  SELECT NEW.id, key + 1, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(NEW.projects);
  INSERT INTO sub_requirements (sub_id, skill_id, choice) SELECT NEW.id, value, NULL FROM json_each(NEW.requires);
  INSERT INTO sub_requirements (sub_id, skill_id, choice)
  SELECT NEW.id, o.value, g.key FROM json_each(NEW.choices) g, json_each(g.value) o;
END;
