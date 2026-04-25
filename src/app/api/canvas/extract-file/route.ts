import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PDFParse } from 'pdf-parse'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()

    return NextResponse.json({ text: result.text || '' })
  } catch (err) {
    console.error('PDF extraction error:', err)
    return NextResponse.json(
      { error: 'Failed to extract PDF text', text: '' },
      { status: 500 }
    )
  }
}
