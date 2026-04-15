import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { Topbar } from '@/components/layout/topbar'
import { AutomationsHub } from '@/components/automations/automations-hub'

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params
  const admin = createSupabaseAdminClient() as any

  const { data: project } = await admin
    .from('client_projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const { data: automations } = await admin
    .from('automations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Automations" />
      <div className="flex-1 overflow-hidden">
        <AutomationsHub
          projectId={projectId}
          initialAutomations={automations || []}
        />
      </div>
    </div>
  )
}
