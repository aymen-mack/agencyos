-- Link delivery tasks to Sales Engine assets for rich-text copy review
ALTER TABLE delivery_node_tasks
  ADD COLUMN sales_asset_id UUID REFERENCES sales_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_delivery_tasks_asset ON delivery_node_tasks(sales_asset_id);
