'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, ExternalLink, X } from 'lucide-react'

interface App {
  id: string
  name: string
  description: string
  icon: string
  category: string
  connected?: boolean
  accountName?: string
  authUrl?: string
}

const APPS: App[] = [
  {
    id: 'kit',
    name: 'Kit',
    description: 'Email marketing platform. Sync subscribers, tags, and broadcast metrics.',
    icon: '📧',
    category: 'Email',
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Facebook & Instagram advertising. Track ad spend, impressions, and CPM.',
    icon: '📘',
    category: 'Advertising',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing. Track revenue, subscriptions, and refunds.',
    icon: '💳',
    category: 'Payments',
  },
  {
    id: 'whop',
    name: 'Whop',
    description: 'Community & membership platform. Sync membership revenue.',
    icon: '🛒',
    category: 'Payments',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5,000+ apps. Send data to your dashboard from any tool.',
    icon: '⚡',
    category: 'Automation',
  },
  {
    id: 'make',
    name: 'Make.com',
    description: 'Visual automation builder. Create scenarios to route data into your dashboard.',
    icon: '🔧',
    category: 'Automation',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'All-in-one CRM and marketing platform. Sync contacts and pipeline stages.',
    icon: '🎯',
    category: 'CRM',
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Email & CRM platform. Sync contacts, tags, and automations.',
    icon: '📮',
    category: 'Email',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Scheduling tool. Automatically create leads when calls are booked.',
    icon: '📅',
    category: 'Scheduling',
  },
  {
    id: 'typeform',
    name: 'Typeform',
    description: 'Survey and form builder. Receive form responses and score leads.',
    icon: '📋',
    category: 'Forms',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team messaging. Get alerts when leads hit milestones or deals close.',
    icon: '💬',
    category: 'Notifications',
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Website builder. Capture form submissions and track visitor conversions.',
    icon: '🌐',
    category: 'Forms',
  },
]

const CATEGORIES = ['All', ...Array.from(new Set(APPS.map((a) => a.category))).sort()]

const CATEGORY_COLORS: Record<string, string> = {
  Email:         'bg-blue-500/10 text-blue-400',
  Advertising:   'bg-rose-500/10 text-rose-400',
  Payments:      'bg-emerald-500/10 text-emerald-400',
  Automation:    'bg-amber-500/10 text-amber-400',
  CRM:           'bg-violet-500/10 text-violet-400',
  Scheduling:    'bg-cyan-500/10 text-cyan-400',
  Forms:         'bg-orange-500/10 text-orange-400',
  Notifications: 'bg-pink-500/10 text-pink-400',
}

export function AppsTab({ projectId }: { projectId: string }) {
  const [activeCategory, setActiveCategory] = useState('All')
  // Mock connected state: kit and stripe start as connected demos
  const [connected, setConnected] = useState<Record<string, { name: string } | null>>({
    kit:    { name: 'marketing@company.com' },
    stripe: { name: 'acct_1234 · Live mode' },
  })
  const [connecting, setConnecting] = useState<string | null>(null)

  const filtered = activeCategory === 'All'
    ? APPS
    : APPS.filter((a) => a.category === activeCategory)

  async function handleConnect(app: App) {
    if (connected[app.id]) {
      // Disconnect
      setConnected((prev) => ({ ...prev, [app.id]: null }))
      return
    }
    // Mock OAuth flow
    setConnecting(app.id)
    await new Promise((r) => setTimeout(r, 1200))
    setConnected((prev) => ({
      ...prev,
      [app.id]: { name: `demo@${app.id}.com` },
    }))
    setConnecting(null)
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">Connected Apps</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect third-party tools to power your automations and sync data.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((app) => {
          const conn = connected[app.id]
          const isConnecting = connecting === app.id

          return (
            <div
              key={app.id}
              className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
            >
              <div className="text-2xl w-10 h-10 flex items-center justify-center bg-secondary rounded-xl flex-shrink-0">
                {app.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{app.name}</p>
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    CATEGORY_COLORS[app.category] ?? 'bg-secondary text-muted-foreground'
                  )}>
                    {app.category}
                  </span>
                  {conn && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                      <Check className="w-3 h-3" />
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{app.description}</p>
                {conn && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{conn.name}</p>
                )}
              </div>

              <button
                onClick={() => handleConnect(app)}
                disabled={isConnecting}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  conn
                    ? 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border'
                    : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
                  isConnecting && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isConnecting ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : conn ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                {isConnecting ? 'Connecting…' : conn ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
