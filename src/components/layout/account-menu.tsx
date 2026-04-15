'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { UserButton, useUser } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import { Settings, Sun, Moon, Monitor, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function AccountMenu({ projectId, collapsed }: { projectId?: string; collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const router = useRouter()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {collapsed ? (
          <button
            className="p-1.5 hover:bg-accent/50 transition-colors rounded-lg focus:outline-none"
            title="Account & Settings"
          >
            <UserButton />
          </button>
        ) : (
          <button className="w-full flex items-center gap-2.5 p-3 hover:bg-accent/50 transition-colors rounded-lg group focus:outline-none">
            <UserButton />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate leading-none">
                {user?.firstName ?? 'Account'}
              </p>
              {user?.primaryEmailAddress && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
            <Settings className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={4}
          className={cn(
            'z-50 w-52 rounded-xl border border-border bg-popover shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=top]:slide-in-from-bottom-2',
            'p-1'
          )}
        >
          {/* Theme section */}
          <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Theme
          </DropdownMenu.Label>

          {themes.map(({ value, label, icon: Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => setTheme(value)}
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                theme === value && 'text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          {/* Settings */}
          <DropdownMenu.Item
            onSelect={() => {
              if (projectId) router.push(`/dashboard/${projectId}/settings`)
            }}
            disabled={!projectId}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none',
              'hover:bg-accent hover:text-accent-foreground transition-colors',
              !projectId && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Settings className="w-3.5 h-3.5 flex-shrink-0" />
            Project Settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
