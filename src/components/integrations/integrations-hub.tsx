'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { Integration } from '@/types/database'
import { IntegrationCard, IntegrationConfig } from './integration-card'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'

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
      window.location.href = `/api/integrations/kit/connect?projectId=${projectId}`
    }
    // Webhook providers are self-service — their setup cards are always visible below
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

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools to automatically pull data into this project.
        </p>
      </div>

      {/* OAuth / coming-soon integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.filter((c) => !WEBHOOK_PROVIDERS.includes(c.provider)).map((config) => {
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

      {/* Webhook self-service setup */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Webhook Integrations</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Copy the URL below and paste it into the platform — no coding required.
        </p>
        <div className="space-y-4">
          {WEBHOOK_SETUP.map((ws) => (
            <WebhookSetupCard
              key={ws.provider}
              {...ws}
              url={`${origin}/api/webhooks/${ws.provider}?projectId=${projectId}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Webhook providers list ────────────────────────────────────────────────────

const WEBHOOK_PROVIDERS = ['typeform', 'make']

interface WebhookSetup {
  provider: string
  name: string
  icon: string
  steps: string[]
}

const WEBHOOK_SETUP: WebhookSetup[] = [
  {
    provider: 'typeform',
    name: 'Typeform',
    icon: '📋',
    steps: [
      'Open your Typeform and go to Connect → Webhooks',
      'Click "Add a webhook"',
      'Paste the URL above into the Endpoint field',
      'Toggle the webhook ON and click Save',
      'Every new survey submission will now appear in this project automatically',
    ],
  },
  {
    provider: 'make',
    name: 'Make.com',
    icon: '⚙️',
    steps: [
      'Open your Make.com scenario',
      'Add or find the module that has your lead data (e.g. Typeform, Google Sheets, CRM)',
      'After that module, add an HTTP → Make a request module',
      'Set Method to POST and paste the URL above',
      'Set Body type to Raw, format to JSON',
      'Map the fields: email, name, status, age, income, occupation, sophistication, challenges, previous_investment, speed_to_action',
      'Run the scenario — leads will appear in this project instantly',
    ],
  },
]

// ── WebhookSetupCard ──────────────────────────────────────────────────────────

function WebhookSetupCard({ name, icon, url, steps }: WebhookSetup & { url: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-foreground flex-1">{name}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {open ? 'Hide setup guide ↑' : 'View setup guide ↓'}
        </button>
      </div>

      {/* URL row — always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        <code className="flex-1 text-xs font-mono bg-secondary rounded-lg px-3 py-2 text-foreground truncate">
          {url}
        </code>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>

      {/* Expandable setup steps */}
      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Setup guide</p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
