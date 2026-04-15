import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface ClerkWebhookEvent {
  type: string
  data: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verify Svix signature
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: ClerkWebhookEvent
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const data = event.data
      const emails = data.email_addresses as Array<{ email_address: string; id: string }>
      const primaryEmail = emails?.find((e) => e.id === data.primary_email_address_id)
      const email = primaryEmail?.email_address || ''

      await admin.from('users').upsert(
        {
          clerk_user_id: data.id as string,
          email,
          full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
          avatar_url: data.image_url as string || null,
        },
        { onConflict: 'clerk_user_id' }
      )

      // Auto-accept any pending invites for this email (new user signed up via invite link)
      if (email && event.type === 'user.created') {
        const { data: user } = await admin
          .from('users')
          .select('id')
          .eq('clerk_user_id', data.id as string)
          .single()

        if (user) {
          type PendingInvite = {
            id: string; role: string
            project: { id: string; organization_id: string } | null
          }
          const { data: pendingInvites } = await admin
            .from('project_invites')
            .select('id, role, project:client_projects(id, organization_id)')
            .eq('email', email.toLowerCase())
            .eq('status', 'pending') as { data: PendingInvite[] | null; error: unknown }

          for (const invite of pendingInvites || []) {
            const project = invite.project
            if (!project) continue

            // Add to org
            await admin.from('org_members').upsert(
              { organization_id: project.organization_id, user_id: user.id, role: 'member' },
              { onConflict: 'organization_id,user_id' }
            )
            // Add to project
            await admin.from('project_members').upsert(
              { project_id: project.id, user_id: user.id, role: invite.role },
              { onConflict: 'project_id,user_id' }
            )
            // Mark accepted
            await admin
              .from('project_invites')
              .update({ status: 'accepted', accepted_by: user.id })
              .eq('id', invite.id)
          }
        }
      }
      break
    }

    case 'organization.created':
    case 'organization.updated': {
      const data = event.data
      await admin.from('organizations').upsert(
        {
          clerk_org_id: data.id as string,
          name: data.name as string,
          slug: data.slug as string,
          plan: 'starter',
        },
        { onConflict: 'clerk_org_id' }
      )
      break
    }

    case 'organizationMembership.created': {
      const data = event.data
      const orgData = data.organization as Record<string, unknown>
      const userData = data.public_user_data as Record<string, unknown>

      // Upsert org and user first (in case their webhooks failed)
      await admin.from('organizations').upsert(
        {
          clerk_org_id: orgData.id as string,
          name: orgData.name as string,
          slug: orgData.slug as string,
          plan: 'starter',
        },
        { onConflict: 'clerk_org_id' }
      )

      await admin.from('users').upsert(
        {
          clerk_user_id: userData.user_id as string,
          email: userData.identifier as string,
          full_name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null,
          avatar_url: userData.image_url as string || null,
        },
        { onConflict: 'clerk_user_id' }
      )

      // Now look up internal IDs and create membership
      const [{ data: org }, { data: user }] = await Promise.all([
        admin.from('organizations').select('id').eq('clerk_org_id', orgData.id as string).single(),
        admin.from('users').select('id').eq('clerk_user_id', userData.user_id as string).single(),
      ])

      if (org && user) {
        await admin.from('org_members').upsert(
          {
            organization_id: org.id,
            user_id: user.id,
            role: 'owner',
          },
          { onConflict: 'organization_id,user_id' }
        )
      }
      break
    }

    case 'organizationMembership.deleted': {
      const data = event.data
      const orgData = data.organization as Record<string, string>
      const userData = data.public_user_data as Record<string, string>

      const [{ data: org }, { data: user }] = await Promise.all([
        admin.from('organizations').select('id').eq('clerk_org_id', orgData.id).single(),
        admin.from('users').select('id').eq('clerk_user_id', userData.user_id).single(),
      ])

      if (org && user) {
        await admin
          .from('org_members')
          .delete()
          .eq('organization_id', org.id)
          .eq('user_id', user.id)
      }
      break
    }

    default:
      // Unhandled event type — not an error
      break
  }

  return NextResponse.json({ ok: true })
}
