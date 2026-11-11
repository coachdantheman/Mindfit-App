# Scale checklist: ready for 10,000 users?

Last updated 2026-11-11 (Release 4). Current size: 31 accounts.

## Fixed in code
| Was | Now |
|---|---|
| The Board pulled 60 days of activity for every member on each view (capped at 20,000 rows, scored in the app). Broke near ~300 active athletes. | Each athlete's month score is stored (`leaderboard_scores`, v42). A view rebuilds only the viewer's own score and reads one ranked page from the table. |
| The hourly reminder job loaded everyone's activity per timezone, and silently stopped at 1,000 profiles. | Reads stored scores, pages through every profile, and refreshes only athletes who used the app since their score was saved (up to 4,000 per run). |
| The nav bar's streak ran 13 queries per call. | 2 queries (`get_user_activity_dates`, v42). |
| Every API request made a second trip to the auth server and a role lookup. | Proxy skips API routes; role lookup reused for 30 s (Release 3). |
| Tabs refetched everything on every visit with a blank screen. | Last answer shown at once, refreshed in the background (Release 3). |
| 263 security rules called `auth.uid()` once per row. | Wrapped so it runs once per query (v43). |

## Still open
- **Admin member table and admin coach roster** load every athlete in one request (and stop at 1,000). Only the admin sees these. Needs server paging and search.
- **Duplicate permissive policies** (191 advisor warnings) not merged. Low value: the app server uses the service role, which skips these checks.
- **Coach athlete overview** (`get_coach_athlete_overview`) is fine per coach; the admin "all athletes" call is the slow one.
- **Load test not run.** k6 is not installed, and the only database is production (60 connections). Running 500 virtual users against it would hit real athletes. Options: a paid Supabase branch for an hour, or a test after the compute upgrade at a quiet time.

## Daniel's steps (dashboard, not code)
1. **Supabase compute upgrade** before any big promotion. The current size allows 60 direct connections.
2. **Vercel Pro** for commercial use, longer functions and cron more often than daily.
3. **Uptime monitor** on `/api/health` (free tier of any monitor works).

## Rough capacity after Release 4
- Board view: 4 small queries plus one ranked read (sort of one month's scores; about 10,000 rows at full size).
- Nav bar streak: 5 queries, at most once a minute per athlete.
- Hourly job: reads grow with members (10 pages of 1,000 at 10,000 members), refreshes grow with hourly active athletes.
