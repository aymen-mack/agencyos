'use client'

import { ClientProject } from '@/types/database'

interface TopbarProps {
  project?: ClientProject
  title?: string
  children?: React.ReactNode
}

export function Topbar({ project, title, children }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-medium text-foreground truncate">
          {title || project?.name || 'Dashboard'}
        </h1>
        {project?.client_name && (
          <p className="text-xs text-muted-foreground">{project.client_name}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  )
}
