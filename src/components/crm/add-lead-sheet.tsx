'use client'

import { useState } from 'react'
import { Lead } from '@/types/database'
import { PIPELINE_STAGES } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'

interface AddLeadSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
  onAdded: (lead: Lead) => void
}

export function AddLeadSheet({ open, onClose, projectId, onAdded }: AddLeadSheetProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    source: '',
    status: 'registrant',
  })

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to add lead')
        return
      }
      const { lead } = await res.json()
      onAdded(lead)
      toast.success('Lead added')
      onClose()
      setForm({ email: '', full_name: '', phone: '', source: '', status: 'registrant' })
    } catch {
      toast.error('Failed to add lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[400px] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle>Add Lead</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email *</label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="lead@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">Phone</label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="source" className="text-sm font-medium">Source</label>
            <Input
              id="source"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              placeholder="Facebook Ads, Webinar, etc."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Stage</label>
            <Select value={form.status} onValueChange={(v) => set('status', v ?? 'registrant')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Adding...' : 'Add Lead'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
