'use client'

import { useState } from 'react'
import { X, Plus, Trash2, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateAssetModalProps {
  projectId: string
  onClose: () => void
  onCreated: (asset: { id: string; name: string }) => void
}

export function CreateAssetModal({ projectId, onClose, onCreated }: CreateAssetModalProps) {
  const [name, setName] = useState('')
  const [tabs, setTabs] = useState([{ name: 'Page 1' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addTab = () => setTabs((t) => [...t, { name: `Page ${t.length + 1}` }])
  const removeTab = (i: number) => setTabs((t) => t.filter((_, idx) => idx !== i))
  const updateTab = (i: number, value: string) =>
    setTabs((t) => t.map((tab, idx) => (idx === i ? { name: value } : tab)))

  const handleCreate = async () => {
    if (!name.trim()) { setError('Give this asset a name'); return }
    if (tabs.some((t) => !t.name.trim())) { setError('All pages need a name'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/sales-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: name.trim(), tabs }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create')
      onCreated(json.asset)
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base flex-1">New Sales Asset</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Asset name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Asset Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder="e.g. Webinar Copy, VSL Scripts, Email Sequence…"
              className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          {/* Pages / tabs */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Pages
            </label>
            <div className="space-y-1.5">
              {tabs.map((tab, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={tab.name}
                    onChange={(e) => updateTab(i, e.target.value)}
                    placeholder={`Page ${i + 1}`}
                    className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  {tabs.length > 1 && (
                    <button
                      onClick={() => removeTab(i)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addTab}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add page
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              saving
                ? 'bg-primary/40 text-primary-foreground/60 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
            )}
          >
            {saving ? 'Creating…' : 'Create Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}
