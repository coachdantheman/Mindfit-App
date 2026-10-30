'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import DailyQuoteToggle from '@/components/shared/DailyQuoteToggle'
import SharingCard from '@/components/settings/SharingCard'
import DeleteAccountCard from '@/components/settings/DeleteAccountCard'
import Link from 'next/link'
import type { UserRole } from '@/types'

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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f5f5f4' : '#0A0F1A')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const StatusLine = ({ s }: { s: Status }) => s ? (
    <p role="status" className={`text-sm ${s.ok ? 'text-green-400' : 'text-red-400'}`}>{s.msg}</p>
  ) : null

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Account */}
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">Account</h3>
          <p className="text-sm text-fg-3 mb-4 break-all">{email}</p>

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
        </div>

        {/* Sports */}
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-1 text-sm">Sports</h3>
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

        <SharingCard role={role} />

        {/* Notifications */}
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-4 text-sm">Notifications</h3>
          <DailyQuoteToggle />
        </div>

        {/* Appearance */}
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

        {/* Community */}
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

        {/* Legal */}
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-3 text-sm">About</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/terms" className="text-cta hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="text-cta hover:underline">Privacy Policy</Link>
            <Link href="/cookies" className="text-cta hover:underline">Cookie Policy</Link>
          </div>
        </div>

        <DeleteAccountCard />
      </div>
    </div>
  )
}
