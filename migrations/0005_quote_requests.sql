CREATE TABLE IF NOT EXISTS quote_requests (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
 detail TEXT NOT NULL, quantity INTEGER NOT NULL, file_key TEXT, file_name TEXT,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','completed')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quote_created ON quote_requests(created_at DESC);
