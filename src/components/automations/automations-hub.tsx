'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { MyAutomationsTab } from './my-automations-tab'
import { TemplatesTab } from './templates-tab'
import { AutomationCanvas } from './automation-canvas'
import type { Automation, AutomationTemplate, AutomationNode, AutomationEdge } from './types'
import { ArrowLeft, Plus } from 'lucide-react'

type TabId = 'my' | 'templates' | 'build'

interface AutomationsHubProps {
  projectId: string
  initialAutomations: Automation[]
}

export function AutomationsHub({ projectId, initialAutomations }: AutomationsHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('my')
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)

  // Builder state
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [builderNodes, setBuilderNodes] = useState<AutomationNode[]>([])
  const [builderEdges, setBuilderEdges] = useState<AutomationEdge[]>([])
  const [builderName, setBuilderName] = useState('Untitled Automation')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'my', label: 'My Automations' },
    { id: 'templates', label: 'Templates' },
    { id: 'build', label: 'Build Custom' },
  ]

  // ── Open existing automation in builder ──
  function openInBuilder(automation: Automation) {
    setEditingAutomation(automation)
    setBuilderName(automation.name)
    setBuilderNodes((automation.nodes_json as AutomationNode[]) ?? [])
    setBuilderEdges((automation.edges_json as AutomationEdge[]) ?? [])
    setActiveTab('build')
  }

  // ── Use template in builder ──
  function useTemplate(template: AutomationTemplate) {
    setEditingAutomation(null)
    setBuilderName(template.name)
    setBuilderNodes(template.nodes)
    setBuilderEdges(template.edges)
    setActiveTab('build')
  }

  // ── New blank automation ──
  function newBlank() {
    setEditingAutomation(null)
    setBuilderName('Untitled Automation')
    setBuilderNodes([])
    setBuilderEdges([])
    setActiveTab('build')
  }

  // ── Save automation ──
  const handleSave = useCallback(
    async (nodes: AutomationNode[], edges: AutomationEdge[]) => {
      const body = {
        name: builderName,
        nodes_json: nodes,
        edges_json: edges,
        trigger_type: nodes.find((n) => n.type === 'trigger')?.data?.label ?? null,
      }

      if (editingAutomation) {
        // Update
        const res = await fetch(`/api/automations/${editingAutomation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const { automation } = await res.json()
          setAutomations((prev) =>
            prev.map((a) => (a.id === editingAutomation.id ? automation : a))
          )
          setEditingAutomation(automation)
        }
      } else {
        // Create
        const res = await fetch(`/api/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, project_id: projectId }),
        })
        if (res.ok) {
          const { automation } = await res.json()
          setAutomations((prev) => [automation, ...prev])
          setEditingAutomation(automation)
        }
      }
    },
    [builderName, editingAutomation, projectId]
  )

  // ── Toggle status ──
  async function handleToggleStatus(id: string, newStatus: 'active' | 'inactive') {
    const res = await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const { automation } = await res.json()
      setAutomations((prev) => prev.map((a) => (a.id === id ? automation : a)))
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAutomations((prev) => prev.filter((a) => a.id !== id))
      if (editingAutomation?.id === id) {
        setEditingAutomation(null)
        setActiveTab('my')
      }
    }
  }

  const isBuilder = activeTab === 'build'

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-border flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.id === 'my' && automations.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">
                {automations.length}
              </span>
            )}
          </button>
        ))}

        {activeTab === 'my' && (
          <button
            onClick={newBlank}
            className="ml-auto mb-1 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        )}

        {isBuilder && (
          <button
            onClick={() => setActiveTab('my')}
            className="ml-auto mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}
      </div>

      {/* Tab content */}
      {isBuilder ? (
        /* Builder takes full remaining height */
        <div className="flex-1 overflow-hidden">
          <AutomationCanvas
            initialNodes={builderNodes}
            initialEdges={builderEdges}
            automationName={builderName}
            projectId={projectId}
            onSave={handleSave}
            onNameChange={setBuilderName}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'my' && (
            <MyAutomationsTab
              automations={automations}
              onOpen={openInBuilder}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onNew={newBlank}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab onUseTemplate={useTemplate} />
          )}
        </div>
      )}
    </div>
  )
}
