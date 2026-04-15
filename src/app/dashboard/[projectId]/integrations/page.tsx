import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { SettingsHub } from '@/components/settings/settings-hub'

export default async function IntegrationsPage({
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

  const { data: integrations } = await admin
    .from('integrations')
    .select('provider, status, metadata')
    .eq('project_id', projectId)

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Integrations" />
      <div className="flex-1 overflow-y-auto p-6">
        <SettingsHub
          projectId={projectId}
          integrations={(integrations || []) as { provider: string; status: string; metadata: Record<string, string> | null }[]}
        />
      </div>
    </div>
  )
}
