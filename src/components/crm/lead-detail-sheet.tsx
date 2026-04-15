'use client'

import { useState, useEffect } from 'react'
import { Lead } from '@/types/database'
import { PIPELINE_STAGES, getStage } from '@/lib/pipeline'
import { EditableCell } from './editable-cell'
import { StatusCell } from './status-cell'
import { TagsInput } from './tags-input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, MessageSquare, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface Note {
  id: string
  content: string
  author_name: string | null
  created_at: string
}

interface LeadEvent {
  id: string
  type: string
  payload: Record<string, unknown> | null
  created_at: string
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

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onUpdateLead: (id: string, changes: Partial<Lead>) => void
  onDeleteLead: (id: string) => void
  allTags: string[]
  projectId: string
}

export function LeadDetailSheet({
  lead,
  open,
  onClose,
  onUpdateLead,
  onDeleteLead,
  allTags,
  projectId,
}: LeadDetailSheetProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [tab, setTab] = useState<'details' | 'notes' | 'history'>('details')

  useEffect(() => {
    if (!lead || !open) return
    fetch(`/api/leads/${lead.id}/notes`)
      .then((r) => r.json())
      .then(({ notes: n }) => { if (n) setNotes(n) })
    fetch(`/api/leads/${lead.id}/events`)
      .then((r) => r.json())
      .then(({ events: e }) => { if (e) setEvents(e) })
  }, [lead?.id, open])

  async function addNote() {
    if (!noteText.trim() || !lead) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim(), projectId }),
      })
      if (!res.ok) { toast.error('Failed to save note'); return }
      const { note } = await res.json()
      setNotes((prev) => [note, ...prev])
      setNoteText('')
    } finally {
      setSavingNote(false)
    }
  }

  async function deleteNote(noteId: string) {
    if (!lead) return
    await fetch(`/api/leads/${lead.id}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  if (!lead) return null

  const stage = getStage(lead.status)
  const score = lead.score ?? 0

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[520px] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <SheetHeader className="mb-3">
            <SheetTitle className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <EditableCell
                  value={lead.full_name || ''}
                  onSave={(v) => onUpdateLead(lead.id, { full_name: v })}
                  placeholder="No name"
                  bold
                  className="text-base"
                />
                <EditableCell
                  value={lead.email}
                  onSave={(v) => onUpdateLead(lead.id, { email: v })}
                  type="email"
                  className="text-sm text-muted-foreground"
                />
              </div>
              <button
                onClick={() => { if (confirm('Delete this lead?')) { onDeleteLead(lead.id); onClose() } }}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </SheetTitle>
          </SheetHeader>

          {/* Score + stage row */}
          <div className="flex items-center gap-3">
            <StatusCell status={lead.status} onSave={(v) => onUpdateLead(lead.id, { status: v })} />
            <div className="flex items-center gap-1.5">
              <Star className={cn('w-3.5 h-3.5', score >= 100 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium tabular-nums', score >= 100 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-muted-foreground')}>
                {score} pts
              </span>
            </div>
            {lead.created_at && (
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(['details', 'notes', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors capitalize',
                tab === t ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t}
              {t === 'notes' && notes.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary text-[10px]">{notes.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'details' && (
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                <EditableCell
                  value={lead.phone || ''}
                  onSave={(v) => onUpdateLead(lead.id, { phone: v })}
                  placeholder="—"
                  type="tel"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
                <EditableCell
                  value={lead.source || ''}
                  onSave={(v) => onUpdateLead(lead.id, { source: v })}
                  placeholder="—"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
                <TagsInput
                  tags={lead.tags || []}
                  allTags={allTags}
                  onChange={(tags) => onUpdateLead(lead.id, { tags })}
                />
              </div>

              {lead.survey_data && Object.keys(lead.survey_data as Record<string, unknown>).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Survey Data</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {Object.entries(lead.survey_data as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2 px-3 py-2 border-b border-border last:border-0 text-xs">
                        <span className="text-muted-foreground capitalize min-w-[100px]">{k.replace(/_/g, ' ')}</span>
                        <span className="text-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="p-6 space-y-4">
              {/* New note input */}
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote()
                  }}
                  placeholder="Add a note... (⌘↵ to save)"
                  rows={3}
                  className="w-full bg-secondary rounded-lg border border-border px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/40"
                />
                <Button
                  size="sm"
                  onClick={addNote}
                  disabled={savingNote || !noteText.trim()}
                  className="h-8"
                >
                  {savingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="group rounded-lg border border-border bg-card p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{note.author_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                          </span>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="p-6">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {events.map((evt) => (
                      <div key={evt.id} className="flex gap-3 relative">
                        <div className="w-6 h-6 rounded-full bg-secondary border border-border flex-shrink-0 flex items-center justify-center z-10">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm">
                            {EVENT_LABELS[evt.type] || evt.type}
                            {evt.type === 'status_changed' && (evt.payload as {new_status?: string})?.new_status ? (
                              <span className="text-muted-foreground"> → {((evt.payload as {new_status?: string}).new_status || '').replace(/_/g, ' ')}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(evt.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
