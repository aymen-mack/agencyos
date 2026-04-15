'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Lead } from '@/types/database'
import { getScoreTag, getScoreTagColor, getScoreTagLabel } from '@/lib/scoring/lead-score'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm text-foreground">{row.original.full_name || '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: 'score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-muted-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Score
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.original.score
      const tag = getScoreTag(score)
      return (
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium text-foreground text-sm">{score}</span>
          <Badge
            variant="outline"
            className={cn('text-xs border', getScoreTagColor(tag))}
          >
            {getScoreTagLabel(tag)}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground capitalize">
        {row.original.source || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const colors: Record<string, string> = {
        new: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        qualified: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        contacted: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        converted: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        disqualified: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
      }
      return (
        <Badge variant="outline" className={cn('text-xs capitalize border', colors[status] || '')}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.original.created_at), 'MMM d, yyyy')}
      </span>
    ),
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {(row.original.tags || []).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },
]
