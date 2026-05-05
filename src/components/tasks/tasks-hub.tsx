'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  CheckCircle2, Circle, Clock, XCircle, Plus, ChevronDown,
  ChevronRight, Trash2, Loader2, ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

type Task = {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string
  section: string
  status: TaskStatus
  position: number
  created_at: string
  updated_at: string
}

const SECTIONS = ['Ideation', 'Funnel', 'Tech', 'Emails', 'Ads', 'Presentation']

const WEBBY_CHECKLIST: { section: string; title: string }[] = [
  { section: 'Ideation', title: 'Audience analysis' },
  { section: 'Ideation', title: 'Funnel copy' },
  { section: 'Funnel', title: 'Waitlist page' },
  { section: 'Funnel', title: 'Optin page' },
  { section: 'Funnel', title: 'VIP upsell page' },
  { section: 'Funnel', title: 'Survey page' },
  { section: 'Funnel', title: 'Confirmation page' },
  { section: 'Funnel', title: 'WhatsApp follow-up' },
  { section: 'Funnel', title: 'Sales page' },
  { section: 'Tech', title: 'Waitlist setup (Webflow + Kit + CRM)' },
  { section: 'Tech', title: 'Opt-in flow setup' },
  { section: 'Tech', title: 'Show rate tracker' },
  { section: 'Tech', title: 'Booking system' },
  { section: 'Tech', title: 'Sales tech setup' },
  { section: 'Emails', title: 'Pre-selling sequence' },
  { section: 'Emails', title: 'Warm-up sequence' },
  { section: 'Emails', title: 'Reminder emails' },
  { section: 'Emails', title: 'Post-launch emails' },
  { section: 'Ads', title: 'Script ads' },
  { section: 'Ads', title: 'Edit ads' },
  { section: 'Presentation', title: 'Script presentation' },
  { section: 'Presentation', title: 'Create slides' },
  { section: 'Presentation', title: 'Prepare images' },
]

const STATUS_CONFIG: Record<TaskStatus, {
  label: string
  icon: React.FC<{ className?: string }>
  pill: string
  circle: string
}> = {
  todo:        { label: 'To Do',       icon: Circle,       pill: 'bg-zinc-800 text-zinc-400',            circle: 'text-zinc-500 hover:text-zinc-300' },
  in_progress: { label: 'In Progress', icon: Clock,        pill: 'bg-blue-500/15 text-blue-400',         circle: 'text-blue-400 hover:text-blue-300' },
  done:        { label: 'Done',        icon: CheckCircle2, pill: 'bg-emerald-500/15 text-emerald-400',   circle: 'text-emerald-400 hover:text-emerald-300' },
  blocked:     { label: 'Blocked',     icon: XCircle,      pill: 'bg-red-500/15 text-red-400',           circle: 'text-red-400 hover:text-red-300' },
}

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked']

const SECTION_COLORS: Record<string, string> = {
  Ideation:     'border-l-violet-500',
  Funnel:       'border-l-blue-500',
  Tech:         'border-l-emerald-500',
  Emails:       'border-l-amber-500',
  Ads:          'border-l-red-500',
  Presentation: 'border-l-cyan-500',
}

interface TasksHubProps {
  projectId: string
  initialTasks: Task[]
  projectName: string
}

