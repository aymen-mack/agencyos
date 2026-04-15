'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KitOAuthCardProps {
  projectId: string
  integration: { provider: string; status: string; metadata: Record<string, string> | null } | null
}

export function KitOAuthCard({ projectId, integration }: KitOAuthCardProps) {
  const isConnected = integration?.status === 'active'
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/integrations/apikey', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, provider: 'kit' }),
    })
    window.location.reload()
  }

  return (
    <div className={`rounded-xl border bg-card p-4 ${isConnected ? 'border-emerald-500/20' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">✉️</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Kit</p>
              {isConnected && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                  {integration?.metadata?.account && ` · ${integration.metadata.account}`}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Syncing subscriber and email metrics.' : 'Connect via OAuth to sync email metrics.'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Disconnect'}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => window.location.href = `/api/integrations/kit/connect?projectId=${projectId}`}
          >
            Connect Kit
          </Button>
        )}
      </div>
    </div>
  )
}
