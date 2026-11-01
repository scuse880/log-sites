PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS storage_usage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO storage_usage(id) VALUES(1);
CREATE TABLE IF NOT EXISTS daily_usage (
  day TEXT PRIMARY KEY,
  uploads INTEGER NOT NULL DEFAULT 0 CHECK (uploads >= 0)
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size BETWEEN 0 AND 100000000),
  content_type TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  multipart_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('pending','completing','ready','deleting','aborting')),
  committed INTEGER NOT NULL DEFAULT 0 CHECK(committed IN (0,1)),
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  uploaded_at INTEGER,
  expires_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  session_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS uploads_state_expiry ON uploads(state, expires_at);
CREATE INDEX IF NOT EXISTS uploads_order ON uploads(state, sort_order, uploaded_at);
CREATE TABLE IF NOT EXISTS upload_parts (
  upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  etag TEXT,
  PRIMARY KEY(upload_id, part_number)
);
CREATE TRIGGER IF NOT EXISTS reserve_upload BEFORE INSERT ON uploads BEGIN
  SELECT CASE WHEN (SELECT used_bytes + reserved_bytes FROM storage_usage WHERE id=1) + NEW.size > 5000000000
    THEN RAISE(ABORT, 'storage_limit') END;
  SELECT CASE WHEN COALESCE((SELECT uploads FROM daily_usage WHERE day=NEW.day),0) >= 30
    THEN RAISE(ABORT, 'daily_limit') END;
END;
CREATE TRIGGER IF NOT EXISTS charge_reservation AFTER INSERT ON uploads BEGIN
  UPDATE storage_usage SET reserved_bytes=reserved_bytes+NEW.size WHERE id=1;
  INSERT INTO daily_usage(day, uploads) VALUES(NEW.day,1)
    ON CONFLICT(day) DO UPDATE SET uploads=uploads+1;
END;
CREATE TRIGGER IF NOT EXISTS commit_reservation AFTER UPDATE OF committed ON uploads
WHEN OLD.committed=0 AND NEW.committed=1 BEGIN
  UPDATE storage_usage SET reserved_bytes=reserved_bytes-NEW.size, used_bytes=used_bytes+NEW.size, revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS hide_deleted_upload AFTER UPDATE OF state ON uploads
WHEN OLD.state='ready' AND NEW.state<>'ready' BEGIN
  UPDATE storage_usage SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS release_upload AFTER DELETE ON uploads BEGIN
  UPDATE storage_usage SET
    reserved_bytes=reserved_bytes-CASE WHEN OLD.committed=0 THEN OLD.size ELSE 0 END,
    used_bytes=used_bytes-CASE WHEN OLD.committed=1 THEN OLD.size ELSE 0 END,
    revision=revision+CASE WHEN OLD.committed=1 THEN 1 ELSE 0 END WHERE id=1;
  UPDATE daily_usage SET uploads=uploads-1 WHERE day=OLD.day AND OLD.committed=0;
END;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('public','private')),
  preference_set INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
