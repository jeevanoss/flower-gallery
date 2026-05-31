-- Run with: wrangler d1 execute flower-db --file=schema.sql

CREATE TABLE IF NOT EXISTS flowers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT NOT NULL,
  date       TEXT NOT NULL,
  category   TEXT DEFAULT '',
  species    TEXT DEFAULT '',
  tags       TEXT DEFAULT '[]',
  image_url  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id   TEXT NOT NULL,
  flower_id TEXT NOT NULL,
  PRIMARY KEY (user_id, flower_id)
);

CREATE INDEX IF NOT EXISTS idx_flowers_category ON flowers(category);
CREATE INDEX IF NOT EXISTS idx_flowers_date     ON flowers(date DESC);
CREATE INDEX IF NOT EXISTS idx_flowers_user     ON flowers(user_id);
