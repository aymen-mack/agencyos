export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          clerk_org_id: string
          name: string
          slug: string
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_org_id: string
          name: string
          slug: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_org_id?: string
          name?: string
          slug?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          role?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          client_name: string | null
          status: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          client_name?: string | null
          status?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          client_name?: string | null
          status?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          role?: string
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          id: string
          project_id: string
          email: string
          role: string
          token: string
          status: string
          invited_by: string | null
          accepted_by: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          role?: string
          token: string
          status?: string
          invited_by?: string | null
          accepted_by?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          role?: string
          status?: string
          accepted_by?: string | null
          token?: string
          expires_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          id: string
          project_id: string
          provider: string
          status: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider: string
          status?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          project_id: string
          email: string
          full_name: string | null
          phone: string | null
          source: string | null
          source_ref: string | null
          score: number
          score_breakdown: Json
          status: string
          survey_data: Json
          tags: string[]
          campaign: string | null
          attended: boolean
          purchase_amount: number | null
          payment_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          full_name?: string | null
          phone?: string | null
          source?: string | null
          source_ref?: string | null
          score?: number
          score_breakdown?: Json
          status?: string
          survey_data?: Json
          tags?: string[]
          campaign?: string | null
          attended?: boolean
          purchase_amount?: number | null
          payment_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          phone?: string | null
          source?: string | null
          source_ref?: string | null
          score?: number
          score_breakdown?: Json
          status?: string
          survey_data?: Json
          tags?: string[]
          campaign?: string | null
          attended?: boolean
          purchase_amount?: number | null
          payment_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          id: string
          lead_id: string
          project_id: string
          type: string
          payload: Json
          score_delta: number
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          project_id: string
          type: string
          payload?: Json
          score_delta?: number
          created_at?: string
        }
        Update: {
          payload?: Json
          score_delta?: number
        }
        Relationships: []
      }
      webinar_metrics: {
        Row: {
          id: string
          project_id: string
          webinar_id: string | null
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
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          webinar_id?: string | null
          date: string
          registrants?: number
          attendees?: number
          show_rate?: number
          vip_tickets?: number
          surveys_filled?: number
          whatsapp_joins?: number
          telegram_joins?: number
          replay_views?: number
          applicants?: number
          calls_booked?: number
          calls_showed?: number
          deals_closed?: number
          avg_contract_val?: number
          total_cash?: number
          total_revenue?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          registrants?: number
          attendees?: number
          show_rate?: number
          vip_tickets?: number
          surveys_filled?: number
          whatsapp_joins?: number
          telegram_joins?: number
          replay_views?: number
          applicants?: number
          calls_booked?: number
          calls_showed?: number
          deals_closed?: number
          avg_contract_val?: number
          total_cash?: number
          total_revenue?: number
          metadata?: Json
        }
        Relationships: []
      }
      ad_metrics: {
        Row: {
          id: string
          project_id: string
          platform: string
          campaign_id: string | null
          ad_set_id: string | null
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
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          platform: string
          campaign_id?: string | null
          ad_set_id?: string | null
          date: string
          spend?: number
          impressions?: number
          cpm?: number
          clicks?: number
          cpc?: number
          landing_page_views?: number
          cpr?: number
          signups?: number
          leads?: number
          conversions?: number
          revenue?: number
          created_at?: string
        }
        Update: {
          spend?: number
          impressions?: number
          cpm?: number
          clicks?: number
          cpc?: number
          landing_page_views?: number
          cpr?: number
          signups?: number
          leads?: number
          conversions?: number
          revenue?: number
        }
        Relationships: []
      }
      email_metrics: {
        Row: {
          id: string
          project_id: string
          provider: string
          campaign_id: string | null
          sequence_id: string | null
          date: string
          sent: number
          delivered: number
          opens: number
          clicks: number
          unsubscribes: number
          signups: number
          open_rate: number
          click_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider?: string
          campaign_id?: string | null
          sequence_id?: string | null
          date: string
          sent?: number
          delivered?: number
          opens?: number
          clicks?: number
          unsubscribes?: number
          signups?: number
          open_rate?: number
          click_rate?: number
          created_at?: string
        }
        Update: {
          sent?: number
          delivered?: number
          opens?: number
          clicks?: number
          unsubscribes?: number
          signups?: number
          open_rate?: number
          click_rate?: number
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          project_id: string
          lead_id: string | null
          title: string
          stage: string
          value: number
          close_date: string | null
          owner_id: string | null
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          lead_id?: string | null
          title: string
          stage?: string
          value?: number
          close_date?: string | null
          owner_id?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          stage?: string
          value?: number
          close_date?: string | null
          notes?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      canvas_nodes: {
        Row: {
          id: string
          project_id: string
          type: string
          position_x: number
          position_y: number
          content: string | null
          node_config: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type?: string
          position_x?: number
          position_y?: number
          content?: string | null
          node_config?: Json
          created_at?: string
        }
        Update: {
          type?: string
          position_x?: number
          position_y?: number
          content?: string | null
          node_config?: Json
        }
        Relationships: []
      }
      canvas_edges: {
        Row: {
          id: string
          project_id: string
          source_node_id: string
          target_node_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          source_node_id: string
          target_node_id: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      canvas_outputs: {
        Row: {
          id: string
          node_id: string
          output_content: string
          generated_at: string
        }
        Insert: {
          id?: string
          node_id: string
          output_content: string
          generated_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      lead_notes: {
        Row: {
          id: string
          lead_id: string
          project_id: string
          content: string
          author_name: string | null
          author_clerk_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          project_id: string
          content: string
          author_name?: string | null
          author_clerk_id?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          author_name?: string | null
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          id: string
          project_id: string
          name: string
          field_type: string
          options: Json
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          field_type?: string
          options?: Json
          position?: number
          created_at?: string
        }
        Update: {
          name?: string
          field_type?: string
          options?: Json
          position?: number
        }
        Relationships: []
      }
      lead_custom_values: {
        Row: {
          id: string
          lead_id: string
          field_id: string
          project_id: string
          value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          field_id: string
          project_id: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Organization = Tables<'organizations'>
export type User = Tables<'users'>
export type OrgMember = Tables<'org_members'>
export type ClientProject = Tables<'client_projects'>
export type ProjectMember = Tables<'project_members'>
export type Integration = Tables<'integrations'>
export type Lead = Tables<'leads'>
export type LeadEvent = Tables<'lead_events'>
export type WebinarMetrics = Tables<'webinar_metrics'>
export type AdMetrics = Tables<'ad_metrics'>
export type EmailMetrics = Tables<'email_metrics'>
export type Sale = Tables<'sales'>

export type LeadScore = 'least_likely' | 'likely' | 'most_likely'
export type IntegrationProvider =
  | 'kit'
  | 'zoom'
  | 'stripe'
  | 'whop'
  | 'fanbasis'
  | 'typeform'
  | 'cal_com'
  | 'calendly'
  | 'meta_ads'
  | 'make'
