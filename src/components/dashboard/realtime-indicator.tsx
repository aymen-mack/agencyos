'use client'

import { cn } from '@/lib/utils'
import { useRealtime } from '@/components/providers/realtime-provider'

export function RealtimeIndicator() {
  const { connectionState } = useRealtime()

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full pulse-dot',
          connectionState === 'connected' && 'bg-emerald-400',
          connectionState === 'connecting' && 'bg-amber-400',
          connectionState === 'disconnected' && 'bg-red-400'
        )}
      />
      <span>
        {connectionState === 'connected' && 'Live'}
        {connectionState === 'connecting' && 'Connecting'}
        {connectionState === 'disconnected' && 'Offline'}
      </span>
    </div>
  )
}
