import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId } = await params
  const { name } = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const { data: existing } = await admin
    .from('sales_asset_tabs')
    .select('position')
    .eq('asset_id', assetId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing?.[0] ? (existing[0].position as number) + 1 : 0

  const { data, error } = await admin
    .from('sales_asset_tabs')
    .insert({ asset_id: assetId, name: name || 'Untitled', content: '', position })
    .select('id, name, content, position')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tab: data })
}
