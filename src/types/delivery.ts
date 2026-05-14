export type NodeType = 'strategy' | 'copy' | 'build' | 'automation' | 'design' | 'review' | 'custom'
export type NodeStatus = 'locked' | 'ready' | 'in_progress' | 'in_review' | 'needs_changes' | 'done'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface DeliveryNode {
  id: string
  project_id: string
  name: string
  description: string | null
  node_type: NodeType
  status: NodeStatus
  assignee_id: string | null
  position_x: number
  position_y: number
  manual_unlock: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryEdge {
  id: string
  project_id: string
  source_node_id: string
  target_node_id: string
  created_at: string
}

export interface DeliveryTask {
  id: string
  node_id: string
  name: string
  status: TaskStatus
  assignee_id: string | null
  sort_order: number
  sales_asset_id: string | null
  created_at: string
  updated_at: string
}

export interface OrgMember {
  clerk_user_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  strategy:   '#4A90D9',
  copy:       '#C8F55A',
  build:      '#F5A623',
  automation: '#9B59B6',
  design:     '#E91E8A',
  review:     '#FFFFFF',
  custom:     '#666666',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  strategy:   'Strategy',
  copy:       'Copy',
  build:      'Build',
  automation: 'Automation',
  design:     'Design',
  review:     'Review',
  custom:     'Custom',
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  locked:        'Locked',
  ready:         'Ready',
  in_progress:   'In Progress',
  in_review:     'In Review',
  needs_changes: 'Needs Changes',
  done:          'Done',
}

export const STATUS_COLORS: Record<NodeStatus, { bg: string; text: string; border: string }> = {
  locked:        { bg: 'bg-zinc-800',        text: 'text-zinc-400',    border: 'border-zinc-700'   },
  ready:         { bg: 'bg-blue-500/15',     text: 'text-blue-400',    border: 'border-blue-500/30'  },
  in_progress:   { bg: 'bg-indigo-500/15',   text: 'text-indigo-400',  border: 'border-indigo-500/30'},
  in_review:     { bg: 'bg-amber-500/15',    text: 'text-amber-400',   border: 'border-amber-500/30' },
  needs_changes: { bg: 'bg-red-500/15',      text: 'text-red-400',     border: 'border-red-500/30'   },
  done:          { bg: 'bg-emerald-500/15',  text: 'text-emerald-400', border: 'border-emerald-500/30'},
}
