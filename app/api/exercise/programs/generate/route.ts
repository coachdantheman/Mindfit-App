import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { aiQuota } from '@/lib/rate-limit'
import { consentFlags } from '@/lib/consent-flags'
import { createAdminClient } from '@/lib/supabase-server'
import { extractJson } from '@/lib/ai-json'
import { parsePlanRequest } from '@/lib/workout-templates'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ timeout: 90_000, maxRetries: 1 })

const BODYBUILDING_RULES = `
Bodybuilding (muscle growth and aesthetics) rules:
- Hypertrophy focus: compound lifts 3-4 sets of 8-12 reps, isolation work 3-4 sets of 10-15 reps, 60-90 s rest. Put the rest time in each exercise's notes.
- Train every major muscle group each week with isolation work: chest, back, shoulders (side and rear delts), biceps, triceps, quads, hamstrings, glutes, calves.
- Split by training days: 3 = full body, 4 = upper/lower, 5 = push/pull/legs + upper/lower, 6 = push/pull/legs twice. Do not train the same muscles on back-to-back days.
- Phases run accumulation (more reps, moderate weight) -> intensification (more sets, heavier) -> deload (fewer sets, easy effort).
- Every block's focus explains weekly progressive overload: add a rep each week, then a small weight jump once every set hits the top of the range.
- Teen-safe: technique and full range of motion first, controlled lowering, stop 1-3 reps short of failure, no max-effort singles. Remind them to eat enough real food and sleep 8+ hours to grow.
- Never mention supplements, pre-workout, creatine, steroids or any performance-enhancing drug, calorie targets, cutting or bulking diets, or body-weight goals.`

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const overQuota = await aiQuota(auth.userId, 'generate', 15)
  if (overQuota) return overQuota
  if ((await consentFlags(createAdminClient(), auth.userId)).aiBlocked) {
    return NextResponse.json({ error: 'AI features are turned off for your account. A parent can turn them on from their MindFit email.' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => null)
    const parsed = parsePlanRequest(body)
    if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 })
    const { sport, goals, experience, daysPerWeek: days_per_week, durationWeeks: duration_weeks } = parsed
    const bodybuilding = goals.includes('bodybuilding')
    const programType = bodybuilding ? `${sport ? `${sport} athlete's ` : ''}bodybuilding (muscle growth and aesthetics)` : sport

    const numBlocks = Math.ceil(duration_weeks / 4)

    const systemPrompt = `You are a strength and conditioning coach designing a periodized training program for a high school athlete.

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
- ${sport ? 'Sport-specific, age-appropriate' : 'Age-appropriate'}, practical for a school weight room
- Exercises should be different across blocks to show periodization progression${bodybuilding ? `\n${BODYBUILDING_RULES}` : ''}`

    const userPrompt = `Create a ${duration_weeks}-week ${programType} training program.
Level: ${experience}
Goals: ${goals.join(', ')}
Days/week: ${days_per_week}
Blocks: ${numBlocks} phases (~${Math.round(duration_weeks / numBlocks)} weeks each)

Keep it concise — ${numBlocks} blocks, ${days_per_week} workouts per block, 5-7 exercises per workout. Output JSON only.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content.find(b => b.type === 'text')?.text ?? ''
    const program = extractJson(text) as { blocks?: unknown[] }
    if (!Array.isArray(program?.blocks) || program.blocks.length === 0) throw new SyntaxError('no blocks')
    return NextResponse.json(program)
  } catch (err: any) {
    console.error('AI generation error:', err?.message || err)
    return NextResponse.json({ error: 'AI generation failed. Please try again or use "Generate" instead.' }, { status: 500 })
  }
}
