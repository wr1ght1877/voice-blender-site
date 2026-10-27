-- Voice Blender waitlist (Cloudflare D1). Safe to run more than once.
CREATE TABLE IF NOT EXISTS signups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  code        TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  referrals   INTEGER NOT NULL DEFAULT 0,
  ip_hash     TEXT,
  source      TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_signups_referred_by ON signups(referred_by);
CREATE INDEX IF NOT EXISTS idx_signups_ip_created ON signups(ip_hash, created_at);
