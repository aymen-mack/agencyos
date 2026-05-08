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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadsCRMProps {
  projectId: string
}

export type ViewMode = 'table' | 'kanban'

const PAGE_SIZE = 100

export function LeadsCRM({ projectId }: LeadsCRMProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { lastLeadUpdate } = useRealtime()

  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const [loading, setLoading] = useState(true)
  const pendingUpdates = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchLeads = useCallback(async (p: number, s: string, status: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      projectId,
      page: String(p),
      limit: String(PAGE_SIZE),
      sort: 'created_at',
      dir: 'desc',
    })
    if (s) params.set('search', s)
    if (status) params.set('status', status)

    const res = await fetch(`/api/leads?${params}`)
    const json = await res.json()
    if (json.leads) {
      setLeads(json.leads)
      setTotal(json.total ?? 0)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchLeads(page, search, statusFilter)
  }, [page, statusFilter, fetchLeads]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input — reset to page 1
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchLeads(1, search, statusFilter)
    }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload on realtime update
  useEffect(() => {
    if (lastLeadUpdate === 0) return
    fetchLeads(page, search, statusFilter)
  }, [lastLeadUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL filter → state
  useEffect(() => {
    const f = searchParams.get('filter') || ''
    setStatusFilter(f)
    setPage(1)
  }, [searchParams])

  const updateLead = useCallback((id: string, changes: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l))
    setDetailLead((prev) => prev?.id === id ? { ...prev, ...changes } : prev)

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
          fetchLeads(page, search, statusFilter)
        }
      } catch {
        toast.error('Failed to save changes')
      }
    }, 500)

    pendingUpdates.current.set(id, timer)
  }, [page, search, statusFilter, fetchLeads])

  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => [lead, ...prev])
    setTotal((t) => t + 1)
  }, [])

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    toast.success('Lead deleted')
  }, [])

  const bulkAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return

    if (action === 'delete') {
      setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)))
      setTotal((t) => Math.max(0, t - ids.length))
      setSelectedIds(new Set())
    } else if (action === 'update_status' && data?.status) {
      setLeads((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, status: data.status as string } : l))
      setSelectedIds(new Set())
    } else if (action === 'set_registrant') {
      setLeads((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, is_registrant: Boolean(data?.value) } : l))
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
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (filter) params.set('filter', filter)
    else params.delete('filter')
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
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
        totalCount={total}
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
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading…</div>
            ) : viewMode === 'table' ? (
              <LeadsTableView
                leads={leads}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onUpdateLead={updateLead}
                onDeleteLead={deleteLead}
                onOpenDetail={setDetailLead}
                allTags={allTags}
              />
            ) : (
              <LeadsKanbanView
                leads={leads}
                onUpdateLead={updateLead}
                onOpenDetail={setDetailLead}
              />
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border flex-shrink-0 bg-card">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} leads
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-7 h-7 rounded text-xs font-medium transition-colors',
                        page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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
