import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { ProjectSettings } from '@/components/settings/project-settings'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  const { data: project } = await admin
    .from('client_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const { data: members } = await admin
    .from('project_members')
    .select('*, user:users(id, email, full_name, clerk_user_id)')
    .eq('project_id', projectId)

  const { data: invites } = await admin
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <ProjectSettings
          project={project}
          initialMembers={(members || []) as Parameters<typeof ProjectSettings>[0]['initialMembers']}
          initialInvites={(invites || []) as Parameters<typeof ProjectSettings>[0]['initialInvites']}
        />
      </div>
    </div>
  )
}
