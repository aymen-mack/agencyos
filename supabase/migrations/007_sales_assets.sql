-- Sales assets (folders) scoped per project
CREATE TABLE sales_assets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabs (pages) inside a sales asset
CREATE TABLE sales_asset_tabs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id   UUID        NOT NULL REFERENCES sales_assets(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'Untitled',
  content    TEXT        NOT NULL DEFAULT '',
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_assets_project ON sales_assets(project_id);
CREATE INDEX idx_sales_asset_tabs_asset ON sales_asset_tabs(asset_id);
