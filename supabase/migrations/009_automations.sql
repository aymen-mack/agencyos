-- Automations engine tables

CREATE TABLE IF NOT EXISTS automations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled Automation',
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  trigger_type TEXT,           -- e.g. 'form_submission', 'call_booked', etc.
  template_id  TEXT,           -- null = custom, else the template key
  nodes_json   JSONB NOT NULL DEFAULT '[]',
  edges_json   JSONB NOT NULL DEFAULT '[]',
  run_count    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Same policy pattern as other project-scoped tables
CREATE POLICY "project_members_automations" ON automations
  USING (
    project_id IN (
      SELECT pm.project_id
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    )
    OR
    project_id IN (
      SELECT cp.id
      FROM client_projects cp
      JOIN org_members om ON om.organization_id = cp.organization_id
      JOIN users u ON u.id = om.user_id
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
        AND om.role IN ('owner', 'admin')
    )
  );

-- Index for fast project-scoped queries
CREATE INDEX IF NOT EXISTS automations_project_id_idx ON automations (project_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_automations_updated_at();
