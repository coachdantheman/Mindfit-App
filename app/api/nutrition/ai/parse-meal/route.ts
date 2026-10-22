import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyApiUser } from '@/lib/api-auth'
import { optionalString, requireString } from '@/lib/validate'
import { extractJson, sanitizeEstimate } from '@/lib/ai-json'

export const maxDuration = 45

const anthropic = new Anthropic()

const SYSTEM = `You are a sports dietitian helping a high-school athlete log a meal they described in words.
Split the description into separate food items with a per-item serving and nutrition.
Return ONLY valid JSON with this exact shape:
{"items": [{"name": string, "serving_size": string, "servings": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "low"|"medium"|"high"}]}
At most 12 items. Do not invent foods that were not mentioned. calories/protein/carbs/fat are PER SERVING; servings is how many of that serving they ate. Use USDA-typical values for generic foods and the brand's label for branded items. Round calories to the nearest 5 and grams to the nearest 1.`

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const text = requireString(body.text, 600)
  if (!text) return NextResponse.json({ error: 'Describe what you ate first.' }, { status: 400 })
  const meal = optionalString(body.meal_name, 20) ?? 'meal'

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Meal (${meal}): ${text}` }],
    })
    const reply = message.content.find(b => b.type === 'text')?.text ?? ''
    const parsed = extractJson(reply) as { items?: unknown[] }
    const items = (Array.isArray(parsed?.items) ? parsed.items : [])
      .map(sanitizeEstimate)
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .slice(0, 12)
    if (items.length === 0) throw new SyntaxError('no items')
    return NextResponse.json({ items })
  } catch (err: any) {
    console.error('AI parse-meal error:', err?.message || err)
    const detail = err?.status
      ? 'The estimate service is unavailable right now. Add foods with search instead.'
      : err instanceof SyntaxError
        ? "Couldn't break that down. Try naming each food, like \"2 eggs, toast, chocolate milk\"."
        : 'Something went wrong. Try again or add foods with search.'
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
