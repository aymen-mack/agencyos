'use client'

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState } from 'react'
import { nodeTypes } from './custom-nodes'
import { TRIGGER_TYPES, ACTION_TYPES } from './templates-data'
import type { AutomationNode, AutomationEdge, AutomationNodeData } from './types'
import { cn } from '@/lib/utils'
import { Zap, Play, GitBranch, Clock, Plus, Save, Check } from 'lucide-react'

interface AutomationCanvasProps {
  initialNodes?: AutomationNode[]
  initialEdges?: AutomationEdge[]
  automationId?: string
  automationName?: string
  projectId: string
  onSave?: (nodes: AutomationNode[], edges: AutomationEdge[]) => Promise<void>
  onNameChange?: (name: string) => void
}

const NODE_PALETTE = [
  {
    type: 'trigger' as const,
    label: 'Trigger',
    icon: Zap,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    items: TRIGGER_TYPES,
  },
  {
    type: 'action' as const,
    label: 'Action',
    icon: Play,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    items: ACTION_TYPES,
  },
  {
    type: 'condition' as const,
    label: 'Condition',
    icon: GitBranch,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    items: [
      { value: 'if_else', label: 'If / Else' },
      { value: 'score_check', label: 'Score Check' },
      { value: 'tag_check', label: 'Tag Check' },
      { value: 'field_check', label: 'Field Check' },
    ],
  },
  {
    type: 'delay' as const,
    label: 'Delay',
    icon: Clock,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    items: [
      { value: 'wait_minutes', label: 'Wait X Minutes' },
      { value: 'wait_hours', label: 'Wait X Hours' },
      { value: 'wait_days', label: 'Wait X Days' },
      { value: 'wait_until', label: 'Wait Until Date' },
    ],
  },
]

let nodeIdCounter = 100

export function AutomationCanvas({
  initialNodes = [],
  initialEdges = [],
  automationName = 'Untitled Automation',
  projectId,
  onSave,
  onNameChange,
}: AutomationCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AutomationNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<AutomationEdge>(initialEdges)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(automationName)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges]
  )

  function addNode(type: AutomationNode['type'], label: string, description: string) {
    const id = `node_${++nodeIdCounter}`
    const newNode: AutomationNode = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 100 + nodes.length * 120 },
      data: { label, description },
    }
    setNodes((nds) => [...nds, newNode])
  }

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(nodes, edges)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left palette panel */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Node Library</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Drag or click to add</p>
        </div>
        <div className="flex-1 p-2 space-y-3">
          {NODE_PALETTE.map((category) => {
            const Icon = category.icon
            return (
              <div key={category.type}>
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <Icon className={cn('w-3 h-3', category.color)} />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{category.label}</span>
                </div>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => addNode(category.type, item.label, '')}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-lg border text-xs text-foreground hover:ring-1 hover:ring-primary/50 transition-all flex items-center gap-2',
                        category.bg
                      )}
                    >
                      <Plus className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card flex-shrink-0">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { setEditingName(false); onNameChange?.(name) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); onNameChange?.(name) } }}
              className="text-sm font-semibold bg-transparent border-b border-primary outline-none min-w-0 flex-1 max-w-xs"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate max-w-xs"
            >
              {name}
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{nodes.length} nodes · {edges.length} connections</span>
            <button
              onClick={handleSave}
              disabled={saving || !onSave}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                saved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50'
              )}
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* ReactFlow */}
        <div className="flex-1 bg-[#0d0d0d]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#3f3f46', strokeWidth: 2 } }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#27272a"
            />
            <Controls className="!bg-card !border-border" />
            <MiniMap
              className="!bg-card !border !border-border"
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  trigger: '#10b981',
                  action: '#3b82f6',
                  condition: '#f59e0b',
                  delay: '#a855f7',
                }
                return colors[node.type ?? ''] ?? '#52525b'
              }}
              maskColor="rgba(0,0,0,0.4)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
