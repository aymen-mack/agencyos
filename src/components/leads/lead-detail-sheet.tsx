'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { Lead, LeadEvent } from '@/types/database'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getScoreTag, getScoreTagColor, getScoreTagLabel } from '@/lib/scoring/lead-score'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
}

const EVENT_LABELS: Record<string, string> = {
  form_submission: 'Submitted form',
  webinar_registered: 'Registered for webinar',
  webinar_attended: 'Attended webinar',
  email_open: 'Opened email',
  email_click: 'Clicked email',
  ad_click: 'Clicked ad',
  call_booked: 'Booked call',
  call_showed: 'Showed for call',
  deal_closed: 'Deal closed',
}

const EVENT_COLORS: Record<string, string> = {
  deal_closed: 'text-emerald-400',
  call_showed: 'text-emerald-400',
  call_booked: 'text-blue-400',
  webinar_attended: 'text-blue-400',
  webinar_registered: 'text-blue-400',
  form_submission: 'text-purple-400',
  email_click: 'text-amber-400',
  email_open: 'text-zinc-400',
  ad_click: 'text-orange-400',
}

export function LeadDetailSheet({ lead, open, onClose }: LeadDetailSheetProps) {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lead) return
    setLoading(true)
    async function load() {
      const token = await getToken({ template: 'supabase' })
      if (!token || !lead) return
      const supabase = createSupabaseClientWithToken(token)
      const { data } = await supabase
        .from('lead_events')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [lead?.id, getToken])

  if (!lead) return null

  const tag = getScoreTag(lead.score)
  const surveyData = lead.survey_data as Record<string, unknown>

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[500px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-left">
            <span className="text-base font-semibold">{lead.full_name || lead.email}</span>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{lead.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn('border', getScoreTagColor(tag))}
            >
              {getScoreTagLabel(tag)}
            </Badge>
            <span className="text-sm font-medium tabular-nums">{lead.score} pts</span>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Lead info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Source', value: lead.source },
              { label: 'Status', value: lead.status },
              { label: 'Phone', value: lead.phone },
              { label: 'Created', value: format(new Date(lead.created_at), 'MMM d, yyyy') },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm text-foreground capitalize">{value}</p>
              </div>
            ) : null)}
          </div>

          {/* Survey data */}
          {surveyData && Object.keys(surveyData).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Survey Responses
              </h3>
              <div className="rounded-lg border border-border bg-secondary/30 divide-y divide-border">
                {Object.entries(surveyData).map(([key, value]) => (
                  <div key={key} className="flex justify-between px-3 py-2 gap-2">
                    <span className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-foreground text-right capitalize">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Activity Timeline
            </h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', EVENT_COLORS[event.type] || 'bg-zinc-400')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {EVENT_LABELS[event.type] || event.type}
                        {event.score_delta > 0 && (
                          <span className="ml-2 text-xs text-emerald-400">+{event.score_delta}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
