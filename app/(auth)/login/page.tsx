'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const AUTH_ERROR_MSG = 'Something went wrong signing you in. Please try again.'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin' | 'code'>('signup')
  const [error, setError] = useState(searchParams.get('error') ? AUTH_ERROR_MSG : '')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const needsConsent = mode === 'signup' || mode === 'code'

  // A coach's device may still hold the coach's session. Clear it so an
  // athlete creating an account here never writes into the coach's data.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.auth.signOut()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputClass =
    'w-full border border-edge rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 bg-surface-2 text-fg-1 placeholder:text-fg-4'

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
      router.push('/')
      router.refresh()
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
      router.push('/')
      router.refresh()
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
      router.push('/')
      router.refresh()
    }
  }

  const handleGoogle = async () => {
    if (mode === 'signup' && !agreed) { setError('Please accept the Terms and Privacy Policy.'); return }
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback${agreed ? '?terms=1' : ''}` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-cta">MindFit</h1>
          <p className="text-fg-4 mt-1">Mental Skills Training</p>
        </div>

        <div className="bg-surface rounded-2xl border border-edge p-8">
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
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                    />
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

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-edge" />
                <span className="text-xs text-fg-4">or</span>
                <div className="flex-1 h-px bg-edge" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-edge rounded-xl px-4 py-3 text-sm font-medium text-fg-2 hover:bg-surface-2 transition-colors disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

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
