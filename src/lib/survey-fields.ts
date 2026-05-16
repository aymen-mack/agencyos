// Survey field extraction and lead quality scoring.
// Typeform webhook stores raw answers in survey_data keyed by normalized question titles.
// These utilities find the right field by keyword-matching the key names, then parse
// the answer strings to derive numeric thresholds used for quality scoring.

export interface SurveyFields {
  age: string | null
  occupation: string | null
  monthly_income: string | null
  monthly_income_usd: number      // minimum USD value of the income answer (0 = under $3k)
  sophistication: string | null
  sophistication_months: number   // minimum months derived from the answer
  challenges: string | null
  previous_investment: string | null
  previous_investment_usd: number // minimum USD value (0 = never / under $1k)
  speed_to_action: string | null
  is_immediate: boolean
}

export type LeadQuality = 'most_likely' | 'likely' | 'probable' | 'least_likely'

export const QUALITY_LABELS: Record<LeadQuality, string> = {
  most_likely:  'Most likely to convert',
  likely:       'Likely to convert',
  probable:     'Probable to convert',
  least_likely: 'Least Likely to convert',
}

export const QUALITY_COLORS: Record<LeadQuality, string> = {
  most_likely:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  likely:       'text-amber-400  bg-amber-400/10  border-amber-400/20',
  probable:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
  least_likely: 'text-rose-400   bg-rose-400/10   border-rose-400/20',
}

export const QUALITY_BADGE_COLORS: Record<LeadQuality, string> = {
  most_likely:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  likely:       'bg-amber-100   text-amber-800   dark:bg-amber-900/30   dark:text-amber-400',
  probable:     'bg-orange-100  text-orange-800  dark:bg-orange-900/30  dark:text-orange-400',
  least_likely: 'bg-rose-100    text-rose-800    dark:bg-rose-900/30    dark:text-rose-400',
}

export const QUALITY_CHART_COLORS: Record<LeadQuality, string> = {
  most_likely:  '#10b981',
  likely:       '#f59e0b',
  probable:     '#f97316',
  least_likely: '#f43f5e',
}

// Returns the first survey_data value whose key contains any of the keywords.
// `claimed` set prevents the same key from matching two different fields.
function findField(
  data: Record<string, unknown>,
  keywords: string[],
  claimed: Set<string>
): string | null {
  for (const [key, value] of Object.entries(data)) {
    if (claimed.has(key)) continue
    const k = key.toLowerCase()
    if (keywords.some((kw) => k.includes(kw))) {
      claimed.add(key)
      if (typeof value === 'string') return value
      if (Array.isArray(value)) return (value as string[]).join(', ')
      if (value !== null && typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
  }
  return null
}

function parseMoneyMin(text: string): number {
  if (!text) return 0
  const t = text.toLowerCase()
  // Patterns that signal "this amount or less" → minimum is 0
  if (/never|nothing|no invest|^no$|under|less than|below|< ?\$/.test(t)) return 0
  // Extract the first numeric amount
  const match = t.match(/([\d,]+)/)
  if (!match) return 0
  return parseInt(match[1].replace(/,/g, ''), 10)
}

function parseSophisticationMonths(text: string): number {
  if (!text) return 0
  const t = text.toLowerCase()
  if (/just start|less than|new to|beginner|< ?3 month|starting out|never|0 month/.test(t)) return 0
  const yearMatch = t.match(/(\d+)\+?\s*year/)
  if (yearMatch) return parseInt(yearMatch[1]) * 12
  // Range like "3-6 months" → take the lower bound
  const rangeMatch = t.match(/(\d+)\s*[-–]\s*\d+\s*month/)
  if (rangeMatch) return parseInt(rangeMatch[1])
  const singleMatch = t.match(/(\d+)\+?\s*month/)
  if (singleMatch) return parseInt(singleMatch[1])
  return 0
}

export function extractSurveyFields(data: Record<string, unknown>): SurveyFields {
  const claimed = new Set<string>()

  // Order matters — more specific keywords first to avoid cross-field collisions
  const age = findField(data, ['_age_', 'how_old', 'years_old', 'your_age', 'age'], claimed)
  const occupation = findField(data, ['occupation', 'current_job', 'profession', 'career', 'what_do_you_do', 'current_role', 'employ', 'work_as'], claimed)
  // Monthly income: "monthly" before bare "income" to prefer the income question over any sophistication question that mentions income
  const monthly_income = findField(data, ['monthly_income', 'income_from', 'monthly', 'income', 'earn', 'salary'], claimed)
  // Sophistication: time-based ("how long" / "been doing") before generic "experience"
  const sophistication = findField(data, ['how_long', 'been_doing', 'been_going', 'been_invest', 'been_trad', 'been_in_the', 'time_in', 'months_in', 'years_in', 'sophist', 'experience'], claimed)
  const challenges = findField(data, ['challenge', 'struggle', 'problem', 'difficulty', 'facing', 'pain_point', 'pain'], claimed)
  // Previous investment in self-education — specific before generic
  const previous_investment = findField(data, [
    'self_educ', 'invested_in_your', 'invested_in_self', 'invested_in_edu',
    'previous_invest', 'spent_on', 'coaching', 'course', 'program',
    'education', 'bought', 'invest',
  ], claimed)
  const speed_to_action = findField(data, [
    'take_action', 'speed_to', 'how_soon', 'when_would', 'how_quickly',
    'timeline', 'urgency', 'action', 'soon', 'ready', 'commit', 'implement',
  ], claimed)

  const monthly_income_usd = monthly_income ? parseMoneyMin(monthly_income) : 0
  const sophistication_months = sophistication ? parseSophisticationMonths(sophistication) : 0
  const previous_investment_usd = previous_investment ? parseMoneyMin(previous_investment) : 0
  const is_immediate = speed_to_action ? /immediate|right away|today|now\b|asap/i.test(speed_to_action) : false

  return {
    age,
    occupation,
    monthly_income,
    monthly_income_usd,
    sophistication,
    sophistication_months,
    challenges,
    previous_investment,
    previous_investment_usd,
    speed_to_action,
    is_immediate,
  }
}

// Scoring: 4 criteria, each worth 1 point.
// Income ≥ $3k is a hard floor — always at least 'likely' regardless of other factors.
export function getLeadQuality(surveyData: Record<string, unknown>): LeadQuality {
  const f = extractSurveyFields(surveyData)
  const score =
    (f.monthly_income_usd >= 3000 ? 1 : 0) +
    (f.previous_investment_usd >= 1000 ? 1 : 0) +
    (f.sophistication_months >= 6 ? 1 : 0) +
    (f.is_immediate ? 1 : 0)
  if (score >= 4) return 'most_likely'
  if (score >= 3) return 'likely'
  // Income ≥ $3k: floor at 'likely' — beats 'probable' and 'least_likely'
  if (f.monthly_income_usd >= 3000) return 'likely'
  if (score >= 2) return 'probable'
  return 'least_likely'
}

// Map sophistication answer → numeric level (1-5) for avatar display
export function sophisticationToLevel(answer: string | null): number {
  const months = answer ? parseSophisticationMonths(answer) : 0
  if (months >= 24) return 5
  if (months >= 12) return 4
  if (months >= 6)  return 3
  if (months >= 3)  return 2
  return 1
}

// Modal value (most common) with percentage
export function getMode(counts: Record<string, number>): { value: string; pct: number } {
  const entries = Object.entries(counts)
  if (!entries.length) return { value: '—', pct: 0 }
  const total = entries.reduce((s, [, n]) => s + n, 0)
  const [value, count] = entries.sort((a, b) => b[1] - a[1])[0]
  return { value, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
}
