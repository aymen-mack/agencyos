'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { Lead } from '@/types/database'
import { EditableCell } from './editable-cell'
import { StatusCell } from './status-cell'
import { TagsInput } from './tags-input'
import { cn } from '@/lib/utils'
import { Trash2, ExternalLink } from 'lucide-react'
import { useMemo, useState, useRef, useEffect } from 'react'

function AmountCell({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value != null ? String(value) : '') }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    const num = draft.trim() === '' ? null : parseFloat(draft.replace(/[^0-9.]/g, ''))
    if (num !== value) onSave(isNaN(num as number) ? null : num)
  }

  if (editing) {
    return (
      <div className="relative flex items-center">
        <span className="absolute left-2 text-xs text-zinc-400">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full bg-secondary border border-primary/40 rounded pl-5 pr-2 py-0.5 text-xs text-foreground outline-none tabular-nums"
        />
      </div>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'block cursor-pointer px-2 py-0.5 rounded hover:bg-secondary/60 transition-colors text-xs tabular-nums',
        value != null ? 'text-emerald-400 font-medium' : 'text-muted-foreground'
      )}
    >
      {value != null ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
    </span>
  )
}

interface LeadsTableViewProps {
  leads: Lead[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onUpdateLead: (id: string, changes: Partial<Lead>) => void
  onDeleteLead: (id: string) => void
  onOpenDetail: (lead: Lead) => void
  allTags: string[]
}

export function LeadsTableView({
  leads,
  selectedIds,
  onSelectionChange,
  onUpdateLead,
  onDeleteLead,
  onOpenDetail,
  allTags,
}: LeadsTableViewProps) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id))
  const someSelected = leads.some((l) => selectedIds.has(l.id))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(leads.map((l) => l.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
          onChange={toggleAll}
          className="w-3.5 h-3.5 accent-primary cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleOne(row.original.id)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer"
        />
      ),
      size: 36,
    },
    {
      id: 'full_name',
      header: 'Name',
      accessorKey: 'full_name',
      size: 160,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.full_name || ''}
          onSave={(v) => onUpdateLead(row.original.id, { full_name: v })}
          placeholder="—"
          bold
        />
      ),
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      size: 200,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.email}
          onSave={(v) => onUpdateLead(row.original.id, { email: v })}
          type="email"
        />
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorKey: 'phone',
      size: 140,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.phone || ''}
          onSave={(v) => onUpdateLead(row.original.id, { phone: v })}
          placeholder="—"
          type="tel"
        />
      ),
    },
    {
      id: 'status',
      header: 'Stage',
      accessorKey: 'status',
      size: 150,
      cell: ({ row }) => (
        <StatusCell
          status={row.original.status}
          onSave={(v) => onUpdateLead(row.original.id, { status: v })}
        />
      ),
    },
    {
      id: 'score',
      header: 'Score',
      accessorKey: 'score',
      size: 70,
      cell: ({ row }) => {
        const score = row.original.score ?? 0
        return (
          <span className={cn(
            'text-xs font-medium tabular-nums',
            score >= 100 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-muted-foreground'
          )}>
            {score}
          </span>
        )
      },
    },
    {
      id: 'tags',
      header: 'Tags',
      size: 220,
      cell: ({ row }) => (
        <TagsInput
          tags={row.original.tags || []}
          allTags={allTags}
          onChange={(tags) => onUpdateLead(row.original.id, { tags })}
          className="border-transparent bg-transparent px-1"
        />
      ),
    },
    {
      id: 'source',
      header: 'Source',
      accessorKey: 'source',
      size: 110,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.source || ''}
          onSave={(v) => onUpdateLead(row.original.id, { source: v })}
          placeholder="—"
        />
      ),
    },
    {
      id: 'purchase_amount',
      header: 'Amount',
      accessorKey: 'purchase_amount',
      size: 100,
      cell: ({ row }) => <AmountCell
        value={row.original.purchase_amount}
        onSave={(v) => onUpdateLead(row.original.id, { purchase_amount: v })}
      />,
    },
    {
      id: 'actions',
      header: '',
      size: 60,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onOpenDetail(row.original)}
            className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            title="View details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this lead?')) onDeleteLead(row.original.id)
            }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [leads, selectedIds, allTags, allSelected, someSelected])

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-sm">No leads found.</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border bg-card/50 sticky top-0 z-10">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.column.columnDef.size }}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border group transition-colors',
                selectedIds.has(row.original.id) ? 'bg-primary/5' : 'hover:bg-secondary/20'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{ width: cell.column.columnDef.size }}
                  className="px-1.5 py-1 align-middle"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
