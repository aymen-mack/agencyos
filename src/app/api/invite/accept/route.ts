import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  type InviteRow = {
    id: string; project_id: string; email: string; role: string; token: string
    status: string; expires_at: string; accepted_by: string | null
    project: { id: string; name: string; organization_id: string } | null
  }

  // Look up the invite
  const { data: invite, error: inviteErr } = await admin
    .from('project_invites')
    .select('*, project:client_projects(id, name, organization_id)')
    .eq('token', token)
    .eq('status', 'pending')
    .single() as { data: InviteRow | null; error: unknown }

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Find (or create) the internal user record for this Clerk user
  // The Clerk webhook may not have fired yet if the user just signed up
  let { data: user } = await admin
    .from('users')
    .select('id, email')
    .eq('clerk_user_id', userId)
    .single()

  if (!user) {
    // Webhook hasn't synced yet — create the user record now from Clerk data
    const clerkUser = await currentUser()
    if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const emails = clerkUser.emailAddresses
    const primaryEmail = emails.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
      ?? emails[0]?.emailAddress ?? ''

    const { data: created } = await admin
      .from('users')
      .upsert({
        clerk_user_id: userId,
        email: primaryEmail,
        full_name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
        avatar_url: clerkUser.imageUrl || null,
      }, { onConflict: 'clerk_user_id' })
      .select('id, email')
      .single()

    if (!created) return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    user = created
  }

  // Verify email matches (case-insensitive)
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({
      error: `This invite was sent to ${invite.email}. You're signed in as ${user.email}.`
    }, { status: 403 })
  }

  const project = invite.project as { id: string; name: string; organization_id: string } | null
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Add user to org_members if not already there
  await admin
    .from('org_members')
    .upsert({
      organization_id: project.organization_id,
      user_id: user.id,
      role: invite.role === 'admin' ? 'admin' : 'member',
    }, { onConflict: 'organization_id,user_id' })

  // Add to project_members
  await admin
    .from('project_members')
    .upsert({
      project_id: project.id,
      user_id: user.id,
      role: invite.role,
    }, { onConflict: 'project_id,user_id' })

  // Mark invite as accepted
  await admin
    .from('project_invites')
    .update({ status: 'accepted', accepted_by: user.id })
    .eq('id', invite.id)

  return NextResponse.json({ projectId: project.id, projectName: project.name })
}
