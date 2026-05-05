import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { TasksHub } from '@/components/tasks/tasks-hub'

export default async function TasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params
  const admin = createSupabaseAdminClient() as any

  const [{ data: tasks }, { data: project }] = await Promise.all([
    admin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('section')
      .order('position')
      .order('created_at'),
    admin
      .from('client_projects')
      .select('name')
      .eq('id', projectId)
      .single(),
  ])

  return (
    <TasksHub
      projectId={projectId}
      initialTasks={tasks || []}
      projectName={project?.name || 'Project'}
    />
  )
}
