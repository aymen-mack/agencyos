import { currentUser } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { Topbar } from '@/components/layout/topbar'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClientProject } from '@/types/database'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const admin = createSupabaseAdminClient()

  const { data: dbUser } = await admin
    .from('users')
    .select('id')
    .eq('clerk_user_id', user.id)
    .single()

  let projects: ClientProject[] = []
  let isOrgOwner = false

  if (dbUser) {
    const { data: orgMemberships } = await admin
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', dbUser.id)

    const ownerOrgIds = (orgMemberships || [])
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => m.organization_id)

    isOrgOwner = ownerOrgIds.length > 0

    if (ownerOrgIds.length > 0) {
      const { data } = await admin
        .from('client_projects')
        .select('*')
        .in('organization_id', ownerOrgIds)
        .order('created_at', { ascending: false })
      projects = (data || []) as ClientProject[]
    }

    // Also include projects via direct project_members (invited users)
    const { data: projectMemberships } = await admin
      .from('project_members')
      .select('project_id')
      .eq('user_id', dbUser.id)

    const memberProjectIds = (projectMemberships || []).map((m) => m.project_id)
    const existingIds = new Set(projects.map((p) => p.id))
    const missingIds = memberProjectIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      const { data } = await admin
        .from('client_projects')
        .select('*')
        .in('id', missingIds)
        .order('created_at', { ascending: false })
      projects = [...projects, ...((data || []) as ClientProject[])]
    }

    // If invited user has exactly 1 project, redirect them straight there
    if (!isOrgOwner && projects.length === 1) {
      redirect(`/dashboard/${projects[0].id}`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="All Projects">
        {isOrgOwner && (
          <Link href="/admin/projects/new">
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </Link>
        )}
      </Topbar>

      <div className="flex-1 p-6">
        {!projects.length ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first client project to get started.</p>
            </div>
            <Link href="/admin/projects/new">
              <Button size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/${project.id}`}>
                <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </p>
                      {project.client_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.client_name}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs capitalize flex-shrink-0',
                        project.status === 'active'
                          ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                          : 'text-zinc-400 border-zinc-400/20'
                      )}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