export function TasksHub({ projectId, initialTasks, projectName }: TasksHubProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [addingIn, setAddingIn] = useState<{ section: string; parentId?: string } | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => { editRef.current?.focus() }, [editingId])
  useEffect(() => { addRef.current?.focus() }, [addingIn])

  const mutate = useCallback(async (url: string, method: string, body?: object): Promise<Task | null> => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    return json.task ?? null
  }, [])

  const addTask = useCallback(async (section: string, parentId?: string) => {
    const title = newTaskTitle.trim()
    setAddingIn(null)
    setNewTaskTitle('')
    if (!title) return
    const position = tasks.filter((t) => t.section === section && !t.parent_id).length
    const task = await mutate('/api/tasks', 'POST', {
      project_id: projectId,
      title,
      section,
      parent_id: parentId || null,
      position,
    })
    if (task) setTasks((prev) => [...prev, task])
  }, [newTaskTitle, tasks, projectId, mutate])

  const updateTitle = useCallback(async (id: string) => {
    const title = editingTitle.trim()
    setEditingId(null)
    if (!title) return
    const task = await mutate(`/api/tasks/${id}`, 'PATCH', { title })
    if (task) setTasks((prev) => prev.map((t) => t.id === id ? task : t))
  }, [editingTitle, mutate])

  const cycleStatus = useCallback(async (id: string, current: TaskStatus) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next } : t))
    await mutate(`/api/tasks/${id}`, 'PATCH', { status: next })
  }, [mutate])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parent_id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }, [])

  const loadWebbyChecklist = useCallback(async () => {
    setLoadingChecklist(true)
    const created: Task[] = []
    for (const item of WEBBY_CHECKLIST) {
      const task = await mutate('/api/tasks', 'POST', {
        project_id: projectId,
        title: item.title,
        section: item.section,
        position: created.filter((t) => t.section === item.section).length,
      })
      if (task) created.push(task)
    }
    setTasks(created)
    setLoadingChecklist(false)
  }, [projectId, mutate])

  const topLevelTasks = tasks.filter((t) => !t.parent_id)
  const subtasksOf = (parentId: string) => tasks.filter((t) => t.parent_id === parentId)

  const sectionProgress = (section: string) => {
    const st = topLevelTasks.filter((t) => t.section === section)
    return { done: st.filter((t) => t.status === 'done').length, total: st.length }
  }

  const overall = {
    done: topLevelTasks.filter((t) => t.status === 'done').length,
    total: topLevelTasks.length,
  }

  const renderTask = (task: Task, isSubtask = false) => {
    const { icon: StatusIcon, pill, circle } = STATUS_CONFIG[task.status]
    const subs = subtasksOf(task.id)
    const hasSubtasks = subs.length > 0
    const isCollapsed = collapsedTasks.has(task.id)
    const isEditing = editingId === task.id

    return (
      <div key={task.id}>
        <div className={cn('group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors', isSubtask && 'ml-6')}>
          <button
            onClick={() => cycleStatus(task.id, task.status)}
            className={cn('flex-shrink-0 transition-colors', circle)}
            title={`${STATUS_CONFIG[task.status].label} — click to advance`}
          >
            <StatusIcon className="w-4 h-4" />
          </button>

          {isEditing ? (
            <input
              ref={editRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => updateTitle(task.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateTitle(task.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              className="flex-1 bg-transparent text-sm outline-none border-b border-border"
            />
          ) : (
            <span
              className={cn(
                'flex-1 text-sm cursor-pointer select-none',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}
              onClick={() => { setEditingId(task.id); setEditingTitle(task.title) }}
            >
              {task.title}
            </span>
          )}

          {hasSubtasks && !isSubtask && (
            <button
              onClick={() => setCollapsedTasks((prev) => {
                const next = new Set(prev)
                next.has(task.id) ? next.delete(task.id) : next.add(task.id)
                return next
              })}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{subs.filter((s) => s.status === 'done').length}/{subs.length}</span>
            </button>
          )}

          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-flex', pill)}>
            {STATUS_CONFIG[task.status].label}
          </span>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isSubtask && (
              <button
                onClick={() => { setAddingIn({ section: task.section, parentId: task.id }); setNewTaskTitle('') }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Add subtask"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isCollapsed && subs.map((sub) => renderTask(sub, true))}

        {addingIn?.parentId === task.id && (
          <div className="ml-10 pr-3 py-1.5 flex items-center gap-2">
            <Circle className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
            <input
              ref={addRef}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask(task.section, task.id)
                if (e.key === 'Escape') setAddingIn(null)
              }}
              onBlur={() => addTask(task.section, task.id)}
              placeholder="New subtask…"
              className="flex-1 bg-transparent text-sm outline-none border-b border-border pb-1 placeholder:text-muted-foreground/40"
            />
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: string) => {
    const sectionTasks = topLevelTasks.filter((t) => t.section === section)
    const { done, total } = sectionProgress(section)
    const isCollapsed = collapsedSections.has(section)
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const borderColor = SECTION_COLORS[section] || 'border-l-zinc-500'

    return (
      <div key={section} className={cn('border border-border rounded-xl overflow-hidden border-l-4', borderColor)}>
        <div
          className="flex items-center gap-3 px-4 py-3 bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setCollapsedSections((prev) => {
            const next = new Set(prev)
            next.has(section) ? next.delete(section) : next.add(section)
            return next
          })}
        >
          {isCollapsed
            ? <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <span className="font-semibold text-sm">{section}</span>
          <span className="text-xs text-muted-foreground">{done}/{total}</span>

          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden max-w-32">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setAddingIn({ section })
              setNewTaskTitle('')
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Add task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-2 space-y-0.5">
            {sectionTasks.map((task) => renderTask(task))}

            {addingIn?.section === section && !addingIn.parentId && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                <input
                  ref={addRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTask(section)
                    if (e.key === 'Escape') setAddingIn(null)
                  }}
                  onBlur={() => addTask(section)}
                  placeholder="New task… (Enter to save)"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            )}

            {sectionTasks.length === 0 && !addingIn && (
              <p className="text-xs text-muted-foreground/40 px-3 py-2">No tasks yet</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const allSections = [...new Set([...SECTIONS, ...tasks.map((t) => t.section)])]

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projectName}</p>
        </div>

        {overall.total > 0 && (
          <div className="flex items-center gap-3 bg-accent/40 rounded-xl px-4 py-2.5">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall</p>
              <p className="text-sm font-semibold">{overall.done}/{overall.total} done</p>
            </div>
            <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((overall.done / overall.total) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-emerald-400">
              {Math.round((overall.done / overall.total) * 100)}%
            </span>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ListTodo className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-1">No tasks yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Start with the Webby launch checklist or add tasks manually to any section below.
          </p>
          <button
            onClick={loadWebbyChecklist}
            disabled={loadingChecklist}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loadingChecklist
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ListTodo className="w-4 h-4" />}
            {loadingChecklist ? 'Loading checklist…' : 'Load Webby Launch Checklist'}
          </button>
          <p className="text-xs text-muted-foreground mt-4">Or click + on any section header to add tasks manually</p>
          <div className="mt-8 w-full max-w-2xl space-y-4">
            {allSections.map(renderSection)}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {allSections.map(renderSection)}
        </div>
      )}
    </div>
  )
}
