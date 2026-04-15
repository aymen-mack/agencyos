'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { Integration } from '@/types/database'
import { IntegrationCard, IntegrationConfig } from './integration-card'
import { toast } from 'sonner'

const INTEGRATIONS: IntegrationConfig[] = [
  {
    provider: 'kit',
    name: 'Kit',
    description: 'Connect Kit (formerly ConvertKit) to sync subscriber data, email sequences, and broadcast metrics.',
    icon: '✉️',
    category: 'email',
  },
  {
    provider: 'typeform',
    name: 'Typeform',
    description: 'Receive survey responses via webhook to score leads automatically.',
    icon: '📋',
    category: 'forms',
  },
  {
    provider: 'meta_ads',
    name: 'Meta Ads',
    description: 'Pull Facebook and Instagram ad spend, impressions, CPM, and conversion data.',
    icon: '📘',
    category: 'ads',
  },
  {
    provider: 'zoom',
    name: 'Zoom',
    description: 'Sync webinar registrant and attendee data from Zoom Webinars.',
    icon: '🎥',
    category: 'video',
    comingSoon: true,
  },
  {
    provider: 'stripe',
    name: 'Stripe',
    description: 'Track payments, subscriptions, and revenue metrics from Stripe.',
    icon: '💳',
    category: 'payments',
    comingSoon: true,
  },
  {
    provider: 'whop',
    name: 'Whop',
    description: 'Monitor community memberships and revenue from Whop.',
    icon: '🛒',
    category: 'payments',
    comingSoon: true,
  },
  {
    provider: 'fanbasis',
    name: 'Fanbasis',
    description: 'Track fan engagement and monetization from Fanbasis.',
    icon: '⭐',
    category: 'payments',
    comingSoon: true,
  },
  {
    provider: 'cal_com',
    name: 'Cal.com',
    description: 'Sync call bookings and show rates from Cal.com scheduling.',
    icon: '📅',
    category: 'scheduling',
    comingSoon: true,
  },
  {
    provider: 'calendly',
    name: 'Calendly',
    description: 'Sync call bookings and show rates from Calendly.',
    icon: '🗓️',
    category: 'scheduling',
    comingSoon: true,
  },
  {
    provider: 'make',
    name: 'Make.com',
    description: 'Receive data from any Make.com automation scenario via webhook.',
    icon: '⚙️',
    category: 'automation',
  },
]

interface IntegrationsHubProps {
  projectId: string
}

export function IntegrationsHub({ projectId }: IntegrationsHubProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = await getToken({ template: 'supabase' })
    if (!token) return
    const supabase = createSupabaseClientWithToken(token)
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
    setIntegrations(data || [])
    setLoading(false)
  }, [projectId, getToken])

  useEffect(() => {
    load()
  }, [load])

  // Show toast on OAuth callback return
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      toast.success(`${connected} connected successfully`)
      load()
      // Remove query param
      router.replace(`/dashboard/${projectId}/settings`)
    }
    if (error) {
      toast.error(`Connection failed: ${error}`)
      router.replace(`/dashboard/${projectId}/settings`)
    }
  }, [searchParams, projectId, router, load])

  function getIntegrationStatus(provider: string) {
    return integrations.find((i) => i.provider === provider) || null
  }

  async function handleConnect(provider: string) {
    if (provider === 'kit') {
      setConnecting('kit')
      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/integrations/kit/connect?projectId=${projectId}`
      return
    }
    // For webhook-only integrations (typeform, make) — show webhook URL
    toast.info(`Configure your ${provider} webhook to: ${window.location.origin}/api/webhooks/${provider}?projectId=${projectId}`)
  }

  async function handleDisconnect(provider: string) {
    const token = await getToken({ template: 'supabase' })
    if (!token) return
    const supabase = createSupabaseClientWithToken(token)
    await supabase
      .from('integrations')
      .update({ status: 'revoked', access_token: null, refresh_token: null })
      .eq('project_id', projectId)
      .eq('provider', provider)
    toast.success(`${provider} disconnected`)
    load()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 h-44 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools to automatically pull data into this project.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((config) => {
          const integration = getIntegrationStatus(config.provider)
          return (
            <IntegrationCard
              key={config.provider}
              config={config}
              status={integration?.status as 'active' | 'revoked' | 'error' | null}
              metadata={integration?.metadata as Record<string, string> | undefined}
              connecting={connecting === config.provider}
              onConnect={() => handleConnect(config.provider)}
              onDisconnect={() => handleDisconnect(config.provider)}
            />
          )
        })}
      </div>

      {/* Webhook info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-2">Webhook Endpoints</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use these URLs in Make.com, Typeform, or any other webhook source to push data into this project.
        </p>
        <div className="space-y-2">
          {['typeform', 'make', 'stripe', 'whop'].map((provider) => (
            <div key={provider} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 capitalize">{provider}</span>
              <code className="text-xs bg-secondary rounded px-2 py-1 text-foreground font-mono flex-1 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/{provider}?projectId={projectId}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
