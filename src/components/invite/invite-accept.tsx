'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Zap, CheckCircle, XCircle, Clock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InviteInfo {
  email: string
  role: string
  status: string
  expired: boolean
  projectName: string
  projectId: string
}

interface InviteAcceptProps {
  token: string
  invite: InviteInfo | null
  isSignedIn: boolean
}

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  admin:  { label: 'Admin',   description: 'Full access except workspace deletion' },
  editor: { label: 'Editor',  description: 'Can edit content but not configuration' },
  viewer: { label: 'Visitor', description: 'View-only access' },
}

export function InviteAccept({ token, invite, isSignedIn }: InviteAcceptProps) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  // Invalid / not found
  if (!invite) {
    return (
      <Card>
        <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-center mb-2">Invalid invite</h1>
        <p className="text-sm text-muted-foreground text-center">
          This invite link is invalid or has already been used.
        </p>
      </Card>
    )
  }

  // Expired
  if (invite.expired) {
    return (
      <Card>
        <Clock className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-center mb-2">Invite expired</h1>
        <p className="text-sm text-muted-foreground text-center">
          This invite has expired. Ask the project owner to send a new one.
        </p>
      </Card>
    )
  }

  // Already accepted
  if (invite.status === 'accepted') {
    return (
      <Card>
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-center mb-2">Already accepted</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          You've already joined <strong>{invite.projectName}</strong>.
        </p>
        <Button className="w-full" onClick={() => router.push(`/dashboard/${invite.projectId}`)}>
          Go to project
        </Button>
      </Card>
    )
  }

  const roleInfo = ROLE_LABELS[invite.role] ?? { label: invite.role, description: '' }

  // Not signed in — send to sign-up with redirect back here
  if (!isSignedIn) {
    const redirectUrl = `/invite/${token}`
    return (
      <Card>
        <Logo />
        <h1 className="text-lg font-semibold text-center mt-4 mb-1">
          You've been invited to <span className="text-primary">{invite.projectName}</span>
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-1">
          This invite is for <strong>{invite.email}</strong>
        </p>
        <RolePill role={invite.role} label={roleInfo.label} description={roleInfo.description} />

        <div className="flex flex-col gap-2 mt-6">
          <Button
            className="w-full"
            onClick={() => router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)}
          >
            Create account &amp; accept
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`)}
          >
            Sign in &amp; accept
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Make sure to sign up with <strong>{invite.email}</strong>
        </p>
      </Card>
    )
  }

  // Signed in — show accept button
  async function handleAccept() {
    setAccepting(true)
    setError('')
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to accept invite'); return }
      router.push(`/dashboard/${data.projectId}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <Card>
      <Logo />
      <h1 className="text-lg font-semibold text-center mt-4 mb-1">
        Join <span className="text-primary">{invite.projectName}</span>
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-1">
        Invited as <strong>{invite.email}</strong>
      </p>
      <RolePill role={invite.role} label={roleInfo.label} description={roleInfo.description} />

      {error && (
        <div className="mt-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      <Button className="w-full mt-6" onClick={handleAccept} disabled={accepting}>
        {accepting ? 'Accepting...' : 'Accept invitation'}
      </Button>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-2xl">
      {children}
    </div>
  )
}

function Logo() {
  return (
    <div className="flex justify-center">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
        <Zap className="w-5 h-5 text-primary-foreground" />
      </div>
    </div>
  )
}

function RolePill({ role, label, description }: { role: string; label: string; description: string }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
      <span className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full border',
        role === 'admin'  && 'bg-violet-400/10 text-violet-400 border-violet-400/20',
        role === 'editor' && 'bg-blue-400/10 text-blue-400 border-blue-400/20',
        role === 'viewer' && 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20',
      )}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  )
}
