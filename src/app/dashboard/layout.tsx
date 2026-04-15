import { auth, currentUser } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/sidebar'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId?: string }>
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const admin = createSupabaseAdminClient()

  // Get internal user record
  const { data: dbUser } = await admin
    .from('users')
    .select('id')
    .eq('clerk_user_id', user.id)
    .single()

  let projects: import('@/types/database').ClientProject[] = []

  if (dbUser) {
    // Check if user is an org owner/admin — if so, show all org projects
    const { data: orgMemberships } = await admin
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', dbUser.id)

    const ownerOrgIds = (orgMemberships || [])
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => m.organization_id)

    // Also get projects this user is explicitly a project_member of
    const { data: projectMemberships } = await admin
      .from('project_members')
      .select('project_id')
      .eq('user_id', dbUser.id)

    const memberProjectIds = (projectMemberships || []).map((m) => m.project_id)

    if (ownerOrgIds.length > 0) {
      // Org owners see all projects in their orgs
      const { data } = await admin
        .from('client_projects')
        .select('*')
        .in('organization_id', ownerOrgIds)
        .order('created_at', { ascending: false })
      projects = (data || []) as import('@/types/database').ClientProject[]
    }

    if (memberProjectIds.length > 0) {
      // Invited users see only their explicitly assigned projects (deduplicated)
      const existingIds = new Set(projects.map((p) => p.id))
      const missingIds = memberProjectIds.filter((id) => !existingIds.has(id))
      if (missingIds.length > 0) {
        const { data } = await admin
          .from('client_projects')
          .select('*')
          .in('id', missingIds)
          .order('created_at', { ascending: false })
        projects = [...projects, ...((data || []) as import('@/types/database').ClientProject[])]
      }
    }
  }

  // Extract projectId from the URL on the server
  const resolvedParams = await params
  const projectId = resolvedParams?.projectId

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        projects={projects}
        currentProjectId={projectId}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
