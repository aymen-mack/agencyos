'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WebhookSectionProps {
  label: string
  url: string
  description: string
  docsSteps: string[]
}

export function WebhookSection({ label, url, description, docsSteps }: WebhookSectionProps) {
  const [copied, setCopied] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-secondary rounded-lg px-3 py-2 font-mono text-foreground truncate">
              {url}
            </code>
            <Button size="sm" variant="outline" className="h-8 px-3 flex-shrink-0" onClick={copy}>
              {copied ? (
                <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        </div>

        <button
          onClick={() => setShowSteps((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showSteps ? 'Hide' : 'Show'} setup instructions
        </button>

        {showSteps && (
          <ol className="space-y-1.5 pl-1">
            {docsSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
