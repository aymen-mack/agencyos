import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const { data: asset, error } = await admin
    .from('sales_assets')
    .select('id, name, created_at, updated_at')
    .eq('id', assetId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: tabs } = await admin
    .from('sales_asset_tabs')
    .select('id, name, content, position')
    .eq('asset_id', assetId)
    .order('position', { ascending: true })

  return NextResponse.json({ asset: { ...asset, tabs: tabs || [] } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId } = await params
  const { name } = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const { data, error } = await admin
    .from('sales_assets')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', assetId)
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any
  await admin.from('sales_assets').delete().eq('id', assetId)
  return NextResponse.json({ ok: true })
}
