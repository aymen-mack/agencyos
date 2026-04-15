import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadIds, action, data } = await req.json()

  if (!leadIds?.length || !action) {
    return NextResponse.json({ error: 'leadIds and action required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  if (action === 'delete') {
    const { error } = await admin.from('leads').delete().in('id', leadIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: leadIds.length })
  }

  if (action === 'update_status') {
    const { error } = await admin
      .from('leads')
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .in('id', leadIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_tag') {
    // Fetch current tags and append
    const { data: leads } = await admin.from('leads').select('id, tags').in('id', leadIds)
    for (const lead of leads || []) {
      const tags = Array.from(new Set([...(lead.tags || []), data.tag]))
      await admin.from('leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', lead.id)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_tag') {
    const { data: leads } = await admin.from('leads').select('id, tags').in('id', leadIds)
    for (const lead of leads || []) {
      const tags = (lead.tags || []).filter((t: string) => t !== data.tag)
      await admin.from('leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', lead.id)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
