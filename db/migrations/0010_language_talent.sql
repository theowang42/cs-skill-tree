-- 编程语言是一种特别的节点：天赋。树上画成六边形，面板里标“语言天赋”。
ALTER TABLE skills ADD COLUMN is_language INTEGER NOT NULL DEFAULT 0 CHECK (is_language IN (0, 1));
