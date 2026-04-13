import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { sport, goals, experience_level, days_per_week, duration_weeks } = body

  if (!sport || !goals?.length) {
    return NextResponse.json({ error: 'Sport and goals are required' }, { status: 400 })
  }

  const numBlocks = Math.ceil(duration_weeks / 4)

  const systemPrompt = `You are a certified strength and conditioning coach designing a periodized training program for a high school athlete.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact schema:
{
  "title": "string",
  "description": "string",
  "blocks": [
    {
      "name": "string (phase name)",
      "week_start": number,
      "week_end": number,
      "focus": "string",
      "sort_order": number,
      "workouts": [
        {
          "day_of_week": number (1=Mon..7=Sun),
          "name": "string",
          "description": "string",
          "exercises": [
            { "name": "string", "sets": number, "reps": "string", "notes": "string" }
          ]
        }
      ]
    }
  ]
}

Rules:
- Each block = one training phase with ${days_per_week} workouts (one per training day)
- Each workout has 5-7 exercises including a warm-up
- Sport-specific, age-appropriate, practical for a school weight room
- Exercises should be different across blocks to show periodization progression`

  const userPrompt = `Create a ${duration_weeks}-week ${sport} training program.
Level: ${experience_level}
Goals: ${goals.join(', ')}
Days/week: ${days_per_week}
Blocks: ${numBlocks} phases (~${Math.round(duration_weeks / numBlocks)} weeks each)

Keep it concise — ${numBlocks} blocks, ${days_per_week} workouts per block, 5-7 exercises per workout. Output JSON only.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let jsonStr = text
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    } else {
      const braceStart = text.indexOf('{')
      const braceEnd = text.lastIndexOf('}')
      if (braceStart !== -1 && braceEnd > braceStart) {
        jsonStr = text.slice(braceStart, braceEnd + 1)
      }
    }

    const program = JSON.parse(jsonStr.trim())
    return NextResponse.json(program)
  } catch (err: any) {
    console.error('AI generation error:', err?.message || err)
    const detail = err?.status
      ? `API error (${err.status}): ${err?.error?.message || 'Unknown'}`
      : err instanceof SyntaxError
        ? 'AI returned invalid format. Please try again.'
        : `Generation failed: ${err?.message || 'Unknown error'}`
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
