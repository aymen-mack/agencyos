import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { CANVAS_SKILLS } from '@/lib/canvas-skills'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const { nodeId } = await params
  const { instruction, inputs, skillId } = await req.json()
  // inputs: Array<{ type: string; label?: string; content: string }>

  if (!instruction?.trim()) {
    return NextResponse.json({ error: 'No instruction provided' }, { status: 400 })
  }

  // Build the prompt
  const inputSections = (inputs as { type: string; label?: string; content: string }[])
    .filter((i) => i.content?.trim())
    .map((i, idx) => {
      const label = i.label || `${i.type.replace('_', ' ')} ${idx + 1}`
      return `### ${label}\n${i.content.trim()}`
    })
    .join('\n\n')

  const userMessage = inputSections
    ? `Here is the input content:\n\n${inputSections}\n\n---\n\nInstruction: ${instruction}`
    : `Instruction: ${instruction}`

  const skill = skillId ? CANVAS_SKILLS.find((s) => s.id === skillId) : null
  const systemPrompt = skill
    ? skill.systemPrompt
    : 'You are an expert marketing strategist and copywriter helping build sales funnels and business strategies. Be specific, actionable, and thorough.'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  })

  const output = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')

  // Save output to canvas_outputs and update node content
  const admin = createSupabaseAdminClient()
  await admin.from('canvas_outputs').insert({ node_id: nodeId, output_content: output })
  await admin.from('canvas_nodes').update({ content: output }).eq('id', nodeId)

  return NextResponse.json({ output })
}
