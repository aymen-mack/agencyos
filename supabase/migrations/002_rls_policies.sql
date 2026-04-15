-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current Clerk user to internal UUID
-- JWT sub = Clerk user ID. Supabase receives Clerk JWT.
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE clerk_user_id = auth.jwt()->>'sub' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: is user member of org?
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id AND user_id = auth_user_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: org role for current user
CREATE OR REPLACE FUNCTION org_role(org_id UUID) RETURNS TEXT AS $$
  SELECT role FROM org_members
  WHERE organization_id = org_id AND user_id = auth_user_id() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: can current user access this project?
-- Org member (any role) OR explicit project member
CREATE OR REPLACE FUNCTION can_access_project(proj_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_projects cp
    JOIN org_members om ON om.organization_id = cp.organization_id
    WHERE cp.id = proj_id AND om.user_id = auth_user_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- organizations
CREATE POLICY "org_select" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (org_role(id) IN ('owner', 'admin'));

-- users: can see self + co-members
CREATE POLICY "user_select_self" ON users FOR SELECT USING (clerk_user_id = auth.jwt()->>'sub');
CREATE POLICY "user_select_org_members" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM org_members om1
    JOIN org_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth_user_id() AND om2.user_id = users.id
  )
);

-- org_members
CREATE POLICY "org_members_select" ON org_members FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT WITH CHECK (org_role(organization_id) IN ('owner', 'admin'));
CREATE POLICY "org_members_delete" ON org_members FOR DELETE USING (org_role(organization_id) IN ('owner', 'admin'));

-- client_projects
CREATE POLICY "projects_select" ON client_projects FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "projects_insert" ON client_projects FOR INSERT WITH CHECK (org_role(organization_id) IN ('owner', 'admin'));
CREATE POLICY "projects_update" ON client_projects FOR UPDATE USING (org_role(organization_id) IN ('owner', 'admin'));
CREATE POLICY "projects_delete" ON client_projects FOR DELETE USING (org_role(organization_id) = 'owner');

-- project_members
CREATE POLICY "proj_members_select" ON project_members FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "proj_members_manage" ON project_members FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- integrations
CREATE POLICY "integrations_select" ON integrations FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "integrations_manage" ON integrations FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- leads
CREATE POLICY "leads_select" ON leads FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (can_access_project(project_id));

-- lead_events
CREATE POLICY "lead_events_select" ON lead_events FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "lead_events_insert" ON lead_events FOR INSERT WITH CHECK (can_access_project(project_id));

-- webinar_metrics
CREATE POLICY "webinar_metrics_select" ON webinar_metrics FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "webinar_metrics_manage" ON webinar_metrics FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- ad_metrics
CREATE POLICY "ad_metrics_select" ON ad_metrics FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "ad_metrics_manage" ON ad_metrics FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- email_metrics
CREATE POLICY "email_metrics_select" ON email_metrics FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "email_metrics_manage" ON email_metrics FOR ALL USING (
  org_role((SELECT organization_id FROM client_projects WHERE id = project_id)) IN ('owner', 'admin')
);

-- sales
CREATE POLICY "sales_select" ON sales FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "sales_manage" ON sales FOR ALL USING (can_access_project(project_id));
