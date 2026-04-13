import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { sport, goals, experience_level, days_per_week, duration_weeks } = body

  if (!sport || !goals?.length) {
    return NextResponse.json({ error: 'Sport and goals are required' }, { status: 400 })
  }

  const systemPrompt = `You are a certified strength and conditioning coach (CSCS) designing a periodized training program for a high school athlete.

Your programs must be:
- Sport-specific: exercises chosen for transfer to the athlete's sport
- Periodized: distinct phases (Foundation/Accumulation → Strength/Intensification → Power/Peaking)
- Progressive: volume and intensity build across weeks within each phase
- Safe: age-appropriate loading, proper warm-up exercises included, recovery days built in
- Practical: exercises that can be done in a typical school weight room

Guidelines for sets/reps:
- Strength: 3-5 sets × 3-6 reps at higher intensity
- Hypertrophy: 3-4 sets × 8-12 reps at moderate intensity
- Power/Speed: 3-5 sets × 3-5 reps with explosive intent
- Endurance/Conditioning: 2-3 sets × 12-20 reps or timed intervals
- Always include a dynamic warm-up and mobility work

Return ONLY valid JSON with no markdown formatting, no code fences. The JSON must match this schema exactly:
{
  "title": "string",
  "description": "string",
  "blocks": [
    {
      "name": "string (phase name)",
      "week_start": number,
      "week_end": number,
      "focus": "string (what this phase emphasizes)",
      "sort_order": number,
      "workouts": [
        {
          "day_of_week": number (1=Monday through 7=Sunday),
          "week_number": number (1-based),
          "name": "string (workout name)",
          "description": "string",
          "exercises": [
            {
              "name": "string",
              "sets": number,
              "reps": "string (e.g. '8-10', '5', '30 sec')",
              "notes": "string (coaching cues, rest periods, tempo)"
            }
          ]
        }
      ]
    }
  ]
}`

  const userPrompt = `Design a ${duration_weeks}-week training program for a ${experience_level} high school ${sport} athlete.

Training goals: ${goals.join(', ')}
Available training days: ${days_per_week} days per week
Program duration: ${duration_weeks} weeks

Create ${Math.ceil(duration_weeks / 4)} periodization blocks (approximately 3-4 weeks each).
For each training day, provide 5-8 exercises with specific sets, reps, and coaching notes.
Include warm-up exercises at the start of each workout.
Vary the focus across training days (e.g., upper/lower split, push/pull, or sport-specific movement patterns).`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON — handle code fences, leading text, etc.
    let jsonStr = text
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    } else {
      // Try to find JSON object directly
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
        ? 'AI returned invalid JSON. Please try again.'
        : 'Failed to generate training program. Please try again.'
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
