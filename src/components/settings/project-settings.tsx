'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClientProject } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, UserMinus, Mail, Link2, RefreshCw, Shield, Eye, Pencil, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  role: string
  user: {
    id: string
    email: string
    full_name: string | null
    clerk_user_id: string
  } | null
}

interface Invite {
  id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string
  created_at: string
}

interface ProjectSettingsProps {
  project: ClientProject
  initialMembers: Member[]
  initialInvites: Invite[]
}

const ROLES = [
  { id: 'admin',  label: 'Admin',   description: 'Full access except delete workspace', icon: Crown },
  { id: 'editor', label: 'Editor',  description: 'Edit content, cannot configure',       icon: Pencil },
  { id: 'viewer', label: 'Visitor', description: 'View only, cannot make changes',        icon: Eye },
]

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.id === role)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      role === 'admin'  && 'bg-violet-400/10 text-violet-400 border border-violet-400/20',
      role === 'editor' && 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
      role === 'viewer' && 'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
    )}>
      {r?.label ?? role}
    </span>
  )
}

export function ProjectSettings({ project: initialProject, initialMembers, initialInvites }: ProjectSettingsProps) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [invites, setInvites] = useState<Invite[]>(initialInvites)

  // Project name editing
  const [nameValue, setNameValue] = useState(project.name)
  const [clientNameValue, setClientNameValue] = useState(project.client_name || '')
  const [savingName, setSavingName] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Delete project dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function saveProjectName() {
    if (!nameValue.trim() || nameValue === project.name) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim(), client_name: clientNameValue.trim() || null }),
      })
      if (!res.ok) { toast.error('Failed to save'); return }
      const { project: updated } = await res.json()
      setProject(updated)
      toast.success('Project updated')
      router.refresh()
    } finally {
      setSavingName(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e.error || 'Failed to invite'); return }
      const { invite, inviteUrl } = await res.json()
      setInvites((prev) => [invite, ...prev.filter((i) => i.id !== invite.id)])
      setInviteEmail('')
      toast.success('Invite created', {
        description: 'Share the invite link or copy it below.',
        action: { label: 'Copy link', onClick: () => { navigator.clipboard.writeText(inviteUrl); toast.success('Copied!') } },
      })
    } finally {
      setInviting(false)
    }
  }

  async function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function resendInvite(invite: Invite) {
    const res = await fetch(`/api/projects/${project.id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invite.email, role: invite.role }),
    })
    if (!res.ok) { toast.error('Failed to resend'); return }
    const { invite: updated } = await res.json()
    setInvites((prev) => prev.map((i) => i.email === updated.email ? updated : i))
    toast.success('Invite refreshed')
  }

  async function deleteInvite(inviteId: string) {
    await fetch(`/api/projects/${project.id}/invites`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  async function updateMemberRole(memberId: string, role: string) {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    })
    if (!res.ok) { toast.error('Failed to update role'); return }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
    toast.success('Role updated')
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/projects/${project.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    toast.success('Member removed')
  }

  async function deleteProject() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete project'); return }
      toast.success('Project deleted')
      router.push('/dashboard')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Project info ── */}
      <section>
        <h2 className="text-sm font-semibold mb-4">Project Info</h2>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project name</label>
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveProjectName()}
              placeholder="My Agency Project"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Client name <span className="text-muted-foreground/50">(optional)</span></label>
            <Input
              value={clientNameValue}
              onChange={(e) => setClientNameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveProjectName()}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={project.status} onValueChange={async (v) => {
              const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: v }),
              })
              if (res.ok) { const { project: p } = await res.json(); setProject(p); router.refresh() }
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={saveProjectName}
            disabled={savingName || nameValue.trim() === project.name}
            size="sm"
          >
            {savingName ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </section>

      {/* ── Team members ── */}
      <section>
        <h2 className="text-sm font-semibold mb-1">Team</h2>
        <p className="text-xs text-muted-foreground mb-4">Manage who has access to this project.</p>

        {/* Invite form */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <p className="text-xs font-medium mb-3">Invite a member</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              className="flex-1 h-9"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? 'editor')}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9 gap-1.5" onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
              <Mail className="w-3.5 h-3.5" />
              {inviting ? 'Sending...' : 'Invite'}
            </Button>
          </div>
        </div>

        {/* Members list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {members.length === 0 && invites.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No members yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {/* Active members */}
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {(member.user?.full_name || member.user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user?.full_name || member.user?.email || 'Unknown'}</p>
                    {member.user?.full_name && (
                      <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select value={member.role} onValueChange={(v) => updateMemberRole(member.id, v ?? member.role)}>
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      Active
                    </span>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending invites */}
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 px-4 py-3 opacity-80">
                  <div className="w-7 h-7 rounded-full bg-secondary border border-dashed border-border flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{invite.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleBadge role={invite.role} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      Pending
                    </span>
                    <button
                      onClick={() => copyInviteLink(invite.token)}
                      className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy invite link"
                    >
                      <Link2 className={cn('w-3.5 h-3.5', copiedToken === invite.token && 'text-emerald-400')} />
                    </button>
                    <button
                      onClick={() => resendInvite(invite)}
                      className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Refresh invite"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteInvite(invite.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Cancel invite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="mt-3 rounded-lg border border-border bg-card/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Role permissions</p>
          <div className="space-y-1">
            {ROLES.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <RoleBadge role={r.id} />
                  <span className="text-muted-foreground">{r.description}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Danger zone ── */}
      <section>
        <h2 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h2>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete this project</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently deletes all leads, data, and configurations. This cannot be undone.</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Project
          </Button>
        </div>
      </section>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); setDeleteInput('') }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete &quot;{project.name}&quot;?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete the project and all its data — leads, events, notes, integrations. <strong>This cannot be undone.</strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Type <span className="font-mono text-destructive">DELETE</span> to confirm</label>
              <Input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && deleteInput === 'DELETE' && deleteProject()}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteInput('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInput !== 'DELETE' || deleting}
              onClick={deleteProject}
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
