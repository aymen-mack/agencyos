'use client'

import { useState } from 'react'
import { WebhookSection } from './webhook-section'
import { ApiKeySection } from './api-key-section'
import { KitOAuthCard } from './kit-oauth-card'
import { AppsTab } from './apps-tab'
import { cn } from '@/lib/utils'

interface Integration {
  provider: string
  status: string
  metadata: Record<string, string> | null
}

interface SettingsHubProps {
  projectId: string
  integrations: Integration[]
}

type TabId = 'webhooks' | 'apps'

export function SettingsHub({ projectId, integrations }: SettingsHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('webhooks')
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookBase = `${baseUrl}/api/webhooks`

  function getIntegration(provider: string) {
    return integrations.find((i) => i.provider === provider) || null
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'webhooks', label: 'Webhooks & API Keys' },
    { id: 'apps', label: 'Apps' },
  ]

  return (
    <div className="max-w-3xl">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'apps' && (
        <AppsTab projectId={projectId} />
      )}

      {activeTab === 'webhooks' && (
      <div className="space-y-8">

      {/* Make.com — primary data source */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">Make.com (Recommended)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect any app to your dashboard using Make.com automations. Create a scenario in Make, add an HTTP module, and POST data to the webhook URL below.
        </p>
        <WebhookSection
          label="Make.com Webhook URL"
          url={`${webhookBase}/make?projectId=${projectId}`}
          description="Use this in a Make.com HTTP → Make a request module. Set method to POST, body type to JSON."
          docsSteps={[
            'In Make.com, create a new Scenario',
            'Add any trigger (Typeform, Webflow, Google Sheets, etc.)',
            'Add an HTTP → Make a request module',
            'Set URL to the webhook above, method to POST',
            'Map your data fields to the JSON body',
            'Include an "email" field — this identifies the lead',
            'Optionally include "event_type" to set the lead event type',
          ]}
        />
      </section>

      {/* Webflow */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">Webflow</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Receive registrations from Webflow form submissions directly into this project's leads.
        </p>
        <div className="space-y-3">
          <WebhookSection
            label="Webflow Webhook URL"
            url={`${webhookBase}/webflow?projectId=${projectId}`}
            description="Paste this in Webflow → Site Settings → Integrations → Webhooks. Set trigger to Form Submission."
            docsSteps={[
              'In Webflow, open Site Settings → Integrations → Webhooks',
              'Click Add Webhook',
              'Set Trigger Type to Form Submission',
              'Paste the URL above and save',
              'Webflow will display a signing secret — copy it',
              'Paste that signing secret in the field below and click Save',
            ]}
          />
          <ApiKeySection
            projectId={projectId}
            provider="webflow"
            label="Webflow"
            icon="🌊"
            description="Signing secret from Webflow — used to verify requests are genuinely from Webflow."
            fields={[
              { key: 'webhook_secret', label: 'Webhook Signing Secret', placeholder: 'paste the key Webflow gave you' },
            ]}
            integration={getIntegration('webflow')}
          />
        </div>
      </section>

      {/* Typeform */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">Typeform</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically receive survey responses and score leads when someone fills out your form.
        </p>
        <WebhookSection
          label="Typeform Webhook URL"
          url={`${webhookBase}/typeform?projectId=${projectId}`}
          description="Paste this URL in Typeform → Connect → Webhooks. Responses will automatically create and score leads."
          docsSteps={[
            'Open your Typeform form',
            'Go to Connect → Webhooks',
            'Click Add a webhook',
            'Paste the URL above and save',
            'Include a Hidden field called "email" in your form so leads are identified',
          ]}
        />
      </section>

      {/* Kit OAuth */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">Kit (Email)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect Kit to sync subscriber counts and email broadcast metrics.
        </p>
        <KitOAuthCard
          projectId={projectId}
          integration={getIntegration('kit')}
        />
      </section>

      {/* API Keys */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">API Keys</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Paste API keys to enable direct data sync for these platforms.
        </p>
        <div className="space-y-4">
          <ApiKeySection
            projectId={projectId}
            provider="meta_ads"
            label="Meta Ads"
            icon="📘"
            description="Facebook & Instagram ad spend, impressions, CPM, clicks."
            fields={[
              { key: 'access_token', label: 'Access Token', placeholder: 'EAABsbCS...' },
              { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_123456789' },
            ]}
            integration={getIntegration('meta_ads')}
          />
          <ApiKeySection
            projectId={projectId}
            provider="stripe"
            label="Stripe"
            icon="💳"
            description="Track payments and revenue. Or use the Stripe webhook below."
            fields={[
              { key: 'access_token', label: 'Secret Key', placeholder: 'sk_live_...' },
            ]}
            integration={getIntegration('stripe')}
            webhookUrl={`${webhookBase}/stripe?projectId=${projectId}`}
          />
          <ApiKeySection
            projectId={projectId}
            provider="whop"
            label="Whop"
            icon="🛒"
            description="Community membership revenue from Whop."
            fields={[
              { key: 'access_token', label: 'API Key', placeholder: 'whop_...' },
            ]}
            integration={getIntegration('whop')}
            webhookUrl={`${webhookBase}/whop?projectId=${projectId}`}
          />
        </div>
      </section>

      {/* Data format reference */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">Make.com JSON Format</h2>
        <p className="text-sm text-muted-foreground mb-3">
          When sending data via Make.com, use this JSON structure. All fields are optional except <code className="text-xs bg-secondary px-1 py-0.5 rounded">email</code>.
        </p>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Example payload</span>
          </div>
          <pre className="p-4 text-xs text-foreground overflow-x-auto leading-relaxed font-mono">{`{
  "email": "lead@example.com",
  "name": "John Smith",
  "event_type": "webinar_registered",

  // Lead survey data (for scoring):
  "income_level": "high",
  "timeline": "immediately",
  "decision_maker": true,

  // Any custom fields you want to store:
  "source": "facebook_ad",
  "campaign": "Q4 Launch"
}`}</pre>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-foreground mb-2">Supported event_type values:</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              ['form_submission', '20 pts'],
              ['webinar_registered', '15 pts'],
              ['webinar_attended', '35 pts'],
              ['email_open', '2 pts'],
              ['email_click', '8 pts'],
              ['call_booked', '50 pts'],
              ['call_showed', '70 pts'],
              ['deal_closed', '100 pts'],
            ].map(([type, pts]) => (
              <div key={type} className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30">
                <code className="text-xs text-foreground">{type}</code>
                <span className="text-xs text-emerald-400">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      </div>
      )}
    </div>
  )
}
