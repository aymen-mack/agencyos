'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Lead } from '@/types/database'
import { useRealtime } from '@/components/providers/realtime-provider'
import { LeadsTableView } from './leads-table-view'
import { LeadsKanbanView } from './leads-kanban-view'
import { CRMToolbar } from './crm-toolbar'
import { BulkActionsBar } from './bulk-actions-bar'
import { AddLeadSheet } from './add-lead-sheet'
import { LeadDetailSheet } from './lead-detail-sheet'
import { ActivityFeed } from './activity-feed'
import { toast } from 'sonner'

interface LeadsCRMProps {
  projectId: string
  initialLeads: Lead[]
}

export type ViewMode = 'table' | 'kanban'

export function LeadsCRM({ projectId, initialLeads }: LeadsCRMProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { lastLeadUpdate } = useRealtime()

  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const pendingUpdates = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Reload leads when realtime fires
  useEffect(() => {
    if (lastLeadUpdate === 0) return
    fetch(`/api/leads?projectId=${projectId}`)
      .then((r) => r.json())
      .then(({ leads: fresh }) => { if (fresh) setLeads(fresh) })
  }, [lastLeadUpdate, projectId])

  // Sync URL filter param to state
  useEffect(() => {
    const f = searchParams.get('filter') || ''
    setStatusFilter(f)
  }, [searchParams])

  // Optimistic lead update — debounced API sync
  const updateLead = useCallback((id: string, changes: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l))

    // Also update detail sheet if open
    setDetailLead((prev) => prev?.id === id ? { ...prev, ...changes } : prev)

    // Debounce API call
    const existing = pendingUpdates.current.get(id)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(async () => {
      pendingUpdates.current.delete(id)
      try {
        const res = await fetch(`/api/leads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(`Save failed: ${err.error}`)
          // Revert by refetching
          fetch(`/api/leads?projectId=${projectId}`)
            .then((r) => r.json())
            .then(({ leads: fresh }) => { if (fresh) setLeads(fresh) })
        }
      } catch {
        toast.error('Failed to save changes')
      }
    }, 500)

    pendingUpdates.current.set(id, timer)
  }, [projectId])

  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => [lead, ...prev])
  }, [])

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    toast.success('Lead deleted')
  }, [])

  const bulkAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return

    if (action === 'delete') {
      setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)))
      setSelectedIds(new Set())
    } else if (action === 'update_status' && data?.status) {
      setLeads((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, status: data.status as string } : l))
      setSelectedIds(new Set())
    } else if (action === 'add_tag' && data?.tag) {
      setLeads((prev) => prev.map((l) =>
        selectedIds.has(l.id)
          ? { ...l, tags: Array.from(new Set([...(l.tags || []), data.tag as string])) }
          : l
      ))
    }

    const res = await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: ids, action, data }),
    })

    if (!res.ok) toast.error('Bulk action failed')
    else toast.success(action === 'delete' ? `${ids.length} leads deleted` : 'Updated')
  }, [selectedIds])

  const setFilter = useCallback((filter: string) => {
    setStatusFilter(filter)
    const params = new URLSearchParams(searchParams.toString())
    if (filter) params.set('filter', filter)
    else params.delete('filter')
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  // Compute filtered + searched leads
  const filteredLeads = leads.filter((lead) => {
    const matchSearch = !search ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.full_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || lead.status === statusFilter
    return matchSearch && matchStatus
  })

  // Collect all tags across leads for autocomplete
  const allTags = Array.from(new Set(leads.flatMap((l) => l.tags || [])))

  return (
    <div className="flex flex-col h-full min-h-0">
      <CRMToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setFilter}
        onAddLead={() => setAddOpen(true)}
        onToggleActivity={() => setShowActivity((v) => !v)}
        totalCount={filteredLeads.length}
      />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          allTags={allTags}
          onBulkAction={bulkAction}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          {viewMode === 'table' ? (
            <LeadsTableView
              leads={filteredLeads}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onUpdateLead={updateLead}
              onDeleteLead={deleteLead}
              onOpenDetail={setDetailLead}
              allTags={allTags}
            />
          ) : (
            <LeadsKanbanView
              leads={filteredLeads}
              onUpdateLead={updateLead}
              onOpenDetail={setDetailLead}
            />
          )}
        </div>

        {showActivity && (
          <div className="w-80 border-l border-border flex-shrink-0 overflow-hidden">
            <ActivityFeed projectId={projectId} />
          </div>
        )}
      </div>

      <AddLeadSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projectId={projectId}
        onAdded={addLead}
      />

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
        onUpdateLead={updateLead}
        onDeleteLead={deleteLead}
        allTags={allTags}
        projectId={projectId}
      />
    </div>
  )
}
