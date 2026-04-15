import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { AssetEditor } from '@/components/sales-engine/asset-editor'

export default async function AssetEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId, assetId } = await params
  const admin = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: asset, error } = await adminAny
    .from('sales_assets')
    .select('id, name, project_id')
    .eq('id', assetId)
    .eq('project_id', projectId)
    .single()

  if (error || !asset) notFound()

  const { data: tabs } = await adminAny
    .from('sales_asset_tabs')
    .select('id, name, content, position')
    .eq('asset_id', assetId)
    .order('position', { ascending: true })

  return (
    <div className="flex flex-col h-full min-h-0">
      <AssetEditor
        assetId={assetId}
        assetName={asset.name}
        projectId={projectId}
        initialTabs={tabs || []}
      />
    </div>
  )
}
