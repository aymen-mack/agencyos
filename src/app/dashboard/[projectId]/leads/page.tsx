import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { LeadsCRM } from '@/components/crm/leads-crm'

export default async function LeadsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params

  return (
    <div className="flex flex-col h-full min-h-0">
      <Topbar title="Leads CRM" />
      <div className="flex-1 min-h-0 overflow-hidden">
        <LeadsCRM projectId={projectId} />
      </div>
    </div>
  )
}
