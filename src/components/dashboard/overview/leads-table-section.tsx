'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardLead, TableFilters, DateRange } from './types'

const STATUS_TAB_LABELS = ['All', 'Registered', 'Attended', 'Purchased', 'No Show', 'Refunded']
const STATUS_TAB_VALUES = ['all', 'registered', 'attended', 'purchased', 'no_show', 'refunded']

const STATUS_STYLES: Record<string, string> = {
  registered: 'bg-zinc-500/15 text-zinc-400',
  attended:   'bg-blue-500/15 text-blue-400',
  no_show:    'bg-amber-500/15 text-amber-400',
  purchased:  'bg-emerald-500/15 text-emerald-400',
  refunded:   'bg-red-500/15 text-red-400',
}

const PAYMENT_STYLES: Record<string, string> = {
  paid:                     'bg-emerald-500/15 text-emerald-400',
  payment_plan_active:      'bg-blue-500/15 text-blue-400',
  payment_plan_delinquent:  'bg-orange-500/15 text-orange-400',
  refunded:                 'bg-red-500/15 text-red-400',
}

const PAYMENT_LABELS: Record<string, string> = {
  paid:                    'Paid',
  payment_plan_active:     'Plan (Active)',
  payment_plan_delinquent: 'Plan (Delinquent)',
  refunded:                'Refunded',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize', STATUS_STYLES[status] ?? 'bg-zinc-500/15 text-zinc-400')}>
      {status.replace('_', ' ')}
    </span>
  )
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground/40 text-xs">—</span>
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', PAYMENT_STYLES[status] ?? 'bg-zinc-500/15 text-zinc-400')}>
      {PAYMENT_LABELS[status] ?? status}
    </span>
  )
}

function SortIcon({ field, current, direction }: { field: string; current: string; direction: 'asc' | 'desc' }) {
  if (current !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
  return direction === 'asc' ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />
}

const COLUMNS = [
  { key: 'full_name',       label: 'Name',              sortable: true  },
  { key: 'email',           label: 'Email',             sortable: true  },
  { key: 'phone',           label: 'Phone',             sortable: false },
  { key: 'source',          label: 'Source',            sortable: true  },
  { key: 'status',          label: 'Status',            sortable: true  },
  { key: 'campaign',        label: 'Campaign',          sortable: true  },
  { key: 'created_at',      label: 'Reg. Date',         sortable: true  },
  { key: 'attended',        label: 'Attended',          sortable: true  },
  { key: 'purchase_amount', label: 'Purchase',          sortable: true  },
  { key: 'payment_status',  label: 'Payment Status',    sortable: true  },
]

interface Props {
  projectId: string
  filters: TableFilters
  dateRange: DateRange
  onFiltersChange: (f: Partial<TableFilters>) => void
}

export function LeadsTableSection({ projectId, filters, dateRange, onFiltersChange }: Props) {
  const [leads, setLeads] = useState<DashboardLead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: '25',
      status: filters.statusFilter,
      search: filters.searchQuery,
      sort: filters.sortField,
      dir: filters.sortDirection,
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    })
    const res = await fetch(`/api/dashboard/${projectId}/leads?${params}`)
    const json = await res.json()
    setLeads(json.leads || [])
    setTotal(json.total || 0)
    setLoading(false)
  }, [projectId, filters, dateRange])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  function handleSort(field: string) {
    if (filters.sortField === field) {
      onFiltersChange({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc', page: 1 })
    } else {
      onFiltersChange({ sortField: field, sortDirection: 'desc', page: 1 })
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 25))

  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-semibold">Leads</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value, page: 1 })}
            placeholder="Search name or email…"
            className="pl-8 pr-3 py-1.5 bg-secondary/50 border border-white/[0.06] rounded-lg text-sm placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-amber-500/30 w-52"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 px-5 py-0 border-b border-white/[0.05] overflow-x-auto">
        {STATUS_TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => onFiltersChange({ statusFilter: STATUS_TAB_VALUES[i], page: 1 })}
            className={cn(
              'px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              filters.statusFilter === STATUS_TAB_VALUES[i]
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground pr-1">{total.toLocaleString()} total</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-foreground select-none'
                  )}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} current={filters.sortField} direction={filters.sortDirection} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse bg-white/[0.05]" style={{ width: col.key === 'email' ? '140px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-sm text-muted-foreground">
                  No leads found for this period
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{lead.full_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.phone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.source || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.campaign || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-xs font-medium', lead.attended ? 'text-emerald-400' : 'text-muted-foreground/40')}>
                      {lead.attended ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {lead.purchase_amount ? (
                      <span className="text-emerald-400">
                        ${lead.purchase_amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><PaymentBadge status={lead.payment_status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-muted-foreground">
            Page {filters.page} of {totalPages} · {total.toLocaleString()} records
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              className="p-1.5 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1
              if (totalPages > 5) {
                const start = Math.max(1, Math.min(filters.page - 2, totalPages - 4))
                p = start + i
              }
              return (
                <button
                  key={p}
                  onClick={() => onFiltersChange({ page: p })}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                    filters.page === p ? 'bg-amber-500 text-black' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              className="p-1.5 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
