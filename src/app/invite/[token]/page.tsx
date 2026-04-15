import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { InviteAccept } from '@/components/invite/invite-accept'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createSupabaseAdminClient()

  type InviteRow = {
    id: string; email: string; role: string; status: string; expires_at: string
    project: { id: string; name: string } | null
  }

  // Look up invite (don't require auth to see the page — let them sign in first)
  const { data: invite } = await admin
    .from('project_invites')
    .select('id, email, role, status, expires_at, project:client_projects(id, name)')
    .eq('token', token)
    .single() as { data: InviteRow | null; error: unknown }

  const expired = invite ? new Date(invite.expires_at) < new Date() : false

  // If already logged in, we can pre-check
  const { userId } = await auth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <InviteAccept
        token={token}
        invite={invite ? {
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expired,
          projectName: (invite.project as { id: string; name: string } | null)?.name ?? 'a project',
          projectId: (invite.project as { id: string; name: string } | null)?.id ?? '',
        } : null}
        isSignedIn={!!userId}
      />
    </div>
  )
}
