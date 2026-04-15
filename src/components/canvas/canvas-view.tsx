'use client'

import { useCallback, useRef, useState } from 'react'
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
  type NodeMouseHandler,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TextNoteNode } from './nodes/text-note-node'
import { URLResourceNode } from './nodes/url-resource-node'
import { FileUploadNode } from './nodes/file-upload-node'
import { AIAnalysisNode } from './nodes/ai-analysis-node'
import { CanvasToolbar } from './canvas-toolbar'
import { ContextMenu } from './context-menu'
import { NodeContextMenu } from './node-context-menu'

const NODE_TYPES = {
  text_note: TextNoteNode,
  url_resource: URLResourceNode,
  file_upload: FileUploadNode,
  ai_analysis: AIAnalysisNode,
}

interface CanvasViewProps {
  projectId: string
  initialNodes: FlowNode[]
  initialEdges: Edge[]
}

export function CanvasView({ projectId, initialNodes, initialEdges }: CanvasViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; node: FlowNode } | null>(null)
  const positionTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Debounced save for node content/config
  const updateNode = useCallback((nodeId: string, patch: { content?: string | null; node_config?: Record<string, unknown> }) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n
        const newData = { ...n.data }
        if ('content' in patch) newData.content = patch.content ?? undefined
        if ('node_config' in patch && patch.node_config) {
          Object.assign(newData, patch.node_config)
          // Merge specific fields from node_config into data
          if ('instruction' in patch.node_config) newData.instruction = patch.node_config.instruction as string
          if ('label' in patch.node_config) newData.label = patch.node_config.label as string
          if ('lastRun' in patch.node_config) newData.lastRun = patch.node_config.lastRun as string
          if ('url' in patch.node_config) newData.url = patch.node_config.url as string
          if ('title' in patch.node_config) newData.title = patch.node_config.title as string
          if ('description' in patch.node_config) newData.description = patch.node_config.description as string
          if ('fetchStatus' in patch.node_config) newData.fetchStatus = patch.node_config.fetchStatus as string
          if ('fileName' in patch.node_config) newData.fileName = patch.node_config.fileName as string
        }
        return { ...n, data: newData }
      })
    )
    // Debounced API save
    fetch(`/api/canvas/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(console.error)
  }, [setNodes])

  // Inject onUpdate into node data
  const nodesWithCallbacks = nodes.map((n) => ({
    ...n,
    data: { ...n.data, onUpdate: updateNode },
  }))

  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return
    const newEdge: Edge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      animated: true,
      style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
    }
    setEdges((eds) => addEdge({ ...connection, ...newEdge }, eds))
    await fetch('/api/canvas/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, sourceNodeId: connection.source, targetNodeId: connection.target }),
    }).catch(console.error)
  }, [projectId, setEdges])

  const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
    for (const edge of deletedEdges) {
      await fetch('/api/canvas/edges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edgeId: edge.id }),
      }).catch(console.error)
    }
  }, [])

  const onNodesDelete = useCallback(async (deletedNodes: FlowNode[]) => {
    for (const node of deletedNodes) {
      await fetch(`/api/canvas/nodes/${node.id}`, { method: 'DELETE' }).catch(console.error)
    }
  }, [])

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: FlowNode) => {
    const existing = positionTimer.current.get(node.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      positionTimer.current.delete(node.id)
      fetch(`/api/canvas/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: node.position.x, position_y: node.position.y }),
      }).catch(console.error)
    }, 400)
    positionTimer.current.set(node.id, timer)
  }, [])

  const addNode = useCallback(async (type: string, flowX?: number, flowY?: number) => {
    const x = flowX ?? 200 + Math.random() * 200
    const y = flowY ?? 200 + Math.random() * 200
    const res = await fetch('/api/canvas/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type, position_x: x, position_y: y }),
    })
    const { node: saved } = await res.json()
    const newNode: FlowNode = {
      id: saved.id,
      type,
      position: { x: saved.position_x, y: saved.position_y },
      data: { onUpdate: updateNode },
    }
    setNodes((nds) => [...nds, newNode])
    setContextMenu(null)
  }, [projectId, updateNode, setNodes])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    fetch(`/api/canvas/nodes/${nodeId}`, { method: 'DELETE' }).catch(console.error)
  }, [setNodes, setEdges])

  const connectNodes = useCallback(async (sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    if (edges.some((e) => e.id === edgeId)) return // already connected
    const newEdge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      animated: true,
      style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
    }
    setEdges((eds) => [...eds, newEdge])
    await fetch('/api/canvas/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, sourceNodeId: sourceId, targetNodeId: targetId }),
    }).catch(console.error)
  }, [projectId, edges, setEdges])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: FlowNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu(null)
    setNodeMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault()
    setNodeMenu(null)
    const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      flowX: rect ? e.clientX - rect.left : e.clientX,
      flowY: rect ? e.clientY - rect.top : e.clientY,
    })
  }, [])

  return (
    <div className="w-full h-full relative" onClick={() => { setContextMenu(null); setNodeMenu(null) }}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        className="bg-background"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!bg-card !border-border [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-secondary" />
        <MiniMap
          className="!bg-card !border !border-border"
          nodeColor={(n) => {
            if (n.type === 'text_note') return '#b45309'
            if (n.type === 'url_resource') return '#1d4ed8'
            if (n.type === 'file_upload') return '#047857'
            if (n.type === 'ai_analysis') return '#7c3aed'
            return '#52525b'
          }}
          maskColor="rgba(0,0,0,0.4)"
        />
        <Panel position="top-left">
          <CanvasToolbar onAddNode={addNode} />
        </Panel>
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAdd={(type) => addNode(type, contextMenu.flowX, contextMenu.flowY)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {nodeMenu && (
        <NodeContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          node={nodeMenu.node}
          otherNodes={nodes.filter((n) => n.id !== nodeMenu.node.id)}
          onDelete={() => deleteNode(nodeMenu.node.id)}
          onConnect={connectNodes}
          onClose={() => setNodeMenu(null)}
        />
      )}
    </div>
  )
}
