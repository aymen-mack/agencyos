import { RealtimeProvider } from '@/components/providers/realtime-provider'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <RealtimeProvider projectId={projectId}>
      {children}
    </RealtimeProvider>
  )
}
