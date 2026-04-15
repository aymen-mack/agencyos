-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (mirrors Clerk orgs)
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  plan         TEXT NOT NULL DEFAULT 'starter',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Users (mirrors Clerk users, auto-synced via webhook)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Org membership
CREATE TABLE org_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Client projects (belong to an org)
CREATE TABLE client_projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  client_name     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Project members (subset of org members with project-level roles)
CREATE TABLE project_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Integrations (per project)
CREATE TABLE integrations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider)
);

-- Leads
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  source          TEXT,
  source_ref      TEXT,
  score           INT NOT NULL DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'new',
  survey_data     JSONB DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- Lead events (timeline of touchpoints)
CREATE TABLE lead_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB DEFAULT '{}',
  score_delta INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Webinar metrics
CREATE TABLE webinar_metrics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  webinar_id        TEXT,
  date              DATE NOT NULL,
  registrants       INT DEFAULT 0,
  attendees         INT DEFAULT 0,
  show_rate         NUMERIC(5,2) DEFAULT 0,
  vip_tickets       INT DEFAULT 0,
  surveys_filled    INT DEFAULT 0,
  whatsapp_joins    INT DEFAULT 0,
  telegram_joins    INT DEFAULT 0,
  replay_views      INT DEFAULT 0,
  applicants        INT DEFAULT 0,
  calls_booked      INT DEFAULT 0,
  calls_showed      INT DEFAULT 0,
  deals_closed      INT DEFAULT 0,
  avg_contract_val  NUMERIC(12,2) DEFAULT 0,
  total_cash        NUMERIC(12,2) DEFAULT 0,
  total_revenue     NUMERIC(12,2) DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, webinar_id, date)
);

-- Ad metrics (daily snapshots)
CREATE TABLE ad_metrics (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL,
  campaign_id         TEXT,
  ad_set_id           TEXT,
  date                DATE NOT NULL,
  spend               NUMERIC(12,2) DEFAULT 0,
  impressions         INT DEFAULT 0,
  cpm                 NUMERIC(12,4) DEFAULT 0,
  clicks              INT DEFAULT 0,
  cpc                 NUMERIC(12,4) DEFAULT 0,
  landing_page_views  INT DEFAULT 0,
  cpr                 NUMERIC(12,4) DEFAULT 0,
  signups             INT DEFAULT 0,
  leads               INT DEFAULT 0,
  conversions         INT DEFAULT 0,
  revenue             NUMERIC(12,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, platform, campaign_id, ad_set_id, date)
);

-- Email metrics
CREATE TABLE email_metrics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'kit',
  campaign_id   TEXT,
  sequence_id   TEXT,
  date          DATE NOT NULL,
  sent          INT DEFAULT 0,
  delivered     INT DEFAULT 0,
  opens         INT DEFAULT 0,
  clicks        INT DEFAULT 0,
  unsubscribes  INT DEFAULT 0,
  signups       INT DEFAULT 0,
  open_rate     NUMERIC(5,2) DEFAULT 0,
  click_rate    NUMERIC(5,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider, campaign_id, sequence_id, date)
);

-- Sales / pipeline
CREATE TABLE sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  stage       TEXT NOT NULL DEFAULT 'discovery',
  value       NUMERIC(12,2) DEFAULT 0,
  close_date  DATE,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_project_id ON leads(project_id);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX idx_lead_events_project_id ON lead_events(project_id);
CREATE INDEX idx_ad_metrics_project_date ON ad_metrics(project_id, date DESC);
CREATE INDEX idx_email_metrics_project_date ON email_metrics(project_id, date DESC);
CREATE INDEX idx_webinar_metrics_project_date ON webinar_metrics(project_id, date DESC);
CREATE INDEX idx_sales_project_id ON sales(project_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_client_projects_updated_at BEFORE UPDATE ON client_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
