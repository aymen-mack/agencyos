CREATE TABLE IF NOT EXISTS tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  section     TEXT NOT NULL DEFAULT 'General',
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo','in_progress','done','blocked')),
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_parent_id_idx  ON tasks(parent_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  project_id IN (
    SELECT id FROM client_projects WHERE org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM client_projects WHERE org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  project_id IN (
    SELECT id FROM client_projects WHERE org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  project_id IN (
    SELECT id FROM client_projects WHERE org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
