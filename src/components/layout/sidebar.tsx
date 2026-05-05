'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AccountMenu } from './account-menu'
import {
  LayoutDashboard,
  Users,
  Settings,
  Plug,
  Plus,
  Zap,
  ArrowLeft,
  Rocket,
  CheckSquare,
  Workflow,
  ChevronDown,
  FolderOpen,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientProject } from '@/types/database'
import { useState, useEffect } from 'react'

interface SidebarProps {
  projects: ClientProject[]
  currentProjectId?: string
}

interface Asset {
  id: string
  name: string
}

export function Sidebar({ projects, currentProjectId: propProjectId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const urlProjectId = pathname.match(/\/dashboard\/([^/]+)/)?.[1]
  const currentProjectId = urlProjectId || propProjectId
  const currentProject = projects.find((p) => p.id === currentProjectId)
  const inProject = !!currentProjectId && !!currentProject

  // Sales Engine submenu state
  const isSalesEnginePath = pathname.includes('/sales-engine') || pathname.includes('/canvas')
  const [salesEngineOpen, setSalesEngineOpen] = useState(isSalesEnginePath)
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)

  // Fetch assets when submenu opens
  useEffect(() => {
    if (!salesEngineOpen || !currentProjectId) return
    setAssetsLoading(true)
    fetch(`/api/sales-assets?projectId=${currentProjectId}`)
      .then((r) => r.json())
      .then((j) => { setAssets(j.assets || []); setAssetsLoading(false) })
      .catch(() => setAssetsLoading(false))
  }, [salesEngineOpen, currentProjectId])

  // Auto-open when navigating into sales engine routes
  useEffect(() => {
    if (isSalesEnginePath) setSalesEngineOpen(true)
  }, [isSalesEnginePath])

  // Close submenu when sidebar collapses
  useEffect(() => {
    if (collapsed) setSalesEngineOpen(false)
  }, [collapsed])

  const simpleNavItems = currentProjectId ? [
    { label: 'Dashboard',    href: `/dashboard/${currentProjectId}`,             icon: LayoutDashboard, disabled: false },
    { label: 'Leads',        href: `/dashboard/${currentProjectId}/leads`,        icon: Users,           disabled: false },
    { label: 'Automations',  href: `/dashboard/${currentProjectId}/automations`,  icon: GitBranch,       disabled: false },
    { label: 'Tasks',        href: `/dashboard/${currentProjectId}/tasks`,        icon: CheckSquare,     disabled: false },
    { label: 'Integrations', href: `/dashboard/${currentProjectId}/integrations`, icon: Plug,            disabled: false },
    { label: 'Settings',     href: `/dashboard/${currentProjectId}/settings`,     icon: Settings,        disabled: false },
  ] : []

  // Collapsed icon nav items (project view)
  const collapsedNavItems = [
    ...simpleNavItems.slice(0, 2),
    { label: 'Sales Engine', href: isSalesEnginePath ? pathname : `/dashboard/${currentProjectId}/sales-engine`, icon: Rocket, disabled: false },
    ...simpleNavItems.slice(2),
  ]
  // (simpleNavItems already includes Automations at index 2)

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border h-screen sticky top-0 flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo / header */}
      <div className={cn(
        'flex items-center h-14 border-b border-border flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'
      )}>
        {collapsed ? (
          /* Collapsed: just the logo, clicking it expands */
          <button
            onClick={() => setCollapsed(false)}
            className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
            title="Expand sidebar"
          >
            <Zap className="w-4 h-4 text-primary-foreground" />
          </button>
        ) : (
          <>
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground flex-1 truncate">Agency Dashboard</span>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Collapsed expand button — shown below logo when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-1' : 'px-2')}>

        {/* ── COLLAPSED VIEW ── */}
        {collapsed && (
          <div className="flex flex-col items-center gap-0.5">
            {inProject ? (
              <>
                {/* Back to projects */}
                <Link
                  href="/dashboard"
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  title="All Projects"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>

                {/* Project status dot */}
                <div className="py-1.5 flex justify-center" title={currentProject.name}>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    currentProject.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'
                  )} />
                </div>

                <div className="w-8 border-t border-border my-0.5" />

                {/* Nav icons */}
                {collapsedNavItems.map((item) => {
                  const Icon = item.icon
                  const isSalesEngine = item.label === 'Sales Engine'
                  const isActive = isSalesEngine
                    ? isSalesEnginePath
                    : item.href === `/dashboard/${currentProjectId}`
                      ? pathname === item.href
                      : pathname.startsWith(item.href)

                  if (item.disabled) {
                    return (
                      <div
                        key={item.label}
                        title={`${item.label} (Coming soon)`}
                        className="p-2 rounded-md text-muted-foreground/30 cursor-not-allowed"
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Link>
                  )
                })}
              </>
            ) : (
              <>
                {/* Project dots */}
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/${project.id}`}
                    title={project.name}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center justify-center"
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      project.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'
                    )} />
                  </Link>
                ))}
                <Link
                  href="/admin/projects/new"
                  title="New project"
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        )}

        {/* ── EXPANDED VIEW ── */}
        {!collapsed && (
          <>
            {inProject ? (
              <>
                {/* Back */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Projects
                </Link>

                {/* Project name */}
                <div className="px-2.5 pb-2 mb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      currentProject.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'
                    )} />
                    <span className="text-sm font-semibold truncate">{currentProject.name}</span>
                  </div>
                </div>

                <div className="mt-2 space-y-0.5">
                  {/* Dashboard + Leads */}
                  {simpleNavItems.slice(0, 2).map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === `/dashboard/${currentProjectId}`
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    )
                  })}

                  {/* Sales Engine — collapsible */}
                  <div>
                    <button
                      onClick={() => setSalesEngineOpen((v) => !v)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                        isSalesEnginePath
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <Rocket className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">Sales Engine</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', salesEngineOpen && 'rotate-180')} />
                    </button>

                    {salesEngineOpen && (
                      <div className="ml-3 mt-0.5 pl-3 border-l border-border space-y-0.5">
                        <Link
                          href={`/dashboard/${currentProjectId}/canvas`}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                            pathname.includes('/canvas')
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <Workflow className="w-3.5 h-3.5 flex-shrink-0" />
                          Analysis
                        </Link>

                        <Link
                          href={`/dashboard/${currentProjectId}/sales-engine`}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                            pathname === `/dashboard/${currentProjectId}/sales-engine`
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                          Sales Assets
                        </Link>

                        {assetsLoading ? (
                          <div className="px-2 py-1.5 flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Loading…</span>
                          </div>
                        ) : (
                          assets.map((asset) => {
                            const href = `/dashboard/${currentProjectId}/sales-engine/${asset.id}`
                            return (
                              <Link
                                key={asset.id}
                                href={href}
                                className={cn(
                                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                                  pathname.startsWith(href)
                                    ? 'bg-primary/15 text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                )}
                              >
                                <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">›</span>
                                <span className="truncate">{asset.name}</span>
                              </Link>
                            )
                          })
                        )}

                        <button
                          onClick={() => router.push(`/dashboard/${currentProjectId}/sales-engine`)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors w-full text-left"
                        >
                          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                          New asset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tasks, Integrations, Settings */}
                  {simpleNavItems.slice(2).map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <div key={item.label}>
                        {item.disabled ? (
                          <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground/40 cursor-not-allowed select-none">
                            <Icon className="w-4 h-4" />
                            {item.label}
                            <span className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">Soon</span>
                          </div>
                        ) : (
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="px-2.5 py-1 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Projects
                </div>
                <div className="space-y-0.5">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/${project.id}`}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        project.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'
                      )} />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  ))}
                  <Link
                    href="/admin/projects/new"
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New project
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </nav>

      <div className={cn('border-t border-border flex-shrink-0', collapsed ? 'py-2 flex justify-center' : 'px-2 py-2')}>
        {collapsed ? (
          <AccountMenu projectId={currentProjectId} collapsed />
        ) : (
          <AccountMenu projectId={currentProjectId} />
        )}
      </div>
    </aside>
  )
}
