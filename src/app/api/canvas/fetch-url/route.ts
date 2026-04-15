import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Convert Google Docs/Sheets/Slides view URLs to plain-text export URLs
function resolveGoogleUrl(url: string): { exportUrl: string; type: 'gdoc' | 'gsheet' | 'gslides' } | null {
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch) {
    return {
      exportUrl: `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt`,
      type: 'gdoc',
    }
  }
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) {
    return {
      exportUrl: `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv`,
      type: 'gsheet',
    }
  }
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (slideMatch) {
    return {
      exportUrl: `https://docs.google.com/presentation/d/${slideMatch[1]}/export?format=txt`,
      type: 'gslides',
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const google = resolveGoogleUrl(url)

    if (google) {
      // Fetch the plain-text export directly
      const res = await fetch(google.exportUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencyBot/1.0)' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      })

      if (!res.ok) {
        // Likely not shared publicly
        return NextResponse.json({
          error: `Could not access the Google Doc (status ${res.status}). Make sure sharing is set to "Anyone with the link can view".`,
        }, { status: 400 })
      }

      const text = await res.text()

      // Clean up exported text (remove excessive blank lines)
      const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 50000)

      const typeLabel = google.type === 'gdoc' ? 'Google Doc' : google.type === 'gsheet' ? 'Google Sheet' : 'Google Slides'
      return NextResponse.json({
        title: typeLabel,
        description: `Imported from ${url}`,
        content: cleaned,
      })
    }

    // Regular URL — fetch HTML and extract text
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencyBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 400 })

    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? url

    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    const description = descMatch?.[1]?.trim() ?? ''

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyHtml = bodyMatch?.[1] ?? html
    const text = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 8000)

    return NextResponse.json({ title, description, content: text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
