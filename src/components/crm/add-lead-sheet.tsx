'use client'

import { useState } from 'react'
import { Lead } from '@/types/database'
import { PIPELINE_STAGES } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const AGE_OPTIONS          = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+']
const INCOME_OPTIONS       = ['Under $3,000/mo', '$3,000 - $5,000/mo', '$5,000 - $10,000/mo', '$10,000/mo+']
const SOPHISTICATION_OPTIONS = ['Just starting (< 3 months)', '3-6 months', '6-12 months', '1-2 years', '2+ years']
const INVESTMENT_OPTIONS   = ['Never / $0', 'Under $500', '$500 - $1,000', '$1,000 - $5,000', '$5,000+']
const SPEED_OPTIONS        = ['Immediately', 'Within a week', 'Within a month', 'Not sure']

interface AddLeadSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
  onAdded: (lead: Lead) => void
  defaultStatus?: string
}

const EMPTY_FORM = {
  email: '', full_name: '', phone: '', source: '', status: 'registrant',
}
const EMPTY_SURVEY = {
  age: '', occupation: '', income: '', sophistication: '',
  challenges: '', previous_investment: '', speed_to_action: '',
}

export function AddLeadSheet({ open, onClose, projectId, onAdded, defaultStatus }: AddLeadSheetProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, status: defaultStatus ?? 'registrant' }))
  const [survey, setSurvey] = useState(EMPTY_SURVEY)
  const [showSurvey, setShowSurvey] = useState(false)

  function setF(key: string, value: string) { setForm((p) => ({ ...p, [key]: value })) }
  function setS(key: string, value: string) { setSurvey((p) => ({ ...p, [key]: value })) }

  const hasSurveyData = Object.values(survey).some(Boolean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSaving(true)
    try {
      // Build survey_data — only include non-empty fields, use standardized keys
      const survey_data: Record<string, string> = {}
      if (survey.age)                survey_data.age                 = survey.age
      if (survey.occupation)         survey_data.occupation          = survey.occupation
      if (survey.income)             survey_data.income              = survey.income
      if (survey.sophistication)     survey_data.sophistication      = survey.sophistication
      if (survey.challenges)         survey_data.challenges          = survey.challenges
      if (survey.previous_investment) survey_data.previous_investment = survey.previous_investment
      if (survey.speed_to_action)    survey_data.speed_to_action     = survey.speed_to_action

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId,
          ...(Object.keys(survey_data).length > 0 ? { survey_data } : {}),
        }),
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
      setForm({ ...EMPTY_FORM, status: defaultStatus ?? 'registrant' })
      setSurvey(EMPTY_SURVEY)
      setShowSurvey(false)
    } catch {
      toast.error('Failed to add lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[440px] sm:w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Add Lead</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-6 flex flex-col gap-4 pb-4">
          {/* ── Core fields ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)}
              placeholder="lead@example.com" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input value={form.full_name} onChange={(e) => setF('full_name', e.target.value)} placeholder="Jane Smith" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone</label>
            <Input type="tel" value={form.phone} onChange={(e) => setF('phone', e.target.value)} placeholder="+1 555 000 0000" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <Input value={form.source} onChange={(e) => setF('source', e.target.value)} placeholder="Facebook Ads, Webinar, etc." />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Stage</label>
            <Select value={form.status} onValueChange={(v) => v && setF('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Survey Data toggle ── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSurvey((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                Survey Data
                {hasSurveyData && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    filled
                  </span>
                )}
              </span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showSurvey && 'rotate-180')} />
            </button>

            {showSurvey && (
              <div className="border-t border-border px-4 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Age</label>
                  <Select value={survey.age || '__none__'} onValueChange={(v) => setS('age', !v || v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select age range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {AGE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Occupation</label>
                  <Input className="h-8 text-sm" value={survey.occupation} onChange={(e) => setS('occupation', e.target.value)} placeholder="e.g. Self-employed, Employed" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monthly Income</label>
                  <Select value={survey.income || '__none__'} onValueChange={(v) => setS('income', !v || v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select income range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {INCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Level of Sophistication</label>
                  <Select value={survey.sophistication || '__none__'} onValueChange={(v) => setS('sophistication', !v || v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="How long in the game?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {SOPHISTICATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Current Challenges</label>
                  <textarea
                    value={survey.challenges}
                    onChange={(e) => setS('challenges', e.target.value)}
                    placeholder="What are they struggling with?"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Previous Investment in Self-Education</label>
                  <Select value={survey.previous_investment || '__none__'} onValueChange={(v) => setS('previous_investment', !v || v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Amount invested before" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {INVESTMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Speed to Action</label>
                  <Select value={survey.speed_to_action || '__none__'} onValueChange={(v) => setS('speed_to_action', !v || v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="When would they act?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {SPEED_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Adding...' : 'Add Lead'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
