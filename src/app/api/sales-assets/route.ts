import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('sales_assets')
    .select('id, name, created_at, updated_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, name, tabs } = await req.json()
  if (!projectId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const { data: asset, error: assetErr } = await admin
    .from('sales_assets')
    .insert({ project_id: projectId, name })
    .select('id, name, created_at')
    .single()

  if (assetErr) return NextResponse.json({ error: assetErr.message }, { status: 500 })

  const tabRows = (tabs as { name: string }[] || [{ name: 'Page 1' }]).map((t, i) => ({
    asset_id: asset.id,
    name: t.name || `Page ${i + 1}`,
    content: '',
    position: i,
  }))

  const { data: createdTabs, error: tabErr } = await admin
    .from('sales_asset_tabs')
    .insert(tabRows)
    .select('id, name, content, position')

  if (tabErr) return NextResponse.json({ error: tabErr.message }, { status: 500 })

  return NextResponse.json({ asset: { ...asset, tabs: createdTabs } })
}
