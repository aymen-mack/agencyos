'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, PhoneCall, BarChart3, Users, Eye, RefreshCw, Target, Zap, Mail, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KPICardConfig, KPIMetricId, KPISummary } from './types'
import { KPI_META, formatKPIValue, pctChange } from './types'

const KPI_ICONS: Record<KPIMetricId, React.ElementType> = {
  total_cash:          DollarSign,
  total_revenue:       TrendingUp,
  calls_booked:        PhoneCall,
  avg_per_close:       BarChart3,
  total_registrations: Users,
  show_rate:           Eye,
  conversion_rate:     Target,
  refund_rate:         RefreshCw,
  cost_per_reg:        DollarSign,
  roas:                ArrowUpRight,
  total_ad_spend:      Zap,
  email_open_rate:     Mail,
}

interface KPICardProps {
  id: KPIMetricId
  kpis: KPISummary
  onHide: () => void
}

function KPICard({ id, kpis, onHide }: KPICardProps) {
  const meta = KPI_META[id]
  const data = kpis[id]
  const Icon = KPI_ICONS[id]
  const change = pctChange(data.current, data.previous)
  const isPositive = id === 'refund_rate' ? change <= 0 : change >= 0
  const sparkData = data.sparkline.map((v, i) => ({ v, i }))

  return (
    <div className="group relative bg-card border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/[0.14] transition-colors overflow-hidden">
      {/* Hide button */}
      <button
        onClick={onHide}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-muted-foreground text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-secondary/60"
        title="Hide card"
      >
        ×
      </button>

      {/* Top row */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-xs text-muted-foreground font-medium truncate">{meta.label}</span>
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {formatKPIValue(data.current, meta.format)}
          </p>
          {data.previous > 0 && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
              isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Sparkline */}
        <div className="w-20 h-10 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#f59e0b' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isPositive ? '#f59e0b' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={isPositive ? '#f59e0b' : '#ef4444'}
                strokeWidth={1.5}
                fill={`url(#grad-${id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

interface KPISectionProps {
  cards: KPICardConfig[]
  kpis: KPISummary | null
  onHide: (id: KPIMetricId) => void
}

const SKELETON_PULSE = 'animate-pulse bg-white/[0.06] rounded-lg'

export function KPISection({ cards, kpis, onHide }: KPISectionProps) {
  const visible = [...cards].filter((c) => c.visible).sort((a, b) => a.order - b.order)

  if (!kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((_, i) => (
          <div key={i} className="bg-card border border-white/[0.08] rounded-2xl p-5 h-[120px] flex flex-col gap-3">
            <div className={cn(SKELETON_PULSE, 'h-8 w-8 rounded-lg')} />
            <div className={cn(SKELETON_PULSE, 'h-4 w-24')} />
            <div className={cn(SKELETON_PULSE, 'h-7 w-20')} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {visible.map((card) => (
        <KPICard
          key={card.id}
          id={card.id}
          kpis={kpis}
          onHide={() => onHide(card.id)}
        />
      ))}
    </div>
  )
}
