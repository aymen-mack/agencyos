-- Delivery Flow: visual node-based workflow canvas per project
-- Nodes represent deliverables; edges represent dependencies; tasks are sub-checklist items

CREATE TABLE delivery_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  node_type     TEXT NOT NULL DEFAULT 'custom',
  status        TEXT NOT NULL DEFAULT 'ready',
  assignee_id   TEXT,
  position_x    FLOAT NOT NULL DEFAULT 100,
  position_y    FLOAT NOT NULL DEFAULT 100,
  manual_unlock BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_nodes_project_id ON delivery_nodes(project_id);

ALTER TABLE delivery_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_nodes_select" ON delivery_nodes FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "delivery_nodes_insert" ON delivery_nodes FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "delivery_nodes_update" ON delivery_nodes FOR UPDATE USING (can_access_project(project_id));
CREATE POLICY "delivery_nodes_delete" ON delivery_nodes FOR DELETE USING (can_access_project(project_id));

CREATE TABLE delivery_edges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES delivery_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES delivery_nodes(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX idx_delivery_edges_project_id ON delivery_edges(project_id);
CREATE INDEX idx_delivery_edges_source     ON delivery_edges(source_node_id);
CREATE INDEX idx_delivery_edges_target     ON delivery_edges(target_node_id);

ALTER TABLE delivery_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_edges_select" ON delivery_edges FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "delivery_edges_insert" ON delivery_edges FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "delivery_edges_delete" ON delivery_edges FOR DELETE USING (can_access_project(project_id));

CREATE TABLE delivery_node_tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id     UUID NOT NULL REFERENCES delivery_nodes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo',
  assignee_id TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_node_tasks_node_id ON delivery_node_tasks(node_id);

ALTER TABLE delivery_node_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_tasks_select" ON delivery_node_tasks FOR SELECT
  USING (can_access_project((SELECT project_id FROM delivery_nodes WHERE id = node_id)));
CREATE POLICY "delivery_tasks_insert" ON delivery_node_tasks FOR INSERT
  WITH CHECK (can_access_project((SELECT project_id FROM delivery_nodes WHERE id = node_id)));
CREATE POLICY "delivery_tasks_update" ON delivery_node_tasks FOR UPDATE
  USING (can_access_project((SELECT project_id FROM delivery_nodes WHERE id = node_id)));
CREATE POLICY "delivery_tasks_delete" ON delivery_node_tasks FOR DELETE
  USING (can_access_project((SELECT project_id FROM delivery_nodes WHERE id = node_id)));
