'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, Plus, Trash2, FileText, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliveryTask, TaskStatus } from '@/types/delivery'

const STATUS_ICONS: Record<TaskStatus, React.FC<{ className?: string }>> = {
  todo:        Circle,
  in_progress: Clock,
  done:        CheckCircle2,
}

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'done']

interface SalesAsset {
  id: string
  name: string
}

interface TaskListProps {
  nodeId: string
  projectId: string
  tasks: DeliveryTask[]
  onTasksChange: (tasks: DeliveryTask[]) => void
}

export function TaskList({ nodeId, projectId, tasks, onTasksChange }: TaskListProps) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<SalesAsset[]>([])
  const [pickerTaskId, setPickerTaskId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newAssetName, setNewAssetName] = useState('')

  useEffect(() => {
    if (adding) addRef.current?.focus()
  }, [adding])

  useEffect(() => {
    fetch(`/api/sales-assets?projectId=${projectId}`)
      .then((r) => r.json())
      .then((j) => setAssets(j.assets || []))
  }, [projectId])

  const cycleStatus = async (task: DeliveryTask) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length]
    onTasksChange(tasks.map((t) => t.id === task.id ? { ...t, status: next } : t))
    await fetch(`/api/delivery/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  const addTask = async () => {
    const name = newName.trim()
    setNewName('')
    setAdding(false)
    if (!name) return
    const sort_order = tasks.length
    const res = await fetch('/api/delivery/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, name, sort_order }),
    })
    const json = await res.json()
    if (json.task) onTasksChange([...tasks, json.task])
  }

  const deleteTask = async (id: string) => {
    onTasksChange(tasks.filter((t) => t.id !== id))
    await fetch(`/api/delivery/tasks/${id}`, { method: 'DELETE' })
  }

  const linkAsset = async (taskId: string, assetId: string) => {
    setPickerTaskId(null)
    onTasksChange(tasks.map((t) => t.id === taskId ? { ...t, sales_asset_id: assetId } : t))
    await fetch(`/api/delivery/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_asset_id: assetId }),
    })
  }

  const unlinkAsset = async (taskId: string) => {
    setPickerTaskId(null)
    onTasksChange(tasks.map((t) => t.id === taskId ? { ...t, sales_asset_id: null } : t))
    await fetch(`/api/delivery/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_asset_id: null }),
    })
  }

  const createAndLink = async (taskId: string) => {
    const name = newAssetName.trim() || 'Untitled'
    setCreating(false)
    setNewAssetName('')
    setPickerTaskId(null)
    const res = await fetch('/api/sales-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name }),
    })
    const json = await res.json()
    if (!json.asset) return
    const newAsset: SalesAsset = { id: json.asset.id, name: json.asset.name }
    setAssets((prev) => [...prev, newAsset])
    await linkAsset(taskId, newAsset.id)
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    return a.sort_order - b.sort_order
  })

  return (
    <div className="space-y-0.5">
      {sorted.map((task) => {
        const Icon = STATUS_ICONS[task.status]
        const linkedAsset = task.sales_asset_id ? assets.find((a) => a.id === task.sales_asset_id) : null
        const isPickerOpen = pickerTaskId === task.id

        return (
          <div key={task.id} className="group relative">
            <div className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors">
              <button
                onClick={() => cycleStatus(task)}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  task.status === 'done'        && 'text-emerald-400',
                  task.status === 'in_progress' && 'text-blue-400',
                  task.status === 'todo'        && 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
              <span className={cn(
                'flex-1 text-sm min-w-0 truncate',
                task.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200',
              )}>
                {task.name}
              </span>

              {task.sales_asset_id ? (
                <a
                  href={`/dashboard/${projectId}/sales-engine/${task.sales_asset_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={linkedAsset?.name || 'View asset'}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-0.5 rounded text-[#C8F55A]/70 hover:text-[#C8F55A] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPickerTaskId(isPickerOpen ? null : task.id)
                    setCreating(false)
                    setNewAssetName('')
                  }}
                  title="Link to Sales Asset"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isPickerOpen && (
              <div className="mt-0.5 ml-7 mr-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                {linkedAsset && (
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 truncate">{linkedAsset.name}</span>
                    <button
                      onClick={() => unlinkAsset(task.id)}
                      className="text-xs text-red-500/70 hover:text-red-400 flex-shrink-0 transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                )}
                <div className="max-h-36 overflow-y-auto">
                  {assets.filter((a) => a.id !== task.sales_asset_id).length === 0 && !creating && (
                    <p className="text-xs text-zinc-600 px-3 py-2">No other assets</p>
                  )}
                  {assets.filter((a) => a.id !== task.sales_asset_id).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => linkAsset(task.id, a.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 truncate transition-colors"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-800">
                  {creating ? (
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <input
                        autoFocus
                        value={newAssetName}
                        onChange={(e) => setNewAssetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createAndLink(task.id)
                          if (e.key === 'Escape') { setCreating(false); setNewAssetName('') }
                        }}
                        placeholder="Asset name…"
                        className="flex-1 bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => createAndLink(task.id)}
                        className="text-xs px-2 py-1 bg-[#C8F55A] text-black rounded font-medium hover:bg-[#d4f96e] transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreating(true)}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#C8F55A]/70 hover:text-[#C8F55A] hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Create new asset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          <input
            ref={addRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            onBlur={addTask}
            placeholder="Task name…"
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-1 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/40 w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      )}
    </div>
  )
}
