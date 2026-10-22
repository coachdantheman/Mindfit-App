import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyApiUser } from '@/lib/api-auth'
import { optionalString, requireString } from '@/lib/validate'
import { extractJson, sanitizeEstimate } from '@/lib/ai-json'

export const maxDuration = 30

const anthropic = new Anthropic()

const SYSTEM = `You are a sports dietitian estimating nutrition for a high-school athlete's food log.
Return ONLY valid JSON with this exact shape:
{"name": string, "serving_size": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "low"|"medium"|"high"}
Use the serving the user gives; otherwise a typical single serving. Use USDA-typical values for generic foods and the brand's published label for branded items. Round calories to the nearest 5 and grams to the nearest 1. confidence reflects how sure you are of the values.`

// Estimates are never saved by this route — the student confirms in the UI.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const food_name = requireString(body.food_name, 120)
  if (!food_name) return NextResponse.json({ error: 'Food name required' }, { status: 400 })
  const serving = optionalString(body.serving, 60)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Food: ${food_name}\nServing: ${serving ?? 'typical'}` }],
    })
    const text = message.content.find(b => b.type === 'text')?.text ?? ''
    const item = sanitizeEstimate(extractJson(text))
    if (!item) throw new SyntaxError('empty estimate')
    return NextResponse.json(item)
  } catch (err: any) {
    console.error('AI estimate error:', err?.message || err)
    const detail = err?.status
      ? 'The estimate service is unavailable right now. Enter the nutrition manually.'
      : err instanceof SyntaxError
        ? 'Could not read the estimate. Try again or enter it manually.'
        : 'Estimate failed. Try again or enter it manually.'
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
