import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricsCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: number
  className?: string
  highlight?: boolean
}

export function MetricsCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
  highlight,
}: MetricsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 flex flex-col gap-3',
        highlight && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>

      {typeof trend === 'number' && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-muted-foreground'
            )}
          >
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  )
}
