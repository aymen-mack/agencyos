export const PIPELINE_STAGES = [
  { id: 'registrant',    label: 'Registrant',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { id: 'survey_filled', label: 'Survey Filled', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  { id: 'webinar_show',  label: 'Webinar Show',  color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  { id: 'call_booked',   label: 'Call Booked',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { id: 'call_showed',   label: 'Call Showed',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { id: 'closed_deal',   label: 'Closed Deal',   color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']

export function getStage(id: string) {
  return PIPELINE_STAGES.find((s) => s.id === id) ?? PIPELINE_STAGES[0]
}

export const STAGE_EVENT_MAP: Record<string, string> = {
  registrant:    'webinar_registered',
  survey_filled: 'form_submission',
  webinar_show:  'webinar_attended',
  call_booked:   'call_booked',
  call_showed:   'call_showed',
  closed_deal:   'deal_closed',
}
