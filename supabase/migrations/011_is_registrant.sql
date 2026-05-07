-- Explicit registrant flag — source of truth for the Registrants funnel stat.
-- Default false: only registration-channel events set this to true.
-- Payment-only leads (stripe/whop) never get this set, so they won't inflate the count.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_registrant BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_leads_is_registrant ON leads(project_id, is_registrant);
