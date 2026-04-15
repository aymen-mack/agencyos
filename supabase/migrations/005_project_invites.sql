-- Project invites
CREATE TABLE project_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer',  -- admin | editor | viewer
  token       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | accepted
  invited_by  TEXT,  -- clerk user id of inviter
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

CREATE INDEX idx_project_invites_project_id ON project_invites(project_id);
CREATE INDEX idx_project_invites_token ON project_invites(token);

ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_invites_select" ON project_invites FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "project_invites_manage" ON project_invites FOR ALL USING (can_access_project(project_id));

-- Also update project_members role default to match new roles
-- (existing 'viewer' maps to our new 'visitor' concept — kept as-is for compat)
