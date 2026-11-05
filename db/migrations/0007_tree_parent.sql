-- 技能树上画出来的那一根枝：每个技能只挂在一个主前置上，方向挂在它最主要的必学技能上。
-- 其余前置照样在 skill_prerequisites 里，参与解锁计算，只是平时不画，选中时才显示。
-- 种子里写前置时，第一个就是主前置。
ALTER TABLE skills ADD COLUMN parent_id TEXT REFERENCES skills (id);
ALTER TABLE subs ADD COLUMN anchor_id TEXT REFERENCES skills (id);
