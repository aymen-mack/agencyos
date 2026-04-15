-- Add campaign tracking and purchase fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_status TEXT;
-- payment_status values: 'paid' | 'payment_plan_active' | 'payment_plan_delinquent' | 'refunded'

-- Index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(project_id, campaign);
CREATE INDEX IF NOT EXISTS idx_leads_attended ON leads(project_id, attended);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(project_id, payment_status);
