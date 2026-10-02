PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  lark_record_id TEXT UNIQUE,
  title TEXT NOT NULL,
  product TEXT NOT NULL DEFAULT 'Corporate',
  project TEXT,
  content_type TEXT,
  purpose TEXT,
  platform TEXT,
  format TEXT,
  production_level TEXT,
  camera_required TEXT,
  camera_used TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'IDEA',
  shoot_date TEXT,
  publish_date TEXT,
  script TEXT,
  cta TEXT,
  source_url TEXT,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_product ON contents(product);
CREATE INDEX IF NOT EXISTS idx_contents_publish_date ON contents(publish_date);

CREATE TABLE IF NOT EXISTS platform_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT,
  platform TEXT NOT NULL,
  external_post_id TEXT NOT NULL,
  url TEXT,
  caption TEXT,
  published_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, external_post_id),
  FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_posts_content ON platform_posts(content_id);

CREATE TABLE IF NOT EXISTS performance_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT,
  platform TEXT NOT NULL,
  external_post_id TEXT,
  snapshot_at TEXT NOT NULL DEFAULT (datetime('now')),
  views INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  appointments INTEGER DEFAULT 0,
  closed INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  raw_json TEXT,
  FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_perf_content ON performance_snapshots(content_id);
CREATE INDEX IF NOT EXISTS idx_perf_platform ON performance_snapshots(platform);
CREATE INDEX IF NOT EXISTS idx_perf_snapshot ON performance_snapshots(snapshot_at);

CREATE TABLE IF NOT EXISTS ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'CONTENT_QA',
  overall_score REAL,
  hook_score REAL,
  clarity_score REAL,
  proof_score REAL,
  cta_score REAL,
  brand_score REAL,
  visual_score REAL,
  summary TEXT,
  recommendations TEXT,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_content ON ai_reviews(content_id);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  items_processed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
