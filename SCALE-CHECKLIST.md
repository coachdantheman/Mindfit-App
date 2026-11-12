# Scale checklist: ready for 10,000 users?

Last updated 2026-11-11 (Scale release, v46). Current size: 31 accounts.

## Fixed in code
| Was | Now |
|---|---|
| The Board pulled 60 days of activity for every member on each view (capped at 20,000 rows, scored in the app). Broke near ~300 active athletes. | Each athlete's month score is stored (`leaderboard_scores`, v42). A view rebuilds only the viewer's own score and reads one ranked page from the table. |
| The hourly reminder job loaded everyone's activity per timezone, and silently stopped at 1,000 profiles. | Reads stored scores, pages through every profile, and refreshes only athletes who used the app since their score was saved (up to 4,000 per run). |
| The nav bar's streak ran 13 queries per call. | 2 queries (`get_user_activity_dates`, v42). |
| Every API request made a second trip to the auth server and a role lookup. | Proxy skips API routes; role lookup reused for 30 s (Release 3). |
| Tabs refetched everything on every visit with a blank screen. | Last answer shown at once, refreshed in the background (Release 3). |
| 263 security rules called `auth.uid()` once per row. | Wrapped so it runs once per query (v43). |
| The reminder job sent 10 messages at a time with about 5 database calls each. Near 10,000 athletes it would hit the 300-second limit and the rest were lost. | Messages go into `notification_queue` (v46) and are sent 50 at a time with a fixed handful of calls per batch (`notifyMany`). A run that runs out of time, or hits a database error, leaves the rest for the catch-up run at half past each hour. Messages still waiting after 3 hours are dropped so a reminder never arrives overnight. |
| The daily quote read only the first 1,000 push subscriptions and had 60 seconds. | Reads every subscription, 300 seconds, reports how many it did not reach. |
| The Board rebuilt the viewer's score on every view and every page tap. | At most once per 15 seconds per athlete, checked in the database so it holds across servers. |
| Admin coach roster, coach roster, team lists and several coach routes stopped at 1,000 rows, or put every athlete id in the request address (failed around 400 ids). | Read in full with `fetchAll`; id lists split into groups of 100 (`lib/fetch-all.ts`). |
| No index for lookups by email, role, name, quiz date, game date, or for the hourly log cleanup. | Added in v46. |
| No error monitoring. | Sentry (off until `NEXT_PUBLIC_SENTRY_DSN` is set), Vercel Analytics and Speed Insights. Database errors and page crashes are reported. No names, emails or screen recordings are sent. |

## Known limits
- **A reminder run killed mid-batch can drop that one batch** (up to 50 messages). A message is logged as sent just before it goes out. It can never send twice.
- **If the job cannot read who opted out, it sends nothing that round.** Safer than messaging people who turned notifications off.
- **USDA food search** allows 1,000 searches an hour on the free key. Revisit near 5,000 active athletes.

## Still open
- **The Board at 100,000.** `leaderboard_page` still sorts the whole month on each view (twice: this month and last). Fine at 10,000. Weekly leagues of about 30 (Premium release) remove the problem; otherwise store a rank column refreshed every few minutes.
- **Progress page** makes about 12 calls per visit. One summary call would cut database load.
- **Admin athlete table** now loads completely but still in one request, with search and paging done in the browser. Move to server paging near 5,000 athletes.
- **Account export** reads each table without paging; an athlete with over 1,000 rows in one table gets a short export.
- **Food list** (about 1,500 rows) still downloads to the phone for search.
- **Inbox notifications** are never pruned. Decide a retention period (for example, read items older than 6 months).
- **Duplicate permissive policies** (191 advisor warnings) not merged. Low value: the app server uses the service role, which skips these checks.
- **Load test not run.** The only database is production (60 connections). Options: a paid Supabase branch for an hour, or a test after the compute upgrade at a quiet time.
- **51 scheduled jobs** in `vercel.json` (24 reminder runs, 24 catch-up runs, 3 others). On the Hobby plan each fires somewhere inside its hour.

## Daniel's steps (dashboard, not code)
| When | Step |
|---|---|
| Now (free) | Sentry account, then `NEXT_PUBLIC_SENTRY_DSN` in Vercel. Turn on Web Analytics and Speed Insights in the Vercel project. Uptime monitor on `/api/health`. |
| Before any paid promotion | Vercel Pro (commercial use, crons that fire on time). |
| About 1,000 active athletes | Supabase compute one size up, then run the load test. |
| About 25,000 | Next compute size; a read replica if the Board or Progress is slow. |
| 100,000+ | Supabase bills about $0.00325 per monthly user above 100,000 on Pro. |

## Rough capacity now
- Reminder run at 10,000 athletes: about 200 batches of 50. Whatever does not fit in 220 seconds goes out in the catch-up run 30 minutes later.
- Board view: 4 small queries plus one ranked read (a sort of one month's scores; about 10,000 rows at full size).
- Nav bar streak: 5 queries, at most once a minute per athlete.
