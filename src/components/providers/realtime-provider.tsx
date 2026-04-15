'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'

interface RealtimeContextValue {
  lastLeadUpdate: number
  lastMetricUpdate: number
  connectionState: 'connecting' | 'connected' | 'disconnected'
}

const RealtimeContext = createContext<RealtimeContextValue>({
  lastLeadUpdate: 0,
  lastMetricUpdate: 0,
  connectionState: 'connecting',
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({
  projectId,
  children,
}: {
  projectId: string
  children: React.ReactNode
}) {
  const { getToken } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [lastLeadUpdate, setLastLeadUpdate] = useState(0)
  const [lastMetricUpdate, setLastMetricUpdate] = useState(0)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    let active = true

    async function subscribe() {
      const token = await getToken({ template: 'supabase' })
      if (!token || !active) return

      const supabase = createSupabaseClientWithToken(token)

      const channel = supabase
        .channel(`project:${projectId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads', filter: `project_id=eq.${projectId}` },
          () => setLastLeadUpdate(Date.now())
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'lead_events', filter: `project_id=eq.${projectId}` },
          () => setLastLeadUpdate(Date.now())
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'webinar_metrics', filter: `project_id=eq.${projectId}` },
          () => setLastMetricUpdate(Date.now())
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ad_metrics', filter: `project_id=eq.${projectId}` },
          () => setLastMetricUpdate(Date.now())
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'email_metrics', filter: `project_id=eq.${projectId}` },
          () => setLastMetricUpdate(Date.now())
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales', filter: `project_id=eq.${projectId}` },
          () => setLastMetricUpdate(Date.now())
        )
        .subscribe((status) => {
          if (!active) return
          if (status === 'SUBSCRIBED') setConnectionState('connected')
          else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionState('disconnected')
          else setConnectionState('connecting')
        })

      channelRef.current = channel
    }

    subscribe()

    return () => {
      active = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [projectId, getToken])

  return (
    <RealtimeContext.Provider value={{ lastLeadUpdate, lastMetricUpdate, connectionState }}>
      {children}
    </RealtimeContext.Provider>
  )
}
