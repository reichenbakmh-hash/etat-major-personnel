PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  access_tier TEXT NOT NULL DEFAULT 'personal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  workspace_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'short',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'generated',
  priority INTEGER NOT NULL DEFAULT 50,
  urgency INTEGER NOT NULL DEFAULT 50,
  risk INTEGER NOT NULL DEFAULT 50,
  feasibility INTEGER NOT NULL DEFAULT 50,
  cost INTEGER NOT NULL DEFAULT 50,
  impact INTEGER NOT NULL DEFAULT 50,
  flexibility INTEGER NOT NULL DEFAULT 50,
  resilience INTEGER NOT NULL DEFAULT 50,
  horizon TEXT NOT NULL DEFAULT 'medium',
  due_at TEXT,
  parent_type TEXT,
  parent_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  meta_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_missions_workspace_updated_at ON missions(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated_at ON projects(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_updated_at ON campaigns(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_objectives_workspace_updated_at ON objectives(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_updated_at ON tasks(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_workspace_updated_at ON resources(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_workspace_updated_at ON decisions(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_workspace_updated_at ON scenarios(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_workspace_created_at ON history(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_workspace_key ON settings(workspace_id, key);
