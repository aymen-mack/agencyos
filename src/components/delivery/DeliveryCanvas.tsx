'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node as FlowNode,
  type Edge,
  type Connection,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { Plus } from 'lucide-react'
import { DeliveryNodeComponent_, type DeliveryNodeData } from './DeliveryNode'
import { NodeDetailPanel } from './NodeDetailPanel'
import { CanvasToolbar } from './CanvasToolbar'
import type { DeliveryNode, DeliveryEdge, DeliveryTask, OrgMember, NodeType, NodeStatus } from '@/types/delivery'

const NODE_WIDTH  = 220
const NODE_HEIGHT = 130

const NODE_TYPES = { delivery: DeliveryNodeComponent_ }

// ── Dagre auto-layout ─────────────────────────────────────────────────────────
function applyDagreLayout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}

// ── Dependency recalculation ──────────────────────────────────────────────────
function recalcDependencies(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const incoming = new Map<string, string[]>()
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    incoming.get(e.target)!.push(e.source)
  }
  return nodes.map((node) => {
    const d = node.data as DeliveryNodeData
    if (d.manual_unlock) return node
    const sources = incoming.get(node.id) || []
    if (sources.length === 0) return node
    const allDone = sources.every((sid) =>
      (nodes.find((n) => n.id === sid)?.data as DeliveryNodeData | undefined)?.status === 'done'
    )
    const currentStatus = d.status
    let newStatus = currentStatus
    if (!allDone && currentStatus !== 'locked') newStatus = 'locked'
    else if (allDone && currentStatus === 'locked') newStatus = 'ready'
    if (newStatus === currentStatus) return node
    return { ...node, data: { ...d, status: newStatus } }
  })
}

// ── DB node → Flow node ───────────────────────────────────────────────────────
function toFlowNode(n: DeliveryNode, members: OrgMember[], taskMap: Map<string, DeliveryTask[]>): FlowNode {
  const member = members.find((m) => m.clerk_user_id === n.assignee_id) ?? null
  const tasks = taskMap.get(n.id) ?? []
  return {
    id: n.id,
    type: 'delivery',
    position: { x: n.position_x, y: n.position_y },
    data: {
      dbId: n.id,
      name: n.name,
      nodeType: n.node_type as NodeType,
      status: n.status as NodeStatus,
      assigneeName: member?.full_name ?? member?.email ?? null,
      assigneeAvatar: member?.avatar_url ?? null,
      taskTotal: tasks.length,
      taskDone: tasks.filter((t) => t.status === 'done').length,
      manual_unlock: n.manual_unlock,
    } satisfies DeliveryNodeData,
  }
}

