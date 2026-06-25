-- Blog posts. One row per post; media URLs are stored inline (no media table in v1).
-- Timestamps are epoch milliseconds. `status` is 'draft' | 'published';
-- `template` is 'standard' | 'photo-essay' | 'video-forward'.
CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  template        TEXT NOT NULL DEFAULT 'standard',
  cover_image_url TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  published_at    INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

-- Public listing filters by status and orders by publish time.
CREATE INDEX IF NOT EXISTS idx_posts_status_published_at
  ON posts (status, published_at DESC);
