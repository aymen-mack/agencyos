'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Field {
  key: string
  label: string
  placeholder: string
}

interface ApiKeySectionProps {
  projectId: string
  provider: string
  label: string
  icon: string
  description: string
  fields: Field[]
  integration: { provider: string; status: string; metadata: Record<string, string> | null } | null
  webhookUrl?: string
}

export function ApiKeySection({
  projectId,
  provider,
  label,
  icon,
  description,
  fields,
  integration,
  webhookUrl,
}: ApiKeySectionProps) {
  const isConnected = integration?.status === 'active'
  const [values, setValues] = useState<Record<string, string>>({})
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleSave() {
    const primaryField = fields[0]
    if (!values[primaryField.key]?.trim()) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/integrations/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, provider, fields: values }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    await fetch('/api/integrations/apikey', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, provider }),
    })
    window.location.reload()
  }

  function copyWebhook() {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-3',
      isConnected ? 'border-emerald-500/20' : 'border-border'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {isConnected && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {isConnected && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={handleDisconnect}>
            Disconnect
          </Button>
        )}
      </div>

      {!isConnected && (
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
              <div className="flex gap-2">
                <Input
                  type={show[field.key] ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setShow((s) => ({ ...s, [field.key]: !s[field.key] }))}
                >
                  {show[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={saving || !values[fields[0].key]?.trim()}
          >
            {saved ? <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />Saved</> : saving ? 'Saving...' : 'Save & Connect'}
          </Button>
        </div>
      )}

      {webhookUrl && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Or use webhook instead:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-secondary rounded px-2 py-1.5 font-mono text-foreground truncate">
              {webhookUrl}
            </code>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-shrink-0" onClick={copyWebhook}>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
