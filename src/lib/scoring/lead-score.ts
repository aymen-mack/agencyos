import { Lead, LeadEvent, LeadScore } from '@/types/database'

export const SCORE_WEIGHTS: Record<string, number> = {
  form_submission:    20,
  webinar_registered: 15,
  webinar_attended:   35,
  email_open:          2,
  email_click:         8,
  ad_click:            5,
  call_booked:        50,
  call_showed:        70,
  deal_closed:       100,
  // Survey bonuses (applied from survey_data)
  survey_high_income:   20,
  survey_urgent:        15,
  survey_decision_maker: 25,
}

export interface ScoreBreakdown {
  events: Record<string, number>
  survey: Record<string, number>
  total: number
  tag: LeadScore
}

export function computeLeadScore(
  events: Pick<LeadEvent, 'type' | 'score_delta'>[],
  surveyData: Record<string, unknown> = {}
): ScoreBreakdown {
  const eventScores: Record<string, number> = {}
  let total = 0

  for (const event of events) {
    const weight = event.score_delta || SCORE_WEIGHTS[event.type] || 0
    eventScores[event.type] = (eventScores[event.type] || 0) + weight
    total += weight
  }

  const surveyScores: Record<string, number> = {}

  // Income level bonus
  const income = surveyData?.income_level as string
  if (income === 'high' || income === 'very_high') {
    surveyScores.survey_high_income = SCORE_WEIGHTS.survey_high_income
    total += SCORE_WEIGHTS.survey_high_income
  }

  // Commitment/urgency bonus
  const timeline = surveyData?.timeline as string
  if (timeline === 'immediately' || timeline === 'within_30_days') {
    surveyScores.survey_urgent = SCORE_WEIGHTS.survey_urgent
    total += SCORE_WEIGHTS.survey_urgent
  }

  // Decision maker bonus
  const role = surveyData?.decision_maker as boolean
  if (role === true) {
    surveyScores.survey_decision_maker = SCORE_WEIGHTS.survey_decision_maker
    total += SCORE_WEIGHTS.survey_decision_maker
  }

  const tag = getScoreTag(total)

  return { events: eventScores, survey: surveyScores, total, tag }
}

export function getScoreTag(score: number): LeadScore {
  if (score >= 100) return 'most_likely'
  if (score >= 40) return 'likely'
  return 'least_likely'
}

export function getScoreTagLabel(tag: LeadScore): string {
  switch (tag) {
    case 'most_likely': return 'Most Likely'
    case 'likely': return 'Likely'
    case 'least_likely': return 'Least Likely'
  }
}

export function getScoreTagColor(tag: LeadScore): string {
  switch (tag) {
    case 'most_likely': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'likely': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'least_likely': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  }
}

export function computeLeadFromRow(lead: Lead, events: LeadEvent[]): ScoreBreakdown {
  return computeLeadScore(
    events,
    (lead.survey_data as Record<string, unknown>) || {}
  )
}
