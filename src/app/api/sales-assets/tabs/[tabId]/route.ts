import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tabId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tabId } = await params
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('content' in body) update.content = body.content
  if ('name' in body) update.name = body.name

  const { data, error } = await admin
    .from('sales_asset_tabs')
    .update(update)
    .eq('id', tabId)
    .select('id, name, content, position')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tab: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tabId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tabId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any
  await admin.from('sales_asset_tabs').delete().eq('id', tabId)
  return NextResponse.json({ ok: true })
}
