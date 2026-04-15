import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { Lead } from '@/types/database'
import { Topbar } from '@/components/layout/topbar'
import { LeadsCRM } from '@/components/crm/leads-crm'

export default async function LeadsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  const { data: leads } = await admin
    .from('leads')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1000)

  return (
    <div className="flex flex-col h-full min-h-0">
      <Topbar title="Leads CRM" />
      <div className="flex-1 min-h-0 overflow-hidden">
        <LeadsCRM
          projectId={projectId}
          initialLeads={(leads as Lead[]) || []}
        />
      </div>
    </div>
  )
}
