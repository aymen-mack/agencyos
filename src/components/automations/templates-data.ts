import type { AutomationTemplate } from './types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function triggerNode(id: string, label: string, description: string, x: number, y: number) {
  return {
    id,
    type: 'trigger' as const,
    position: { x, y },
    data: { label, description },
  }
}

function actionNode(id: string, label: string, description: string, x: number, y: number) {
  return {
    id,
    type: 'action' as const,
    position: { x, y },
    data: { label, description },
  }
}

function conditionNode(id: string, label: string, description: string, x: number, y: number) {
  return {
    id,
    type: 'condition' as const,
    position: { x, y },
    data: { label, description },
  }
}

function delayNode(id: string, label: string, description: string, x: number, y: number) {
  return {
    id,
    type: 'delay' as const,
    position: { x, y },
    data: { label, description },
  }
}

function edge(id: string, source: string, target: string, label?: string) {
  return { id, source, target, label, type: 'smoothstep' as const }
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'optin-to-kit',
    name: 'Opt-in to Kit',
    description: 'When someone opts in via a form, automatically add them as a Kit subscriber and tag them.',
    category: 'Email',
    icon: '📧',
    nodes: [
      triggerNode('t1', 'Form Submission', 'Lead submits opt-in form', 100, 100),
      conditionNode('c1', 'Check: Email valid?', 'Validate email format', 100, 240),
      actionNode('a1', 'Add to Kit', 'Create subscriber in Kit account', 100, 380),
      actionNode('a2', 'Add Tag: New Subscriber', 'Tag subscriber for segmentation', 100, 520),
      actionNode('a3', 'Send Welcome Email', 'Trigger Kit welcome sequence', 100, 660),
    ],
    edges: [
      edge('e1', 't1', 'c1'),
      edge('e2', 'c1', 'a1', 'Yes'),
      edge('e3', 'a1', 'a2'),
      edge('e4', 'a2', 'a3'),
    ],
  },
  {
    id: 'vip-lead-update',
    name: 'VIP Lead Update',
    description: 'When a lead reaches a high score, flag them as VIP and notify your sales team.',
    category: 'CRM',
    icon: '⭐',
    nodes: [
      triggerNode('t1', 'Lead Score Updated', 'Lead score changes', 100, 100),
      conditionNode('c1', 'Score ≥ 80?', 'Check if lead qualifies as VIP', 100, 240),
      actionNode('a1', 'Update Lead Status', 'Set status to "VIP"', 100, 380),
      actionNode('a2', 'Add Tag: VIP', 'Tag in Kit as VIP subscriber', 100, 520),
      actionNode('a3', 'Notify Sales Team', 'Send Slack/email alert', 100, 660),
    ],
    edges: [
      edge('e1', 't1', 'c1'),
      edge('e2', 'c1', 'a1', 'Yes'),
      edge('e3', 'a1', 'a2'),
      edge('e4', 'a2', 'a3'),
    ],
  },
  {
    id: 'survey-update',
    name: 'Survey Update',
    description: 'Process survey responses, score the lead, and segment them based on their answers.',
    category: 'Leads',
    icon: '📋',
    nodes: [
      triggerNode('t1', 'Survey Submitted', 'Lead completes survey (Typeform)', 100, 100),
      actionNode('a1', 'Parse Survey Data', 'Extract answers and score', 100, 240),
      conditionNode('c1', 'High Intent?', 'Score > 60 and timeline is immediate', 100, 380),
      actionNode('a2', 'Update Lead Score', 'Apply score to lead profile', 50, 520),
      actionNode('a3', 'Book Call Prompt', 'Send booking link email', 220, 520),
      actionNode('a4', 'Nurture Sequence', 'Add to email nurture flow', 50, 660),
    ],
    edges: [
      edge('e1', 't1', 'a1'),
      edge('e2', 'a1', 'c1'),
      edge('e3', 'c1', 'a3', 'Yes'),
      edge('e4', 'c1', 'a2', 'No'),
      edge('e5', 'a2', 'a4'),
    ],
  },
  {
    id: 'webinar-show',
    name: 'Webinar Show',
    description: 'When a lead attends a webinar, update their status and send a follow-up sequence.',
    category: 'Webinar',
    icon: '🎥',
    nodes: [
      triggerNode('t1', 'Webinar Attended', 'Lead joins the webinar', 100, 100),
      actionNode('a1', 'Update Lead Status', 'Set status to "Attended"', 100, 240),
      actionNode('a2', 'Add Score: +35 pts', 'Boost lead score for attending', 100, 380),
      delayNode('d1', 'Wait 1 Hour', 'After webinar ends', 100, 520),
      actionNode('a3', 'Send Replay + Offer', 'Email replay link and CTA', 100, 660),
      conditionNode('c1', 'Offer Clicked?', 'Check link click within 24h', 100, 800),
      actionNode('a4', 'Book Call Prompt', 'Send personalized booking link', 100, 940),
    ],
    edges: [
      edge('e1', 't1', 'a1'),
      edge('e2', 'a1', 'a2'),
      edge('e3', 'a2', 'd1'),
      edge('e4', 'd1', 'a3'),
      edge('e5', 'a3', 'c1'),
      edge('e6', 'c1', 'a4', 'Yes'),
    ],
  },
  {
    id: 'call-booked',
    name: 'Call Booked',
    description: 'When a lead books a call, notify your team and prepare the lead with pre-call content.',
    category: 'Sales',
    icon: '📞',
    nodes: [
      triggerNode('t1', 'Call Booked', 'Lead books via Calendly/Cal.com', 100, 100),
      actionNode('a1', 'Update Lead Status', 'Set status to "Call Booked"', 100, 240),
      actionNode('a2', 'Add Score: +50 pts', 'Boost lead score', 100, 380),
      actionNode('a3', 'Notify Team', 'Alert sales team in Slack', 100, 520),
      actionNode('a4', 'Send Pre-Call Email', 'What to prepare before the call', 100, 660),
      delayNode('d1', 'Wait 24h Before Call', 'Reminder timing', 100, 800),
      actionNode('a5', 'Send Reminder', 'Day-before reminder email', 100, 940),
    ],
    edges: [
      edge('e1', 't1', 'a1'),
      edge('e2', 'a1', 'a2'),
      edge('e3', 'a2', 'a3'),
      edge('e4', 'a3', 'a4'),
      edge('e5', 'a4', 'd1'),
      edge('e6', 'd1', 'a5'),
    ],
  },
  {
    id: 'closed-deals',
    name: 'Closed Deals',
    description: 'When a lead pays and closes, onboard them automatically and celebrate the win.',
    category: 'Sales',
    icon: '🏆',
    nodes: [
      triggerNode('t1', 'Payment Received', 'Stripe/Whop payment webhook', 100, 100),
      actionNode('a1', 'Update Lead Status', 'Set status to "Closed"', 100, 240),
      actionNode('a2', 'Add Tag: Customer', 'Tag in Kit as paying customer', 100, 380),
      actionNode('a3', 'Move to Customer List', 'Transfer to onboarding sequence', 100, 520),
      actionNode('a4', 'Notify Team', 'Celebrate in Slack 🎉', 100, 660),
      actionNode('a5', 'Send Onboarding Email', 'Welcome + next steps', 100, 800),
    ],
    edges: [
      edge('e1', 't1', 'a1'),
      edge('e2', 'a1', 'a2'),
      edge('e3', 'a2', 'a3'),
      edge('e4', 'a3', 'a4'),
      edge('e5', 'a4', 'a5'),
    ],
  },
]

export const TRIGGER_TYPES = [
  { value: 'form_submission', label: 'Form Submission' },
  { value: 'webinar_registered', label: 'Webinar Registered' },
  { value: 'webinar_attended', label: 'Webinar Attended' },
  { value: 'lead_score_updated', label: 'Lead Score Updated' },
  { value: 'call_booked', label: 'Call Booked' },
  { value: 'call_showed', label: 'Call Showed' },
  { value: 'deal_closed', label: 'Deal Closed' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'tag_added', label: 'Tag Added' },
  { value: 'manual', label: 'Manual Trigger' },
]

export const ACTION_TYPES = [
  { value: 'add_to_kit', label: 'Add to Kit' },
  { value: 'add_tag', label: 'Add Tag (Kit)' },
  { value: 'remove_tag', label: 'Remove Tag (Kit)' },
  { value: 'update_lead_status', label: 'Update Lead Status' },
  { value: 'update_lead_score', label: 'Update Lead Score' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'notify_slack', label: 'Notify Slack' },
  { value: 'notify_team', label: 'Notify Team' },
  { value: 'webhook', label: 'HTTP Webhook' },
]
