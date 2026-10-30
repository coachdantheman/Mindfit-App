'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const AUTH_ERROR_MSG = 'Something went wrong signing you in. Please try again.'
const LINK_EXPIRED_MSG = 'That sign-in link has expired. Create your account or sign in below with the same email.'
const LAST_EMAIL_KEY = 'mf_last_email'

function rememberEmail(email: string) {
  try { localStorage.setItem(LAST_EMAIL_KEY, email.toLowerCase().trim()) } catch {}
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'signup' | 'signin' | 'code'>('signup')
  const [error, setError] = useState(() => {
    const e = searchParams.get('error')
    return e === 'link_expired' ? LINK_EXPIRED_MSG : e ? AUTH_ERROR_MSG : ''
  })
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const needsConsent = mode === 'signup' || mode === 'code'

  // A coach's device may still hold the coach's session. Clear it so an
  // athlete creating an account here never writes into the coach's data.
  // Returning devices open on Sign in with the last email filled in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.auth.signOut()
    })
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY)
      if (last) { setEmail(last); setMode('signin') }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputClass =
    'w-full border border-edge rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 bg-surface-2 text-fg-1 placeholder:text-fg-4'

  const finish = () => {
    rememberEmail(email)
    router.push('/')
    router.refresh()
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (needsConsent && !agreed) { setError('Please accept the Terms and Privacy Policy.'); return }
    setLoading(true)

    const gate = await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const gateData = await gate.json()
    if (!gate.ok) {
      setError(gateData.error)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        shouldCreateUser: gateData.shouldCreateUser,
        emailRedirectTo: `${window.location.origin}/auth/callback?terms=1`,
        data: { terms_accepted_at: new Date().toISOString() },
      },
    })
    if (error) {
      setError('Could not send the code. Please try again in a minute.')
    } else {
      setCodeSent(true)
    }
    setLoading(false)
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      setError('That code is invalid or expired. Try again or resend.')
      setLoading(false)
    } else {
      finish()
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreed) { setError('Please accept the Terms and Privacy Policy.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, termsAccepted: true }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      if (res.status === 409) setMode('signin')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setError('Account created, but sign-in failed. Try signing in.')
      setMode('signin')
      setLoading(false)
    } else {
      finish()
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      finish()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-cta">MindFit</h1>
          <p className="text-fg-4 mt-1">Mental Skills Training</p>
        </div>

        <div className="bg-surface rounded-2xl border border-edge p-6 sm:p-8">
          {!codeSent && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-surface-2 rounded-xl" role="tablist" aria-label="Create account or sign in">
              {(['signup', 'signin'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m || (m === 'signin' && mode === 'code')}
                  onClick={() => { setMode(m); setError('') }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === m || (m === 'signin' && mode === 'code')
                      ? 'bg-surface text-fg-1'
                      : 'text-fg-4 hover:text-fg-2'
                  }`}
                >
                  {m === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              ))}
            </div>
          )}

          {codeSent ? (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-fg-3">
                We sent a 6-digit code to <span className="text-fg-2">{email}</span>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="6-digit code"
                required
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                placeholder="000000"
                autoFocus
              />
              {error && (
                <p role="alert" className="error-box">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? 'Checking…' : 'Sign in'}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setCode(''); setError('') }}
                  className="text-fg-4 hover:text-fg-2"
                >
                  ← Different email
                </button>
                <button
                  type="button"
                  onClick={e => sendCode(e as unknown as React.FormEvent)}
                  className="text-cta hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            <>
              {mode === 'signup' && (
                <p className="text-sm text-fg-3 mb-4">
                  Invited by your coach? Create your account with the email the invite went to.
                </p>
              )}

              <form
                onSubmit={mode === 'signup' ? handleSignup : mode === 'signin' ? handlePasswordLogin : sendCode}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-fg-2 mb-1">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>

                {mode !== 'code' && (
                  <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-fg-2 mb-1">Password</label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={mode === 'signup' ? 8 : undefined}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={`${inputClass} pr-16`}
                        placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-3 text-xs font-medium text-fg-4 hover:text-fg-2"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                )}

                {needsConsent && (
                  <label className="flex items-start gap-2 text-sm text-fg-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-edge bg-surface-2 accent-[#C4B400]"
                    />
                    <span>
                      I agree to the{' '}
                      <Link href="/terms" className="text-cta hover:underline" target="_blank">Terms of Service</Link> and{' '}
                      <Link href="/privacy" className="text-cta hover:underline" target="_blank">Privacy Policy</Link>.
                    </span>
                  </label>
                )}

                {error && (
                  <p role="alert" className="error-box">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading
                    ? 'One moment…'
                    : mode === 'signup'
                      ? 'Create account'
                      : mode === 'signin'
                        ? 'Sign in'
                        : 'Email me a sign-in code'}
                </button>
              </form>

              {mode !== 'signup' && (
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'code' ? 'signin' : 'code'); setError('') }}
                  className="block w-full text-center text-sm text-fg-4 hover:text-fg-2 mt-4"
                >
                  {mode === 'code' ? 'Use password instead' : 'Forgot password? Email me a code'}
                </button>
              )}

              <p className="text-center text-sm text-fg-4 mt-6">
                Part of the{' '}
                <a
                  href="https://www.skool.com/mindfit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cta hover:underline"
                >
                  MindFit Skool community
                </a>
                ? Use your Skool email and your coach is linked automatically.
              </p>
              <p className="text-center text-xs text-fg-4 mt-4">
                <Link href="/terms" className="hover:text-fg-2">Terms</Link> · <Link href="/privacy" className="hover:text-fg-2">Privacy</Link> · <Link href="/cookies" className="hover:text-fg-2">Cookies</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
