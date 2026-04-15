export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom'

export interface DateRange {
  start: Date
  end: Date
  preset: DatePreset
}

export type KPIMetricId =
  | 'total_cash'
  | 'total_revenue'
  | 'calls_booked'
  | 'avg_per_close'
  | 'total_registrations'
  | 'show_rate'
  | 'conversion_rate'
  | 'refund_rate'
  | 'cost_per_reg'
  | 'roas'
  | 'total_ad_spend'
  | 'email_open_rate'

export interface KPICardConfig {
  id: KPIMetricId
  visible: boolean
  order: number
}

export type ChartType = 'line' | 'bar' | 'horizontal_bar' | 'donut' | 'area' | 'stacked_bar'
export type XAxisField = 'date' | 'source' | 'status' | 'campaign' | 'platform'
export type YAxisField = 'total_cash' | 'total_revenue' | 'registrations' | 'attendance_count' | 'conversion_rate' | 'ad_spend' | 'calls_booked' | 'refunds' | 'revenue' | 'open_rate' | 'click_rate'
export type GroupByField = 'source' | 'status' | 'campaign' | 'none'
export type WidgetWidth = 'half' | 'full'

export interface ChartWidgetConfig {
  id: string
  title: string
  chartType: ChartType
  xAxis: XAxisField
  yAxis: YAxisField
  groupBy: GroupByField
  visible: boolean
  order: number
  width: WidgetWidth
}

export interface TableFilters {
  statusFilter: string
  searchQuery: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  page: number
}

export interface DashboardConfig {
  dateRange: DateRange
  kpiCards: KPICardConfig[]
  chartWidgets: ChartWidgetConfig[]
  tableFilters: TableFilters
}

// API response types
export interface KPIValue {
  current: number
  previous: number
  sparkline: number[]
}

export interface KPISummary {
  total_cash: KPIValue
  total_revenue: KPIValue
  calls_booked: KPIValue
  avg_per_close: KPIValue
  total_registrations: KPIValue
  show_rate: KPIValue
  conversion_rate: KPIValue
  refund_rate: KPIValue
  total_ad_spend: KPIValue
  roas: KPIValue
  cost_per_reg: KPIValue
  email_open_rate: KPIValue
}

export interface DashboardRawData {
  revenue_over_time: { date: string; cash_collected: number; total_revenue: number }[]
  traffic_sources: { source: string; count: number; revenue: number }[]
  status_breakdown: { status: string; count: number }[]
  revenue_by_source: { source: string; revenue: number }[]
  ad_spend_over_time: { date: string; spend: number; revenue: number }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webinar_metrics: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leads_summary: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ad_metrics: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  email_metrics: any[]
}

export interface DashboardSummary {
  kpis: KPISummary
  rawData: DashboardRawData
}

export interface DashboardLead {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  source: string | null
  status: string
  campaign: string | null
  attended: boolean
  purchase_amount: number | null
  payment_status: string | null
  created_at: string
}

// KPI display metadata
export const KPI_META: Record<KPIMetricId, { label: string; format: 'currency' | 'number' | 'percent' }> = {
  total_cash:          { label: 'Total Cash Collected',    format: 'currency' },
  total_revenue:       { label: 'Total Revenue',           format: 'currency' },
  calls_booked:        { label: 'Total Calls Booked',      format: 'number'   },
  avg_per_close:       { label: 'Avg Revenue Per Close',   format: 'currency' },
  total_registrations: { label: 'Total Registrations',     format: 'number'   },
  show_rate:           { label: 'Show Rate',               format: 'percent'  },
  conversion_rate:     { label: 'Conversion Rate',         format: 'percent'  },
  refund_rate:         { label: 'Refund Rate',             format: 'percent'  },
  cost_per_reg:        { label: 'Cost Per Registration',   format: 'currency' },
  roas:                { label: 'ROAS',                    format: 'number'   },
  total_ad_spend:      { label: 'Total Ad Spend',          format: 'currency' },
  email_open_rate:     { label: 'Email Open Rate',         format: 'percent'  },
}

export function formatKPIValue(value: number, format: 'currency' | 'number' | 'percent'): string {
  if (format === 'currency') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
    return `$${value.toFixed(0)}`
  }
  if (format === 'percent') return `${value.toFixed(1)}%`
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(value % 1 === 0 ? 0 : 2)
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

// Default dashboard config
export function getDefaultConfig(): DashboardConfig {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 86400000)
  return {
    dateRange: { start, end, preset: '30d' },
    kpiCards: [
      { id: 'total_cash',          visible: true, order: 0 },
      { id: 'total_revenue',       visible: true, order: 1 },
      { id: 'calls_booked',        visible: true, order: 2 },
      { id: 'avg_per_close',       visible: true, order: 3 },
      { id: 'total_registrations', visible: false, order: 4 },
      { id: 'show_rate',           visible: false, order: 5 },
      { id: 'conversion_rate',     visible: false, order: 6 },
      { id: 'refund_rate',         visible: false, order: 7 },
      { id: 'cost_per_reg',        visible: false, order: 8 },
      { id: 'roas',                visible: false, order: 9 },
      { id: 'total_ad_spend',      visible: false, order: 10 },
      { id: 'email_open_rate',     visible: false, order: 11 },
    ],
    chartWidgets: [
      { id: 'revenue-over-time', title: 'Revenue Over Time',          chartType: 'area',           xAxis: 'date',   yAxis: 'total_cash',    groupBy: 'none', visible: true, order: 0, width: 'half' },
      { id: 'traffic-sources',   title: 'Traffic Sources',            chartType: 'donut',          xAxis: 'source', yAxis: 'registrations', groupBy: 'none', visible: true, order: 1, width: 'half' },
      { id: 'status-breakdown',  title: 'Registrant Status',          chartType: 'horizontal_bar', xAxis: 'status', yAxis: 'registrations', groupBy: 'none', visible: true, order: 2, width: 'half' },
      { id: 'revenue-by-source', title: 'Revenue by Source',          chartType: 'bar',            xAxis: 'source', yAxis: 'revenue',       groupBy: 'none', visible: true, order: 3, width: 'half' },
    ],
    tableFilters: {
      statusFilter: 'all',
      searchQuery: '',
      sortField: 'created_at',
      sortDirection: 'desc',
      page: 1,
    },
  }
}
