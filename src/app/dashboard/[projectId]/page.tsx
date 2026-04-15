import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { RealtimeIndicator } from '@/components/dashboard/realtime-indicator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab } from '@/components/dashboard/overview/overview-tab'
import { WebinarTab } from '@/components/dashboard/webinar-tab'
import { AdSpendTab } from '@/components/dashboard/ad-spend-tab'
import { EmailTab } from '@/components/dashboard/email-tab'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  const { data: project } = await admin
    .from('client_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full">
      <Topbar project={project}>
        <RealtimeIndicator />
      </Topbar>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="overview" className="h-full">
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-6">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {[
                { value: 'overview',  label: 'Overview'        },
                { value: 'webinar',   label: 'Webinar Data'    },
                { value: 'adspend',   label: 'Ad Spend'        },
                { value: 'email',     label: 'Email Marketing' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:text-foreground data-[state=active]:bg-transparent text-muted-foreground px-4 py-3 text-sm font-medium transition-colors"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 p-6">
            <OverviewTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="webinar" className="mt-0 p-6">
            <WebinarTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="adspend" className="mt-0 p-6">
            <AdSpendTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="email" className="mt-0 p-6">
            <EmailTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
