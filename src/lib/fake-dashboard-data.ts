// Fake data generator for dashboard development.
// This data is inserted into Supabase via /api/seed/[projectId].
// All records have survey_data._seed = true so they can be identified and deleted later.

const FIRST_NAMES = ['James','Maria','David','Sarah','Michael','Emily','Robert','Jessica','William','Ashley','John','Amanda','Richard','Melissa','Thomas','Jennifer','Charles','Michelle','Daniel','Kimberly','Matthew','Lisa','Anthony','Angela','Mark','Stephanie','Donald','Nicole','Steven','Rebecca','Paul','Laura','Andrew','Helen','Joshua','Sharon','Kevin','Cynthia','Brian','Kathleen','George','Amy','Edward','Shirley','Ronald','Anna','Timothy','Emma','Jason']
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts']

const SOURCES = ['Facebook Ads','Facebook Ads','Facebook Ads','Facebook Ads','Google Ads','Google Ads','Organic','Organic','Email','Affiliate','Direct'] // weighted
const CAMPAIGNS = ['June Webinar Launch','July Masterclass','August Challenge Funnel']
const PAYMENT_STATUSES = ['paid','paid','paid','payment_plan_active','payment_plan_active','payment_plan_delinquent','refunded']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number): number { return Math.random() * (max - min) + min }
function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)) }

function seededRand(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

export interface FakeLead {
  email: string
  full_name: string
  phone: string
  source: string
  source_ref: string
  status: string
  campaign: string
  attended: boolean
  purchase_amount: number | null
  payment_status: string | null
  score: number
  tags: string[]
  survey_data: Record<string, unknown>
  created_at: string
}

export interface FakeWebinarMetric {
  webinar_id: string
  date: string
  registrants: number
  attendees: number
  show_rate: number
  vip_tickets: number
  surveys_filled: number
  whatsapp_joins: number
  telegram_joins: number
  replay_views: number
  applicants: number
  calls_booked: number
  calls_showed: number
  deals_closed: number
  avg_contract_val: number
  total_cash: number
  total_revenue: number
}

export interface FakeAdMetric {
  platform: string
  campaign_id: string
  ad_set_id: string
  date: string
  spend: number
  impressions: number
  cpm: number
  clicks: number
  cpc: number
  landing_page_views: number
  cpr: number
  signups: number
  leads: number
  conversions: number
  revenue: number
}

export interface FakeEmailMetric {
  provider: string
  campaign_id: string
  sequence_id: string
  date: string
  sent: number
  delivered: number
  opens: number
  clicks: number
  unsubscribes: number
  signups: number
  open_rate: number
  click_rate: number
}

export function generateFakeLeads(count = 150): FakeLead[] {
  const rng = seededRand(42)
  const usedEmails = new Set<string>()
  const leads: FakeLead[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const r = () => rng()
    const firstName = FIRST_NAMES[Math.floor(r() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(r() * LAST_NAMES.length)]
    const full_name = `${firstName} ${lastName}`

    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i < 10 ? '' : i}@gmail.com`
    while (usedEmails.has(email)) email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}${Math.floor(r()*100)}@gmail.com`
    usedEmails.add(email)

    const phone = `+1${Math.floor(r()*9+1)}${String(Math.floor(r()*10000000)).padStart(7,'0')}`
    const source = SOURCES[Math.floor(r() * SOURCES.length)]
    const campaign = CAMPAIGNS[Math.floor(r() * CAMPAIGNS.length)]

    // Days ago from 0–89
    const daysAgo = Math.floor(r() * 90)
    const created_at = new Date(now.getTime() - daysAgo * 86400000).toISOString()

    // Status distribution: 65% no_show, 35% attended, 12% purchased, 2% refunded
    const roll = r()
    let status: string
    let attended = false
    let purchase_amount: number | null = null
    let payment_status: string | null = null

    if (roll < 0.02) {
      // refunded
      status = 'refunded'
      attended = r() > 0.5
      purchase_amount = [997, 1997, 2997, 4997][Math.floor(r() * 4)]
      payment_status = 'refunded'
    } else if (roll < 0.14) {
      // purchased
      status = 'purchased'
      attended = true
      purchase_amount = [997, 1997, 2997, 4997][Math.floor(r() * 4)]
      payment_status = PAYMENT_STATUSES[Math.floor(r() * (PAYMENT_STATUSES.length - 1))] // exclude refunded
    } else if (roll < 0.35) {
      // attended (but didn't purchase)
      status = 'attended'
      attended = true
    } else {
      // no_show
      status = 'no_show'
      attended = false
    }

    const score = Math.floor(
      (attended ? 40 : 0) +
      (purchase_amount ? 50 : 0) +
      r() * 10
    )

    leads.push({
      email,
      full_name,
      phone,
      source,
      source_ref: source.toLowerCase().replace(' ', '_'),
      status,
      campaign,
      attended,
      purchase_amount,
      payment_status,
      score,
      tags: [campaign.split(' ')[0].toLowerCase()],
      survey_data: { _seed: true },
      created_at,
    })
  }

  return leads
}

export function generateFakeWebinarMetrics(daysBack = 90): FakeWebinarMetric[] {
  const rng = seededRand(99)
  const r = () => rng()
  const metrics: FakeWebinarMetric[] = []
  const now = new Date()

  for (let d = daysBack - 1; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86400000)
    const dateStr = date.toISOString().split('T')[0]

    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const baseReg = isWeekend ? Math.floor(r() * 8 + 2) : Math.floor(r() * 20 + 5)

    const registrants = baseReg
    const attendees = Math.floor(registrants * (0.25 + r() * 0.15))
    const show_rate = registrants > 0 ? (attendees / registrants) * 100 : 0
    const vip_tickets = Math.floor(attendees * r() * 0.3)
    const surveys_filled = Math.floor(attendees * (0.3 + r() * 0.2))
    const whatsapp_joins = Math.floor(attendees * (0.1 + r() * 0.1))
    const telegram_joins = Math.floor(attendees * (0.05 + r() * 0.1))
    const replay_views = Math.floor(registrants * (0.2 + r() * 0.2))
    const applicants = Math.floor(attendees * (0.1 + r() * 0.1))
    const calls_booked = Math.floor(applicants * (0.5 + r() * 0.3))
    const calls_showed = Math.floor(calls_booked * (0.6 + r() * 0.2))
    const deals_closed = Math.floor(calls_showed * (0.2 + r() * 0.15))
    const avg_contract_val = deals_closed > 0 ? [997, 1997, 2997, 4997][Math.floor(r() * 4)] : 0
    const total_cash = deals_closed * avg_contract_val * (0.3 + r() * 0.4)
    const total_revenue = deals_closed * avg_contract_val

    metrics.push({
      webinar_id: 'seed-webinar-001',
      date: dateStr,
      registrants,
      attendees,
      show_rate: Math.round(show_rate * 100) / 100,
      vip_tickets,
      surveys_filled,
      whatsapp_joins,
      telegram_joins,
      replay_views,
      applicants,
      calls_booked,
      calls_showed,
      deals_closed,
      avg_contract_val,
      total_cash: Math.round(total_cash * 100) / 100,
      total_revenue: Math.round(total_revenue * 100) / 100,
    })
  }

  return metrics
}

