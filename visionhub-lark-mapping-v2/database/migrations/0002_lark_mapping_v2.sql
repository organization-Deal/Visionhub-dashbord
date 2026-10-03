ALTER TABLE contents ADD COLUMN content_code TEXT;
ALTER TABLE contents ADD COLUMN cameraman TEXT;
ALTER TABLE contents ADD COLUMN editor TEXT;
ALTER TABLE contents ADD COLUMN reviewer TEXT;
ALTER TABLE contents ADD COLUMN location TEXT;
ALTER TABLE contents ADD COLUMN hook TEXT;
ALTER TABLE contents ADD COLUMN key_message TEXT;
ALTER TABLE contents ADD COLUMN shot_list TEXT;
ALTER TABLE contents ADD COLUMN notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_content_code
ON contents(content_code)
WHERE content_code IS NOT NULL AND content_code <> '';
