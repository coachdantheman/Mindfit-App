'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { clearAllDrafts } from '@/lib/useDraft'
import { useEffect, useState } from 'react'
import DailyQuoteToggle from '@/components/shared/DailyQuoteToggle'
import NotificationSettings from '@/components/settings/NotificationSettings'
import SharingCard from '@/components/settings/SharingCard'
import LeaderboardCard from '@/components/settings/LeaderboardCard'
import AiFeaturesCard from '@/components/settings/AiFeaturesCard'
import DeleteAccountCard from '@/components/settings/DeleteAccountCard'
import Link from 'next/link'
import type { UserRole } from '@/types'
import { saveUnits, useUnits } from '@/lib/units'

type Status = { ok: boolean; msg: string } | null

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [fullName, setFullName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameStatus, setNameStatus] = useState<Status>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwStatus, setPwStatus] = useState<Status>(null)
  const [primarySport, setPrimarySport] = useState('')
  const [secondarySport, setSecondarySport] = useState('')
  const [nextGame, setNextGame] = useState('')
  const [nextGameTime, setNextGameTime] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [sportsSaving, setSportsSaving] = useState(false)
  const [sportsStatus, setSportsStatus] = useState<Status>(null)
  const units = useUnits()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
    const saved = localStorage.getItem('theme')
    if (saved === 'light') setTheme('light')
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (p) {
          setRole(p.role ?? 'member')
          setFullName(p.full_name ?? '')
          setPrimarySport(p.primary_sport ?? '')
          setSecondarySport(p.secondary_sport ?? '')
          setNextGame(p.next_competition_at?.slice(0, 10) ?? '')
          setNextGameTime(p.next_competition_time?.slice(0, 5) ?? '')
        }
        setProfileLoaded(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patchProfile = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || `Save failed (${res.status})`)
    }
  }

  const saveName = async () => {
    setNameSaving(true)
    setNameStatus(null)
    try {
      await patchProfile({ full_name: fullName })
      setNameStatus({ ok: true, msg: 'Saved' })
      router.refresh()
    } catch (e: any) {
      setNameStatus({ ok: false, msg: e?.message || 'Could not save. Try again.' })
    } finally {
      setNameSaving(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwSaving(true)
    setPwStatus(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwStatus({ ok: false, msg: error.message }); return }
    setNewPassword('')
    setPwStatus({ ok: true, msg: 'Password set. Use it next time you sign in.' })
  }

  const saveSports = async () => {
    setSportsSaving(true)
    setSportsStatus(null)
    try {
      await patchProfile({
        primary_sport: primarySport,
        secondary_sport: secondarySport,
        next_competition_at: nextGame || null,
        next_competition_time: nextGameTime || null,
      })
      setSportsStatus({ ok: true, msg: 'Saved' })
    } catch (e: any) {
      setSportsStatus({ ok: false, msg: e?.message || 'Could not save. Try again.' })
    } finally {
      setSportsSaving(false)
    }
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#F1F0EE' : '#0A0F1A')
  }

  const signOut = async () => {
    clearAllDrafts(); await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const StatusLine = ({ s }: { s: Status }) => s ? (
    <p role="status" className={`text-sm ${s.ok ? 'text-green-400' : 'text-red-400'}`}>{s.msg}</p>
  ) : null

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Profile */}
        <Section id="profile" title="Profile">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-full bg-cta/15 border border-cta/40 text-cta font-semibold flex items-center justify-center uppercase">
                {(fullName || email || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-fg-1 truncate">{fullName || 'Your name'}</p>
                <p className="text-sm text-fg-4 truncate">{email}</p>
              </div>
            </div>
            <div className="space-y-4">
            <div>
              <label htmlFor="settings-name" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Name</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="settings-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                  disabled={!profileLoaded}
                />
                <button onClick={saveName} disabled={!profileLoaded || nameSaving} className="btn-secondary sm:shrink-0">
                  {nameSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <StatusLine s={nameStatus} />
            </div>

            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-fg-1 mb-1 text-sm">Sports and next game</h3>
            <p className="text-sm text-fg-4 mb-4">
              Used to autofill your Flow State sessions and logs. Your next game date drives the game-day fueling plan in Nutrition.
            </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="settings-primary-sport" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Primary sport</label>
              <input id="settings-primary-sport"
                type="text"
                value={primarySport}
                onChange={e => setPrimarySport(e.target.value)}
                placeholder="e.g. Football"
                className="input-field"
                disabled={!profileLoaded}
              />
            </div>
            <div>
              <label htmlFor="settings-secondary-sport" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">
                Secondary sport <span className="text-fg-4">(optional)</span>
              </label>
              <input
                id="settings-secondary-sport"
                type="text"
                value={secondarySport}
                onChange={e => setSecondarySport(e.target.value)}
                placeholder="e.g. Track"
                className="input-field"
                disabled={!profileLoaded}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-next-game" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Next game or match</label>
                <input
                  id="settings-next-game"
                  type="date"
                  value={nextGame}
                  onChange={e => setNextGame(e.target.value)}
                  className="input-field"
                  disabled={!profileLoaded}
                />
              </div>
              <div>
                <label htmlFor="settings-next-game-time" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Start time</label>
                <input
                  id="settings-next-game-time"
                  type="time"
                  value={nextGameTime}
                  onChange={e => setNextGameTime(e.target.value)}
                  className="input-field"
                  disabled={!profileLoaded}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveSports}
                disabled={!profileLoaded || sportsSaving}
                className="btn-primary"
              >
                {sportsSaving ? 'Saving…' : 'Save'}
              </button>
              <StatusLine s={sportsStatus} />
            </div>
          </div>
          </div>
        </Section>

        <Section id="people" title="My people">
          <SharingCard role={role} />
        </Section>

        <Section id="notifications" title="Notifications">
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-4 text-sm">Notifications</h3>
          <DailyQuoteToggle />
          <div className="mt-6 pt-6 border-t border-edge-muted">
            <NotificationSettings />
          </div>
        </div>

        </Section>

        <Section id="board" title="Board and privacy">
          {role !== 'parent' && <LeaderboardCard />}
          <AiFeaturesCard />
        </Section>

        <Section id="appearance" title="Appearance">
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">Appearance</h3>
          <p className="text-sm text-fg-4 mb-4">Switch between dark and light mode.</p>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 bg-surface-2/60 hover:bg-surface-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
            <span className="text-fg-2">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">Units</h3>
          <p className="text-sm text-fg-4 mb-4">Weight, height and distance across workouts, nutrition and progress.</p>
          <div role="radiogroup" aria-label="Units" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2/60">
            {([['imperial', 'Imperial (lb, mi)'], ['metric', 'Metric (kg, km)']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={units === key}
                onClick={() => { void saveUnits(key) }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${units === key ? 'bg-cta/15 text-cta' : 'text-fg-3 hover:text-fg-1'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        </Section>

        <div className="web-only">
          <Section id="community" title="Community">
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">MindFit Community</h3>
          <p className="text-sm text-fg-4 mb-4">Connect with other athletes, access courses, and get coached.</p>
          <a
            href="https://www.skool.com/mindfit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cta/20 text-cta border border-cta/30 hover:bg-cta/30 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Open Skool Community →
          </a>
        </div>

          </Section>
        </div>

        <Section id="help" title="Help and legal">
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">Help &amp; safety</h3>
          <p className="text-sm text-fg-4 mb-3">
            MindFit trains mental skills. It is not medical care or therapy. If you&rsquo;re carrying a lot, talk to an adult you trust,
            or call or text <a href="tel:988" className="text-cta hover:underline">988</a> any time in the US. Free and confidential.
          </p>
          <Link href="/support" className="text-sm text-cta hover:underline">Get help or contact support →</Link>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-3 text-sm">About</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/support" className="text-cta hover:underline">Support</Link>
            <Link href="/terms" className="text-cta hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="text-cta hover:underline">Privacy Policy</Link>
            <Link href="/cookies" className="text-cta hover:underline">Cookie Policy</Link>
          </div>
        </div>

        </Section>

        <Section id="account" title="Account">
          <div className="card p-5 space-y-4">
            <form onSubmit={savePassword}>
              <label htmlFor="settings-password" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Set or change password</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="settings-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input-field"
                />
                <button type="submit" disabled={pwSaving || newPassword.length < 8} className="btn-secondary sm:shrink-0">
                  {pwSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-fg-4 mt-1">Signed in from an invite link? Set a password here so you can sign in next time.</p>
              <StatusLine s={pwStatus} />
            </form>

            <button
              onClick={signOut}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-400/20 hover:border-red-400/40 px-4 py-2 rounded-xl"
            >
              Sign out
            </button>
          </div>
          <DeleteAccountCard />
        </Section>
      </div>
    </div>
  )
}

const OPEN_KEY = 'mf-settings-open'

const ICON_PATHS: Record<string, React.ReactNode> = {
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.2c2 .9 3 2.9 3 5.8" /></>,
  notifications: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 004 0" /></>,
  board: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" />,
  appearance: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  community: <path d="M4 5h16v11H9l-5 4z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2" /><path d="M12 17v.01" /></>,
  account: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></>,
}

function readOpen(): Record<string, boolean> {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}')
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(id === 'profile')
  useEffect(() => {
    const saved = readOpen()
    if (typeof saved[id] === 'boolean') setOpen(saved[id])
  }, [id])

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [id]: next }))
    } catch {}
  }

  return (
    <section className="space-y-3">
      <h2>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`settings-${id}`}
          className="w-full flex items-center gap-2.5 px-1 py-1 text-[11px] uppercase tracking-[0.22em] text-cta font-semibold text-left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-cta shrink-0" aria-hidden="true">
            {ICON_PATHS[id]}
          </svg>
          <span className="flex-1">{title}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={`text-fg-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div id={`settings-${id}`} aria-hidden={!open} inert={!open} className="min-h-0 overflow-hidden">
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </section>
  )
}