export function generateFakeAdMetrics(daysBack = 90): FakeAdMetric[] {
  const rng = seededRand(77)
  const r = () => rng()
  const metrics: FakeAdMetric[] = []
  const now = new Date()
  const platforms = [
    { platform: 'facebook', campaign_id: 'seed-fb-camp-001', ad_set_id: 'seed-fb-adset-001', baseSpend: 150 },
    { platform: 'google',   campaign_id: 'seed-goog-camp-001', ad_set_id: 'seed-goog-adset-001', baseSpend: 80 },
  ]

  for (let d = daysBack - 1; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0]
    for (const p of platforms) {
      const spend = Math.round((p.baseSpend + r() * 80 - 40) * 100) / 100
      const impressions = Math.floor(spend * (80 + r() * 40))
      const clicks = Math.floor(impressions * (0.015 + r() * 0.01))
      const signups = Math.floor(clicks * (0.08 + r() * 0.04))
      const conversions = Math.floor(signups * (0.12 + r() * 0.08))
      const revenue = conversions * [997, 1997][Math.floor(r() * 2)]

      metrics.push({
        platform: p.platform,
        campaign_id: p.campaign_id,
        ad_set_id: p.ad_set_id,
        date,
        spend,
        impressions,
        cpm: impressions > 0 ? Math.round((spend / impressions * 1000) * 100) / 100 : 0,
        clicks,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        landing_page_views: Math.floor(clicks * (0.7 + r() * 0.2)),
        cpr: signups > 0 ? Math.round((spend / signups) * 100) / 100 : 0,
        signups,
        leads: signups,
        conversions,
        revenue,
      })
    }
  }

  return metrics
}

export function generateFakeEmailMetrics(daysBack = 90): FakeEmailMetric[] {
  const rng = seededRand(55)
  const r = () => rng()
  const metrics: FakeEmailMetric[] = []
  const now = new Date()

  for (let d = daysBack - 1; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0]
    const sent = Math.floor(r() * 300 + 50)
    const delivered = Math.floor(sent * (0.95 + r() * 0.04))
    const opens = Math.floor(delivered * (0.28 + r() * 0.12))
    const clicks = Math.floor(opens * (0.08 + r() * 0.06))
    metrics.push({
      provider: 'kit',
      campaign_id: 'seed-email-camp-001',
      sequence_id: 'seed-seq-001',
      date,
      sent,
      delivered,
      opens,
      clicks,
      unsubscribes: Math.floor(delivered * r() * 0.005),
      signups: Math.floor(clicks * (0.15 + r() * 0.1)),
      open_rate: delivered > 0 ? Math.round((opens / delivered * 100) * 100) / 100 : 0,
      click_rate: opens > 0 ? Math.round((clicks / opens * 100) * 100) / 100 : 0,
    })
  }

  return metrics
}
