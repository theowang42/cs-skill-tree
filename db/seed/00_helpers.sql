-- 写内容用的临时视图：每个领域 / 技能 / 大方向 / 职业在种子文件里只占一行。
-- 往这些视图里 INSERT，触发器把一行拆到真正的表里，并按出现顺序编号。
-- 列表写成 JSON 数组，比如 '["a", "b"]'；链接写成 '[["标题", "https://…"], …]'。

-- 领域：id, 名字, 一句话
CREATE TEMP VIEW area_rows (id, name, intro) AS SELECT NULL, NULL, NULL WHERE 0;
CREATE TEMP TRIGGER area_rows_insert INSTEAD OF INSERT ON area_rows BEGIN
  INSERT INTO areas (id, position, name, intro)
  VALUES (NEW.id, (SELECT COUNT(*) + 1 FROM areas), NEW.name, NEW.intro);
END;

-- 技能：id, 领域, 图标, 名字, 一句话, 直接前置（第一个是树上画出来的主前置）, 去哪学
CREATE TEMP VIEW skill_rows (id, area, icon, name, intro, requires, links) AS SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL WHERE 0;
CREATE TEMP TRIGGER skill_rows_insert INSTEAD OF INSERT ON skill_rows BEGIN
  INSERT INTO skills (id, area_id, position, icon, name, intro, parent_id)
  VALUES (NEW.id, NEW.area, (SELECT COUNT(*) + 1 FROM skills WHERE area_id = NEW.area), NEW.icon, NEW.name, NEW.intro,
          json_extract(NEW.requires, '$[0]'));
  INSERT INTO skill_prerequisites (skill_id, prerequisite_id) SELECT NEW.id, value FROM json_each(NEW.requires);
  INSERT INTO skill_resources (skill_id, position, label, url)
  SELECT NEW.id, key + 1, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(NEW.links);
END;

-- 大方向：id, 名字, 一句话
CREATE TEMP VIEW category_rows (id, name, intro) AS SELECT NULL, NULL, NULL WHERE 0;
CREATE TEMP TRIGGER category_rows_insert INSTEAD OF INSERT ON category_rows BEGIN
  INSERT INTO categories (id, position, name, intro)
  VALUES (NEW.id, (SELECT COUNT(*) + 1 FROM categories), NEW.name, NEW.intro);
END;

-- 职业：id, 大方向, 图标, 名字, 一句话, 是否热门, 三个关键词, 平时做什么, 代表项目,
--       必学技能（只写最高层的；第一个是徽章在树上挂的位置）, 加分项
CREATE TEMP VIEW sub_rows (id, category, icon, name, intro, hot, items, topics, projects, requires, bonus) AS
SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL WHERE 0;
CREATE TEMP TRIGGER sub_rows_insert INSTEAD OF INSERT ON sub_rows BEGIN
  INSERT INTO subs (id, category_id, position, icon, name, intro, is_hot, anchor_id)
  VALUES (NEW.id, NEW.category, (SELECT COUNT(*) + 1 FROM subs WHERE category_id = NEW.category), NEW.icon, NEW.name, NEW.intro, NEW.hot,
          json_extract(NEW.requires, '$[0]'));
  INSERT INTO sub_items (sub_id, position, text) SELECT NEW.id, key + 1, value FROM json_each(NEW.items);
  INSERT INTO sub_topics (sub_id, position, text) SELECT NEW.id, key + 1, value FROM json_each(NEW.topics);
  INSERT INTO sub_projects (sub_id, position, label, url)
  SELECT NEW.id, key + 1, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(NEW.projects);
  INSERT INTO sub_requirements (sub_id, skill_id, is_bonus) SELECT NEW.id, value, 0 FROM json_each(NEW.requires);
  INSERT INTO sub_requirements (sub_id, skill_id, is_bonus) SELECT NEW.id, value, 1 FROM json_each(NEW.bonus);
END;
