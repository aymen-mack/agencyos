import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { CanvasView } from '@/components/canvas/canvas-view'
import type { Node, Edge } from '@xyflow/react'

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  const { data: project } = await admin
    .from('client_projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  // Load nodes, edges, and latest outputs
  const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
    admin.from('canvas_nodes').select('*').eq('project_id', projectId).order('created_at'),
    admin.from('canvas_edges').select('*').eq('project_id', projectId),
  ])

  // Load latest AI outputs per node
  const nodeIds = (dbNodes || []).map((n) => n.id)
  const outputMap = new Map<string, string>()
  if (nodeIds.length > 0) {
    const { data: outputs } = await admin
      .from('canvas_outputs')
      .select('node_id, output_content, generated_at')
      .in('node_id', nodeIds)
      .order('generated_at', { ascending: false })

    const seen = new Set<string>()
    for (const o of outputs || []) {
      if (!seen.has(o.node_id)) { outputMap.set(o.node_id, o.output_content); seen.add(o.node_id) }
    }
  }

  // Convert DB rows to React Flow nodes
  const initialNodes: Node[] = (dbNodes || []).map((n) => {
    const config = (n.node_config || {}) as Record<string, unknown>
    const output = n.type === 'ai_analysis' ? (n.content || outputMap.get(n.id) || '') : undefined
    return {
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: {
        // TextNote
        content: n.type !== 'ai_analysis' ? (n.content || '') : undefined,
        // URLResource
        url: config.url as string | undefined,
        title: config.title as string | undefined,
        description: config.description as string | undefined,
        fetchStatus: config.fetchStatus as string | undefined,
        // FileUpload
        fileName: config.fileName as string | undefined,
        // AIAnalysis
        instruction: config.instruction as string | undefined,
        label: config.label as string | undefined,
        lastRun: config.lastRun as string | undefined,
        output,
      },
    }
  })

  // Convert DB rows to React Flow edges
  const initialEdges: Edge[] = (dbEdges || []).map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    animated: true,
    style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
  }))

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border flex-shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Canvas</span>
          <span className="text-xs text-muted-foreground">· {project.name}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Right-click canvas to add nodes · Delete key removes selected
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <CanvasView
          projectId={projectId}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
        />
      </div>
    </div>
  )
}
