-- Multi-user admin accounts with registration + owner approval.
-- Replaces the old single ADMIN_USERNAME/ADMIN_PASSWORD env-var login.

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  approved_by TEXT,
  approved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users (status);
