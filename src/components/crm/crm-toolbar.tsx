'use client'

import { ViewMode } from './leads-crm'
import { PIPELINE_STAGES } from '@/lib/pipeline'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutGrid, List, Plus, Activity, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CRMToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  onAddLead: () => void
  onToggleActivity: () => void
  totalCount: number
}

export function CRMToolbar({
  viewMode, onViewModeChange, search, onSearchChange,
  statusFilter, onStatusFilterChange, onAddLead, onToggleActivity, totalCount,
}: CRMToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm pr-7"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <Select value={statusFilter || 'all'} onValueChange={(v) => onStatusFilterChange(v === 'all' ? '' : (v ?? ''))}>

        <SelectTrigger className="h-8 w-40 text-sm">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Count */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">{totalCount} leads</span>

      <div className="ml-auto flex items-center gap-1.5">
        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('table')}
            className={cn('p-1.5 transition-colors', viewMode === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={cn('p-1.5 transition-colors', viewMode === 'kanban' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Activity feed toggle */}
        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground" onClick={onToggleActivity}>
          <Activity className="w-4 h-4" />
        </Button>

        {/* Add lead */}
        <Button size="sm" className="h-8 gap-1.5" onClick={onAddLead}>
          <Plus className="w-3.5 h-3.5" />
          Add Lead
        </Button>
      </div>
    </div>
  )
}
