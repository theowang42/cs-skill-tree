-- 播种结束，删掉 00_helpers.sql 建的临时视图（触发器会跟着视图一起删掉）
DROP VIEW temp.area_rows;
DROP VIEW temp.concept_rows;
DROP VIEW temp.tool_rows;
DROP VIEW temp.resource_rows;
DROP VIEW temp.category_rows;
DROP VIEW temp.sub_rows;
