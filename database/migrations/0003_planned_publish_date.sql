-- Visionhub V2.2
-- Separate WORK planned date from actual platform publish date.
--
-- IMPORTANT: apply this migration before Phase 3 Meta sync.
-- At the current project state, contents.publish_date contains the old WORK
-- "วันที่ต้องลง" values. Move them into planned_publish_date, then clear
-- publish_date so it can only be populated from a real platform timestamp.

ALTER TABLE contents ADD COLUMN planned_publish_date TEXT;

UPDATE contents
SET planned_publish_date = publish_date
WHERE publish_date IS NOT NULL
  AND publish_date <> '';

UPDATE contents
SET publish_date = NULL;

CREATE INDEX IF NOT EXISTS idx_contents_planned_publish_date
ON contents(planned_publish_date);
