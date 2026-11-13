# Daily Guidance — plan (draft for Daniel's approval)

A full-screen guide, styled like the /start onboarding, that greets the athlete on their first app open of the day. It runs the check-in, shows readiness, and then hands them one next step at a time until all four rings are closed. It replaces the Today card on Mindset. It's free for every athlete. Coaches and parents don't get it (they have no rings).

## Daniel's decisions
- Shows on the **first app open of the day**. After that the app opens normally, and a small bar on Mindset brings the guide back.
- **Guided loop:** one big button. The athlete logs it, comes back to the guide, watches the ring close, and gets the next step.
- **Premium feel, free to all.**
- **On/off choice** in three places: the end of onboarding, the first time an existing athlete sees the guide, and a Settings switch that replaces "Today card on Mindset".
- The **Today card is removed** from Mindset and replaced by a slim "Today's guide" bar, which shows whether the guide is on or off.
- **Extras on the screen:** streak plus freezes, and a game-day countdown.
- The **check-in runs inside the guide**: no pop-up, the score animates in.
- **Step order follows the time of day.**

## What the athlete sees

1. **Greeting** (full screen, gold glow, the same look as /start): "Good morning, {first}." Shows the streak flame with any freezes, and "Game in 2 days" when there's a game coming up.
2. **Check-in, inline** (skipped if they already checked in today): sleep, how you feel, today's objective, lock in. These are the same steps as today's check-in pop-up, laid out as full-screen pages with the onboarding progress bar.
3. **Readiness reveal:** the ring counts up (like the MPI score ring in /start) with the verdict line, and the four rings sit underneath.
4. **Next step:** one card with a tag, a "why" line, and one big gold button, e.g. "Next · Fuel. Log breakfast. One meal closes your Fuel ring." Underneath: "I'll do this later," which moves to the next open step.
5. **Back from logging:** the ring that just closed animates shut, then the next step slides up.
6. **All four closed: Clutch Day screen.** Celebration, plus their daily focus (from the quiz or MPI) as an optional bonus rep, and "Enter the app."
7. **Choice screen** (only while their choice is unset): "Start every day here?" with "Guide me every day" or "I'll find my way."

A small × in the top corner closes the guide at any point and opens Mindset.

**Note:** the check-in already saves a journal entry and last night's sleep, so it usually closes **Mind and Rest** on its own. After check-in, the loop is mostly Body and Fuel. Game day still puts the pregame routine first.

## Step order (time of day, the athlete's own clock)
| When | Order of open rings |
|---|---|
| Game day | Check-in, pregame routine, then the normal order |
| Before 11:00 | Rest, Mind, Fuel (breakfast), Body |
| 11:00–17:00 | Body, Fuel, Mind, Rest |
| After 17:00 | Fuel, Mind, Body, Rest |
| All closed | Daily focus (bonus), then Clutch Day |

## How it works (technical)
- **Data, migration v59:** `profiles.daily_guidance boolean` with three states: null = never asked, true, false. Athletes who already turned the Today card off (`show_today_card = false`) start at false. The profile update function and the profile API accept the new field. `show_today_card` is no longer used and stays in place.
- **Route:** `app/guide/` gets its own layout, outside the app's navbar so it is full screen, with the same checks as the app (signed in, age, consent, onboarded, athlete role).
- **First open of the day:** when the guide opens, the app sets a `mf-guide-day` cookie that expires at the athlete's local midnight. The app layout (`app/(app)/layout.tsx`) sends the athlete to `/guide` when they are an athlete, `daily_guidance` is not false, and the cookie isn't there. No flash, and it works in the iPhone app.
- **Return to guide:** steps open their page with a "from guide" flag. A "← Back to your guide" pill (the existing Back to Game Day pill, generalised) shows on that page. On a successful save at the five main save points (food entry, workout finish, practice log, sleep, journal), the app goes straight back to `/guide` and shows a "Logged" toast.
- **Ring-close animation:** the guide remembers which rings were closed when the athlete left. On return, it animates any ring that changed.
- **Data source:** `/api/today` already has the check-in, pillars and focus. The guide also uses `/api/stats/overview` (streak and freezes) and `loadNextGame` (countdown). No new API.

## Releases (built by the Haiku builder from the brief, checked by me)

### Release 1: Guide screen + data (v59)
- **Goal:** `/guide` works end to end when opened by hand. It runs the check-in inline, shows the readiness reveal, steps through rings in time-of-day order, and ends on the Clutch Day screen. Settings: "Daily Guidance" switch replaces the Today card switch. Mindset: Today card replaced by the slim guide bar.
- **Files to read:** `components/today/TodayCard.tsx`, `components/today/DailyCheckIn.tsx` (split its steps into `CheckInSteps` so both the pop-up and the guide use them), `app/start/page.tsx` (layout, `Primary`, `ScoreRing`, `mf-rise`), `app/api/profile/route.ts`, `supabase-migration-v58-today-card-pref.sql`, `app/(app)/settings/page.tsx`, `app/(app)/mindset/page.tsx`.
- **Done when:** `npx tsc --noEmit && npm run build` passes. Signed in on localhost:3010, `/guide` shows the check-in, then readiness, then next step. Mindset shows the bar instead of the card. The Settings switch saves and survives a reload.

### Release 2: Entry + the choice
- **Goal:** first open of the day lands on `/guide`. The choice appears at the end of both onboarding flows (`/start` done step and `/onboarding` result) and on the first guide visit for existing athletes whose choice is still unset.
- **Files to read:** `app/(app)/layout.tsx`, `lib/auth.ts`, `app/start/page.tsx`, `app/onboarding/page.tsx`, the Release 1 guide files.
- **Done when:** the build passes. Clearing the `mf-guide-day` cookie and opening `/mindset` lands on `/guide`, and a second open lands on Mindset. With guide set to off, it never redirects. A new signup through `/start` sees the choice screen.

### Release 3: The loop
- **Goal:** steps send the athlete back to the guide after a save, the pill shows as a fallback, and the ring-close animation plays on return.
- **Files to read:** `components/shared/BackToGameDay.tsx`, `components/nutrition/TodayView.tsx`, `components/exercise/TrackWorkout.tsx`, `components/exercise/PracticeLog.tsx`, the sleep and journal save forms, the guide page.
- **Done when:** the build passes. From the guide, "Log a meal" leads to logging a food, which returns to the guide with the Fuel ring animating closed.

**Not included:** a paywall, reminders or push notifications tied to the guide, coach/parent versions, and a step order personalised by readiness score.

## What I still need from you
Only the go-ahead. Once it's approved, I build Release 1, check it, and ship each release with your usual "apply, commit and push?"
