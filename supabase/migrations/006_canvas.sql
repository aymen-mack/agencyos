-- Canvas nodes
CREATE TABLE canvas_nodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'text_note',  -- text_note | url_resource | file_upload | ai_analysis
  position_x  FLOAT NOT NULL DEFAULT 100,
  position_y  FLOAT NOT NULL DEFAULT 100,
  content     TEXT,           -- main text content (note, fetched URL text, file text, AI output)
  node_config JSONB DEFAULT '{}',  -- type-specific config (url, instruction, label, fileName, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvas_nodes_project_id ON canvas_nodes(project_id);

ALTER TABLE canvas_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_nodes_select" ON canvas_nodes FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "canvas_nodes_insert" ON canvas_nodes FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "canvas_nodes_update" ON canvas_nodes FOR UPDATE USING (can_access_project(project_id));
CREATE POLICY "canvas_nodes_delete" ON canvas_nodes FOR DELETE USING (can_access_project(project_id));

-- Canvas edges
CREATE TABLE canvas_edges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  source_node_id  UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX idx_canvas_edges_project_id ON canvas_edges(project_id);
CREATE INDEX idx_canvas_edges_source ON canvas_edges(source_node_id);
CREATE INDEX idx_canvas_edges_target ON canvas_edges(target_node_id);

ALTER TABLE canvas_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_edges_select" ON canvas_edges FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "canvas_edges_insert" ON canvas_edges FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "canvas_edges_delete" ON canvas_edges FOR DELETE USING (can_access_project(project_id));

-- Canvas AI outputs (history of AI Analysis runs)
CREATE TABLE canvas_outputs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id         UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  output_content  TEXT NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvas_outputs_node_id ON canvas_outputs(node_id);

ALTER TABLE canvas_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_outputs_select" ON canvas_outputs FOR SELECT
  USING (can_access_project((SELECT project_id FROM canvas_nodes WHERE id = node_id)));
CREATE POLICY "canvas_outputs_insert" ON canvas_outputs FOR INSERT
  WITH CHECK (can_access_project((SELECT project_id FROM canvas_nodes WHERE id = node_id)));
