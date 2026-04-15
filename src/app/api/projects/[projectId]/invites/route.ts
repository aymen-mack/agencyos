import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  const { data: invites, error } = await admin
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invites: invites || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const { email, role } = await req.json()

  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const token = randomBytes(32).toString('hex')

  // Fetch project name for the email
  const { data: project } = await admin
    .from('client_projects')
    .select('name')
    .eq('id', projectId)
    .single()

  // Get inviter name
  const inviter = await currentUser()
  const inviterName = inviter
    ? ([inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.emailAddresses[0]?.emailAddress || 'Someone')
    : 'Someone'

  // Upsert: if pending invite exists for this email+project, refresh it
  const { data: invite, error } = await admin
    .from('project_invites')
    .upsert({
      project_id: projectId,
      email: email.trim().toLowerCase(),
      role: role || 'viewer',
      token,
      status: 'pending',
      invited_by: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'project_id,email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invite.token}`
  const projectName = project?.name || 'a project'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Visitor'

  // Send email via Resend
  if (resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email.trim().toLowerCase(),
      subject: `${inviterName} invited you to ${projectName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
          <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">You've been invited</h1>
          <p style="color:#a1a1aa;margin:0 0 24px;font-size:14px;">
            <strong style="color:#e5e5e5;">${inviterName}</strong> invited you to join
            <strong style="color:#e5e5e5;">${projectName}</strong> as <strong style="color:#e5e5e5;">${roleLabel}</strong>.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            Accept Invitation
          </a>
          <p style="color:#52525b;font-size:12px;margin:24px 0 0;">
            This invite expires in 7 days. If you weren't expecting this, you can ignore it.
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ invite, inviteUrl })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const { inviteId } = await req.json()
  const admin = createSupabaseAdminClient()

  const { error } = await admin
    .from('project_invites')
    .delete()
    .eq('id', inviteId)
    .eq('project_id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
