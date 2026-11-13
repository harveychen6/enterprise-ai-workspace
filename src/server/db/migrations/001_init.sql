CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  years TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  links TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  skills_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'done')),
  summary TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  facts_markdown TEXT NOT NULL DEFAULT '',
  todos TEXT NOT NULL DEFAULT '',
  resume_bullet TEXT NOT NULL DEFAULT '',
  org TEXT NOT NULL DEFAULT '',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  facts_updated_at TEXT,
  bullet_updated_at TEXT,
  master_synced_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_targets (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  jd_text TEXT NOT NULL DEFAULT '',
  match_score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_keywords (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  evidence_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_matches (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  relevance INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  rank INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('master', 'targeted')),
  job_id TEXT REFERENCES job_targets(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS resumes_one_master ON resumes(type) WHERE type = 'master';
CREATE UNIQUE INDEX IF NOT EXISTS resumes_one_job ON resumes(job_id) WHERE job_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS resume_items (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  included INTEGER NOT NULL DEFAULT 0,
  bullet_override TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (resume_id, project_id)
);

CREATE TABLE IF NOT EXISTS sync_proposals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  base_bullet TEXT NOT NULL,
  proposed_bullet TEXT NOT NULL,
  evidence_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'dismissed', 'rejected'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sync_interval_days INTEGER NOT NULL DEFAULT 7,
  last_master_sync_at TEXT
);
