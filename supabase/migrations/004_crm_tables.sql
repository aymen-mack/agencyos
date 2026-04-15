-- Lead notes (timestamped, per author)
CREATE TABLE lead_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  author_name TEXT,
  author_clerk_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_project_id ON lead_notes(project_id);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_notes_select" ON lead_notes FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "lead_notes_insert" ON lead_notes FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "lead_notes_delete" ON lead_notes FOR DELETE USING (can_access_project(project_id));

ALTER PUBLICATION supabase_realtime ADD TABLE lead_notes;

-- Custom field definitions per project
CREATE TABLE custom_fields (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',  -- text | number | dropdown | date | checkbox
  options    JSONB DEFAULT '[]',
  position   INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_fields_select" ON custom_fields FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "custom_fields_manage" ON custom_fields FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- Custom field values per lead
CREATE TABLE lead_custom_values (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id   UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, field_id)
);

ALTER TABLE lead_custom_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_custom_values_select" ON lead_custom_values FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "lead_custom_values_manage" ON lead_custom_values FOR ALL USING (can_access_project(project_id));

ALTER PUBLICATION supabase_realtime ADD TABLE lead_custom_values;
