import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get('page') || '1', 10)
  const limit = parseInt(sp.get('limit') || '25', 10)
  const status = sp.get('status') || 'all'
  const search = sp.get('search') || ''
  const sort = sp.get('sort') || 'created_at'
  const dir = sp.get('dir') === 'asc' ? true : false
  const start = sp.get('start')
  const end = sp.get('end')

  const admin = createSupabaseAdminClient() as AnyClient
  let query = admin
    .from('leads')
    .select('id,full_name,email,phone,source,status,campaign,attended,purchase_amount,payment_status,created_at', { count: 'exact' })
    .eq('project_id', projectId)

  if (status !== 'all') query = query.eq('status', status)
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (start) query = query.gte('created_at', new Date(start).toISOString())
  if (end) query = query.lte('created_at', new Date(end).toISOString())

  const allowedSortFields = ['created_at', 'full_name', 'email', 'source', 'status', 'campaign', 'purchase_amount']
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at'
  query = query.order(sortField, { ascending: dir })

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ leads: data || [], total: count || 0, page, limit })
}
