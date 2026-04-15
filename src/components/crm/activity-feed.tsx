'use client'

import { useEffect, useState } from 'react'
import { useRealtime } from '@/components/providers/realtime-provider'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'

interface LeadEvent {
  id: string
  lead_id: string
  type: string
  payload: Record<string, unknown> | null
  created_at: string
  lead?: { full_name: string | null; email: string }
}

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead created',
  status_changed: 'Stage changed',
  note_added: 'Note added',
  tag_added: 'Tag added',
  form_submission: 'Form submitted',
  webinar_registered: 'Webinar registered',
  webinar_attended: 'Webinar attended',
  email_open: 'Email opened',
  email_click: 'Email clicked',
  call_booked: 'Call booked',
  call_showed: 'Call showed',
  deal_closed: 'Deal closed',
}

export function ActivityFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { lastLeadUpdate } = useRealtime()

  useEffect(() => {
    fetch(`/api/activity?projectId=${projectId}`)
      .then((r) => r.json())
      .then(({ events: e }) => { if (e) setEvents(e) })
      .finally(() => setLoading(false))
  }, [projectId, lastLeadUpdate])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Activity</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No activity yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((evt) => (
              <div key={evt.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {evt.lead?.full_name || evt.lead?.email || 'Unknown lead'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {EVENT_LABELS[evt.type] || evt.type}
                      {evt.type === 'status_changed' && (evt.payload as {new_status?: string})?.new_status ? (
                        <> → {((evt.payload as {new_status?: string}).new_status || '').replace(/_/g, ' ')}</>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
