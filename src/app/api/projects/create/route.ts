import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, clientName } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  // Find org by Clerk user ID (owner) if orgId not set
  let org = null

  if (orgId) {
    const { data } = await admin
      .from('organizations')
      .select('id')
      .eq('clerk_org_id', orgId)
      .single()
    org = data
  }

  // Fallback: find any org this user belongs to
  if (!org) {
    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (user) {
      const { data: member } = await admin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (member) {
        const { data: foundOrg } = await admin
          .from('organizations')
          .select('id')
          .eq('id', member.organization_id)
          .single()
        org = foundOrg
      }
    }
  }

  if (!org) {
    return NextResponse.json({ error: 'Organization not found. Make sure your org is synced.' }, { status: 404 })
  }

  const slug = slugify(name)

  const { data: project, error } = await admin
    .from('client_projects')
    .insert({
      organization_id: org.id,
      name: name.trim(),
      slug,
      client_name: clientName?.trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ projectId: project.id })
}
