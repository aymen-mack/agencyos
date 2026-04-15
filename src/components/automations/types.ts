import type { Node, Edge } from '@xyflow/react'

export type NodeType = 'trigger' | 'action' | 'condition' | 'delay'

export interface AutomationNodeData {
  label: string
  description?: string
  icon?: string
  config?: Record<string, string | number | boolean>
  [key: string]: unknown
}

export type AutomationNode = Node<AutomationNodeData, NodeType>
export type AutomationEdge = Edge

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  nodes: AutomationNode[]
  edges: AutomationEdge[]
}

export interface Automation {
  id: string
  project_id: string
  name: string
  description: string | null
  status: 'active' | 'inactive' | 'draft'
  trigger_type: string | null
  template_id: string | null
  nodes_json: AutomationNode[]
  edges_json: AutomationEdge[]
  run_count: number
  created_at: string
  updated_at: string
}