// ── DB edge → Flow edge ───────────────────────────────────────────────────────
function toFlowEdge(e: DeliveryEdge): Edge {
  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b', width: 14, height: 14 },
    style: { stroke: '#52525b', strokeWidth: 1.5 },
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface CtxMenu {
  containerX: number
  containerY: number
  flowX: number
  flowY: number
}

interface InnerProps {
  projectId: string
  initialNodes: DeliveryNode[]
  initialEdges: DeliveryEdge[]
  members: OrgMember[]
}

function DeliveryCanvasInner({ projectId, initialNodes, initialEdges, members }: InnerProps) {
  const { fitView, screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)

  const [taskMap, setTaskMap] = useState<Map<string, DeliveryTask[]>>(new Map())

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map((n) => toFlowNode(n, members, new Map()))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges.map(toFlowEdge))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [ctxName, setCtxName] = useState('')
  const ctxInputRef = useRef<HTMLInputElement>(null)

  const [dbNodes, setDbNodes] = useState<Map<string, DeliveryNode>>(
    () => new Map(initialNodes.map((n) => [n.id, n]))
  )
  const posTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Auto-focus right-click input when menu appears
  useEffect(() => {
    if (ctxMenu) setTimeout(() => ctxInputRef.current?.focus(), 30)
  }, [ctxMenu])

  // Fit view once on first load (no-op if canvas is empty — that's fine)
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.2, duration: 0 }), 100)
  }, [fitView])

  // ── Task progress sync ────────────────────────────────────────────────────
  const refreshNodeTaskCounts = useCallback((nodeId: string, tasks: DeliveryTask[]) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n
        const d = n.data as DeliveryNodeData
        return { ...n, data: { ...d, taskTotal: tasks.length, taskDone: tasks.filter((t) => t.status === 'done').length } }
      })
    )
  }, [setNodes])

  // ── Connect (create edge) ─────────────────────────────────────────────────
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return
    const res = await fetch('/api/delivery/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, source_node_id: connection.source, target_node_id: connection.target }),
    })
    const json = await res.json()
    if (!json.edge) return
    const newEdge = toFlowEdge(json.edge as DeliveryEdge)
    setEdges((eds) => {
      const next = addEdge(newEdge, eds)
      setNodes((nds) => recalcDependencies(nds, next))
      return next
    })
    setNodes((nds) => {
      for (const n of nds) {
        const db = dbNodes.get(n.id)
        if (db && (n.data as DeliveryNodeData).status !== db.status) {
          fetch(`/api/delivery/nodes/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: (n.data as DeliveryNodeData).status }),
          })
        }
      }
      return nds
    })
  }, [projectId, setEdges, setNodes, dbNodes])

  // ── Delete edge ───────────────────────────────────────────────────────────
  const onEdgesDelete = useCallback(async (deleted: Edge[]) => {
    for (const e of deleted) await fetch(`/api/delivery/edges/${e.id}`, { method: 'DELETE' })
    setEdges((eds) => {
      const remaining = eds.filter((e) => !deleted.find((d) => d.id === e.id))
      setNodes((nds) => recalcDependencies(nds, remaining))
      return remaining
    })
  }, [setEdges, setNodes])

  // ── Drag stop → save position ─────────────────────────────────────────────
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: FlowNode) => {
    const existing = posTimers.current.get(node.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      posTimers.current.delete(node.id)
      fetch(`/api/delivery/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: node.position.x, position_y: node.position.y }),
      })
    }, 500)
    posTimers.current.set(node.id, timer)
  }, [])

  // ── Core add-node logic (shared by toolbar + right-click) ─────────────────
  const createNode = useCallback(async (
    name: string,
    nodeType: NodeType,
    assigneeId: string | null,
    pos: { x: number; y: number },
  ) => {
    const res = await fetch('/api/delivery/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        name: name.trim(),
        node_type: nodeType,
        assignee_id: assigneeId,
        status: 'ready',
        position_x: pos.x,
        position_y: pos.y,
      }),
    })
    const json = await res.json()
    if (!json.node) return
    const dbNode = json.node as DeliveryNode
    setDbNodes((prev) => new Map(prev).set(dbNode.id, dbNode))
    const flowNode = toFlowNode(dbNode, members, taskMap)
    setNodes((nds) => [...nds, flowNode])
    // Pan to new node after React re-renders
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60)
  }, [projectId, members, taskMap, setNodes, fitView])

  // ── Add from toolbar (places in visible center) ───────────────────────────
  const handleAddNode = useCallback(async (name: string, nodeType: NodeType, assigneeId: string | null) => {
    // Get the current visible center in flow coordinates
    const rect = containerRef.current?.getBoundingClientRect()
    const centerScreen = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const flowPos = screenToFlowPosition(centerScreen)
    // Offset slightly so multiple nodes don't stack
    const offset = nodes.length * 20
    await createNode(name, nodeType, assigneeId, { x: flowPos.x - NODE_WIDTH / 2 + offset, y: flowPos.y - NODE_HEIGHT / 2 + offset })
  }, [nodes.length, screenToFlowPosition, createNode])

  // ── Add from right-click menu ─────────────────────────────────────────────
  const handleAddAtCtx = useCallback(async () => {
    const name = ctxName.trim()
    if (!name || !ctxMenu) return
    const pos = { x: ctxMenu.flowX - NODE_WIDTH / 2, y: ctxMenu.flowY - NODE_HEIGHT / 2 }
    setCtxMenu(null)
    setCtxName('')
    await createNode(name, 'custom', null, pos)
  }, [ctxName, ctxMenu, createNode])

  // ── Right-click on pane ───────────────────────────────────────────────────
  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const containerX = event.clientX - (rect?.left ?? 0)
    const containerY = event.clientY - (rect?.top ?? 0)
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    setCtxMenu({ containerX, containerY, flowX: flowPos.x, flowY: flowPos.y })
    setCtxName('')
    setSelectedId(null)
  }, [screenToFlowPosition])

  // ── Update node ───────────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (id: string, patch: Partial<DeliveryNode>) => {
    setDbNodes((prev) => {
      const next = new Map(prev)
      const existing = next.get(id)
      if (existing) next.set(id, { ...existing, ...patch })
      return next
    })
    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id !== id) return n
        const d = n.data as DeliveryNodeData
        const member = 'assignee_id' in patch
          ? (members.find((m) => m.clerk_user_id === patch.assignee_id) ?? null)
          : null
        return {
          ...n,
          data: {
            ...d,
            ...(patch.name        && { name: patch.name }),
            ...(patch.node_type   && { nodeType: patch.node_type as NodeType }),
            ...(patch.status      && { status: patch.status as NodeStatus }),
            ...('assignee_id' in patch && {
              assigneeName: member?.full_name ?? member?.email ?? null,
              assigneeAvatar: member?.avatar_url ?? null,
            }),
            ...('manual_unlock' in patch && { manual_unlock: patch.manual_unlock }),
          } satisfies DeliveryNodeData,
        }
      })
      return 'status' in patch || 'manual_unlock' in patch
        ? recalcDependencies(updated, edges)
        : updated
    })
    if (Object.keys(patch).length === 0) return
    await fetch(`/api/delivery/nodes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [setNodes, members, edges])

  // ── Delete node ───────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    setSelectedId(null)
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setDbNodes((prev) => { const next = new Map(prev); next.delete(id); return next })
    await fetch(`/api/delivery/nodes/${id}`, { method: 'DELETE' })
  }, [setNodes, setEdges])

  // ── Auto layout ───────────────────────────────────────────────────────────
  const handleAutoLayout = useCallback(() => {
    const layouted = applyDagreLayout(nodes, edges)
    setNodes(layouted)
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50)
    for (const n of layouted) {
      fetch(`/api/delivery/nodes/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: n.position.x, position_y: n.position.y }),
      })
    }
  }, [nodes, edges, setNodes, fitView])

  // ── Task change ───────────────────────────────────────────────────────────
  const handleTasksChange = useCallback((nodeId: string, tasks: DeliveryTask[]) => {
    setTaskMap((prev) => new Map(prev).set(nodeId, tasks))
    refreshNodeTaskCounts(nodeId, tasks)
  }, [refreshNodeTaskCounts])

  const selectedNode = selectedId ? dbNodes.get(selectedId) : null

  // Clamp context menu so it doesn't overflow the right/bottom edge
  const ctxStyle = ctxMenu ? (() => {
    const menuW = 220, menuH = 80
    const containerW = containerRef.current?.clientWidth ?? window.innerWidth
    const containerH = containerRef.current?.clientHeight ?? window.innerHeight
    return {
      left: Math.min(ctxMenu.containerX, containerW - menuW - 8),
      top: Math.min(ctxMenu.containerY, containerH - menuH - 8),
    }
  })() : null

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => { setCtxMenu(null); setSelectedId((prev) => prev === node.id ? null : node.id) }}
        onPaneClick={() => { setSelectedId(null); setCtxMenu(null) }}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        className="bg-[#0d0d0d]"
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
          style: { stroke: '#52525b', strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} color="#222" gap={20} size={1} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !shadow-xl" />
        <MiniMap className="!bg-zinc-900 !border-zinc-800" nodeColor="#222" maskColor="rgba(0,0,0,0.6)" />

        <CanvasToolbar
          members={members}
          onAddNode={handleAddNode}
          onAutoLayout={handleAutoLayout}
          nodeCount={nodes.length}
        />
      </ReactFlow>

      {/* Right-click context menu */}
      {ctxMenu && ctxStyle && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setCtxMenu(null)} />
          <div
            className="absolute z-50 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl p-3 w-[210px]"
            style={ctxStyle}
          >
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 px-0.5">Add node here</p>
            <div className="flex items-center gap-1.5">
              <input
                ref={ctxInputRef}
                value={ctxName}
                onChange={(e) => setCtxName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAtCtx()
                  if (e.key === 'Escape') setCtxMenu(null)
                }}
                placeholder="Node name…"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              />
              <button
                onClick={handleAddAtCtx}
                disabled={!ctxName.trim()}
                className="p-1.5 rounded-lg bg-[#C8F55A] text-black disabled:opacity-30 hover:bg-[#d4f96e] transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Node detail panel */}
      {selectedNode && selectedId && (
        <NodeDetailPanel
          node={selectedNode}
          projectId={projectId}
          members={members}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onTasksChange={(tasks) => handleTasksChange(selectedId, tasks)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryCanvasProps {
  projectId: string
}

export function DeliveryCanvas({ projectId }: DeliveryCanvasProps) {
  const [dbNodes, setDbNodes] = useState<DeliveryNode[] | null>(null)
  const [dbEdges, setDbEdges] = useState<DeliveryEdge[] | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const get = async (url: string) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${url} → ${r.status}`)
      return r.json()
    }
    Promise.all([
      get(`/api/delivery/nodes?projectId=${projectId}`),
      get(`/api/delivery/edges?projectId=${projectId}`),
      get(`/api/delivery/members?projectId=${projectId}`),
    ])
      .then(([n, e, m]) => {
        setDbNodes(n.nodes ?? [])
        setDbEdges(e.edges ?? [])
        setMembers(m.members ?? [])
      })
      .catch(() => setError('Database tables missing — run supabase/migrations/012_delivery_flow.sql in your Supabase SQL Editor.'))
  }, [projectId])

  if (error) {
    return <div className="h-full flex items-center justify-center text-sm text-zinc-500">{error}</div>
  }

  if (dbNodes === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <DeliveryCanvasInner
        projectId={projectId}
        initialNodes={dbNodes}
        initialEdges={dbEdges ?? []}
        members={members}
      />
    </ReactFlowProvider>
  )
}
