'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, Pencil, FolderOpen, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RichTextEditor } from './rich-text-editor'

interface Tab {
  id: string
  name: string
  content: string
  position: number
}

interface AssetEditorProps {
  assetId: string
  assetName: string
  projectId: string
  initialTabs: Tab[]
}

export function AssetEditor({ assetId, assetName, projectId, initialTabs }: AssetEditorProps) {
  const router = useRouter()
  const [tabs, setTabs] = useState<Tab[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs[0]?.id ?? '')
  const [name, setName] = useState(assetName)
  const [editingName, setEditingName] = useState(false)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renamingTabValue, setRenamingTabValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  // Debounced auto-save per tab
  const onContentChange = useCallback((tabId: string, html: string) => {
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, content: html } : t))

    const existing = saveTimers.current.get(tabId)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(async () => {
      saveTimers.current.delete(tabId)
      await fetch(`/api/sales-assets/tabs/${tabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html }),
      })
      setSavedAt(new Date().toLocaleTimeString())
    }, 800)
    saveTimers.current.set(tabId, timer)
  }, [])

  // Save asset name
  const saveAssetName = async (newName: string) => {
    setEditingName(false)
    if (!newName.trim() || newName === assetName) return
    setName(newName)
    await fetch(`/api/sales-assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    router.refresh()
  }

  // Add a new tab
  const addTab = async () => {
    const newName = `Page ${tabs.length + 1}`
    const res = await fetch(`/api/sales-assets/${assetId}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const json = await res.json()
    if (json.tab) {
      setTabs((prev) => [...prev, json.tab])
      setActiveTabId(json.tab.id)
    }
  }

  // Rename a tab
  const startRenameTab = (tab: Tab) => {
    setRenamingTabId(tab.id)
    setRenamingTabValue(tab.name)
  }

  const saveRenameTab = async (tabId: string) => {
    const newName = renamingTabValue.trim()
    setRenamingTabId(null)
    if (!newName) return
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, name: newName } : t))
    await fetch(`/api/sales-assets/tabs/${tabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
  }

  // Delete a tab
  const deleteTab = async (tabId: string) => {
    if (tabs.length <= 1) return // keep at least one
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) setActiveTabId(newTabs[0]?.id ?? '')
    await fetch(`/api/sales-assets/tabs/${tabId}`, { method: 'DELETE' })
  }

  // Manual save all
  const saveAll = async () => {
    setSaving(true)
    await Promise.all(
      tabs.map((t) =>
        fetch(`/api/sales-assets/tabs/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: t.content }),
        })
      )
    )
    setSaving(false)
    setSavedAt(new Date().toLocaleTimeString())
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border flex-shrink-0 bg-card/50">
        <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />

        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => saveAssetName(name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveAssetName(name)
              if (e.key === 'Escape') { setName(assetName); setEditingName(false) }
            }}
            className="bg-secondary/60 border border-border rounded px-2 py-0.5 text-sm font-medium outline-none focus:ring-1 focus:ring-primary/40 w-48"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 group"
          >
            <span className="text-sm font-medium">{name}</span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-muted-foreground">Saved {savedAt}</span>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              saving
                ? 'bg-primary/20 text-primary/60 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
          >
            {saving ? <><Check className="w-3.5 h-3.5" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>

      {/* Body: tabs sidebar + editor */}
      <div className="flex flex-1 min-h-0">
        {/* Vertical tabs sidebar */}
        <aside className="w-44 flex-shrink-0 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
          <div className="px-2 pt-3 pb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Pages</span>
          </div>

          <div className="flex-1 px-2 space-y-0.5 py-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
                  activeTabId === tab.id
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
                onClick={() => setActiveTabId(tab.id)}
              >
                {renamingTabId === tab.id ? (
                  <input
                    autoFocus
                    value={renamingTabValue}
                    onChange={(e) => setRenamingTabValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => saveRenameTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRenameTab(tab.id)
                      if (e.key === 'Escape') setRenamingTabId(null)
                    }}
                    className="w-full bg-secondary border border-border rounded px-1 py-0 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-xs truncate">{tab.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRenameTab(tab) }}
                        className="p-0.5 rounded hover:text-foreground"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {tabs.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTab(tab.id) }}
                          className="p-0.5 rounded hover:text-destructive"
                          title="Delete page"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-border">
            <button
              onClick={addTab}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add page
            </button>
          </div>
        </aside>

        {/* Rich text editor */}
        <div className="flex-1 min-w-0 min-h-0 relative bg-background">
          {activeTab && (
            <RichTextEditor
              key={activeTab.id}
              content={activeTab.content}
              onChange={(html) => onContentChange(activeTab.id, html)}
              placeholder="Start writing…"
            />
          )}
        </div>
      </div>
    </div>
  )
}
