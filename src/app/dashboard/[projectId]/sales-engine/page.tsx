'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FolderOpen, Plus, Trash2, ChevronRight } from 'lucide-react'
import { CreateAssetModal } from '@/components/sales-engine/create-asset-modal'
import { cn } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  created_at: string
}

export default function SalesEnginePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchAssets = async () => {
    const res = await fetch(`/api/sales-assets?projectId=${projectId}`)
    const json = await res.json()
    setAssets(json.assets || [])
    setLoading(false)
  }

  useEffect(() => { fetchAssets() }, [projectId])

  const handleCreated = (asset: { id: string; name: string }) => {
    setShowModal(false)
    router.push(`/dashboard/${projectId}/sales-engine/${asset.id}`)
  }

  const deleteAsset = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this sales asset and all its pages?')) return
    setDeletingId(assetId)
    await fetch(`/api/sales-assets/${assetId}`, { method: 'DELETE' })
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Sales Assets</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Sales Asset
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {assets.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-primary/60" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">No sales assets yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Create a sales asset to start writing webinar copy, VSL scripts, email sequences, and more.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Sales Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => router.push(`/dashboard/${projectId}/sales-engine/${asset.id}`)}
                className={cn(
                  'group text-left p-4 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-primary/30 transition-all shadow-sm hover:shadow-md',
                  deletingId === asset.id && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-primary/70" />
                  </div>
                  <button
                    onClick={(e) => deleteAsset(e, asset.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                    title="Delete asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <p className="font-medium text-sm">{asset.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateAssetModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
