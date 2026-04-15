'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface IntegrationConfig {
  provider: string
  name: string
  description: string
  icon: string
  category: 'email' | 'ads' | 'video' | 'payments' | 'forms' | 'scheduling' | 'automation'
  connectUrl?: string // for OAuth providers
  comingSoon?: boolean
}

interface IntegrationCardProps {
  config: IntegrationConfig
  status?: 'active' | 'revoked' | 'error' | null
  metadata?: Record<string, string>
  onConnect?: () => void
  onDisconnect?: () => void
  connecting?: boolean
}

const categoryColors: Record<IntegrationConfig['category'], string> = {
  email: 'text-blue-400 bg-blue-400/10',
  ads: 'text-orange-400 bg-orange-400/10',
  video: 'text-sky-400 bg-sky-400/10',
  payments: 'text-emerald-400 bg-emerald-400/10',
  forms: 'text-purple-400 bg-purple-400/10',
  scheduling: 'text-pink-400 bg-pink-400/10',
  automation: 'text-amber-400 bg-amber-400/10',
}

export function IntegrationCard({
  config,
  status,
  metadata,
  onConnect,
  onDisconnect,
  connecting,
}: IntegrationCardProps) {
  const isConnected = status === 'active'
  const hasError = status === 'error'

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 flex flex-col gap-4 transition-colors',
        isConnected ? 'border-emerald-500/20' : 'border-border',
        hasError && 'border-red-500/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-secondary">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{config.name}</p>
              {isConnected && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {hasError && (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
            <Badge
              variant="secondary"
              className={cn('text-xs mt-0.5', categoryColors[config.category])}
            >
              {config.category}
            </Badge>
          </div>
        </div>
        {isConnected && (
          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 pulse-dot" />
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>

      {/* Connected metadata */}
      {isConnected && metadata?.account && (
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Connected as</p>
          <p className="text-xs font-medium text-foreground">{metadata.account}</p>
        </div>
      )}

      {/* Actions */}
      {config.comingSoon ? (
        <Badge variant="secondary" className="w-fit text-xs">Coming soon</Badge>
      ) : isConnected ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={onDisconnect}
        >
          Disconnect
        </Button>
      ) : (
        <Button
          size="sm"
          className="w-full"
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect'
          )}
        </Button>
      )}
    </div>
  )
}
