'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@radix-ui/react-label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), clientName: clientName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')

      router.push(`/dashboard/${data.projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border px-6 h-14 flex items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center pt-20 px-4">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-1">Create new project</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Each project represents a client. Data is fully isolated per project.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Project name *
              </Label>
              <Input
                id="name"
                placeholder="e.g. Acme Corp Q4 Launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9"
              />
              {name && (
                <p className="text-xs text-muted-foreground">
                  Slug: <code className="font-mono">{slugify(name)}</code>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-sm font-medium text-foreground">
                Client name
              </Label>
              <Input
                id="clientName"
                placeholder="e.g. John Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Optional. Shows in the dashboard header.</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create project'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
