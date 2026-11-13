'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import CodeInput from '@/components/onboarding/CodeInput'

const AUTH_ERROR_MSG = 'Something went wrong signing you in. Please try again.'
const LINK_EXPIRED_MSG = 'That sign-in link has expired. Sign in below with the same email.'
const LAST_EMAIL_KEY = 'mf_last_email'

function rememberEmail(email: string) {
  try { localStorage.setItem(LAST_EMAIL_KEY, email.toLowerCase().trim()) } catch {}
}

// signin: email + password. code: emailed 6-digit code (also "forgot
// password"). signup: parents and coaches; athletes start at /start.
type Mode = 'signin' | 'code' | 'signup'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [returning, setReturning] = useState(false)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<Mode>(() => searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [error, setError] = useState(() => {
    const e = searchParams.get('error')
    return e === 'link_expired' ? LINK_EXPIRED_MSG : e ? AUTH_ERROR_MSG : ''
  })
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // A coach's device may still hold the coach's session. Clear it so an
  // athlete signing in here never writes into the coach's data.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.auth.signOut()
    })
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY)
      if (last) { setEmail(last); setReturning(true) }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const switchMode = (m: Mode) => { setMode(m); setError(''); setCodeSent(false); setCode('') }

  const finish = () => {
    rememberEmail(email)
    router.push('/')
    router.refresh()
  }

  const sendCode = async () => {
    setError('')
    if (!agreed) { setError('Please accept the Terms and Privacy Policy.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || AUTH_ERROR_MSG); return }
    setCodeSent(true)
    setResendIn(30)
  }

  const verifyCode = async (token: string) => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token,
      type: 'email',
    })
    if (error) {
      setError('That code didn’t work. Check it or send a new one.')
      setCode('')
      setLoading(false)
      return
    }
    if (mode === 'signup' && password) {
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) console.error('Password not saved:', pwError.message)
    }
    finish()
  }

  const handleSignup = async () => {
    setError('')
    if (password.length < 8 || password.length > 72) { setError('Your password needs at least 8 characters.'); return }
    if (!agreed) { setError('Please accept the Terms and Privacy Policy.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, termsAccepted: true }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || AUTH_ERROR_MSG); return }
    setCodeSent(true)
    setResendIn(30)
  }

  const handlePasswordLogin = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setError('That email and password don’t match. Try again, or sign in with a code.')
      setLoading(false)
    } else {
      finish()
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') handlePasswordLogin()
    else if (mode === 'code') sendCode()
    else handleSignup()
  }

  const heading = codeSent
    ? 'Check your email'
    : mode === 'signup'
      ? 'Create a parent or coach account'
      : mode === 'code'
        ? 'Sign in with a code'
        : returning ? 'Welcome back' : 'Sign in'

  return (
    <div className="min-h-[100dvh] bg-page flex flex-col pt-safe pb-safe">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgb(var(--cta-rgb)/0.10),transparent_60%)]" />
      <main key={`${mode}-${codeSent}`} className="relative flex-1 w-full max-w-md mx-auto px-6 flex flex-col mf-rise">
        <Link href="/" className="mt-12 text-center font-display tracking-[0.4em] text-cta text-sm">MINDFIT</Link>

        <div className="mt-10 mb-8 text-center">
          <h1 className="font-display text-[1.9rem] leading-tight text-fg-1">{heading}</h1>
          <p className="text-sm text-fg-3 mt-2">
            {codeSent
              ? `We sent a 6-digit code to ${email}.`
              : mode === 'signup'
                ? 'Invited by a coach? Use the email the invite went to.'
                : mode === 'code'
                  ? 'We’ll email you a 6-digit code. No password needed.'
                  : 'Train the game in your head.'}
          </p>
        </div>

        {codeSent ? (
          <div className="space-y-5">
            <CodeInput value={code} onChange={setCode} onComplete={verifyCode} disabled={loading} />
            {loading && <p className="text-center text-sm text-fg-3">Signing you in…</p>}
            {error && <p role="alert" className="error-box">{error}</p>}
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError('') }} className="text-fg-4 hover:text-fg-2">
                Different email
              </button>
              <button
                type="button"
                disabled={resendIn > 0}
                onClick={() => (mode === 'signup' ? handleSignup() : sendCode())}
                className="text-cta disabled:text-fg-4"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-label="Email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field h-14"
              placeholder="Email"
            />

            {mode !== 'code' && (
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Password"
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  autoFocus={returning && mode === 'signin'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field h-14 pr-16"
                  placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-4 text-xs font-medium text-fg-4 hover:text-fg-2"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('code')} className="text-sm text-fg-3 hover:text-fg-1 py-1">
                  Forgot password?
                </button>
              </div>
            )}

            {mode !== 'signin' && (
              <label className="flex items-start gap-3 text-sm text-fg-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-edge bg-surface-2 accent-cta"
                />
                <span>
                  I agree to the <Link href="/terms" className="text-cta hover:underline" target="_blank">Terms</Link> and{' '}
                  <Link href="/privacy" className="text-cta hover:underline" target="_blank">Privacy Policy</Link>.
                </span>
              </label>
            )}

            {error && <p role="alert" className="error-box">{error}</p>}

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'code' ? 'Email me a code' : 'Create account'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => switchMode(mode === 'signin' ? 'code' : 'signin')}
              className="block w-full text-center text-sm text-fg-3 hover:text-fg-1 py-2"
            >
              {mode === 'signin' ? 'Email me a code instead' : 'Sign in with a password'}
            </button>
          </form>
        )}

        {!codeSent && (
          <div className="pt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-fg-4">
              <span className="h-px flex-1 bg-edge" />New to MindFit?<span className="h-px flex-1 bg-edge" />
            </div>
            <Link
              href="/start"
              className="flex flex-col items-center justify-center w-full h-14 rounded-full border border-cta text-cta font-semibold tracking-wide hover:bg-cta/10 transition-colors"
            >
              Create a free athlete account
            </Link>
            <p className="text-xs text-center text-fg-4">Takes 2 minutes and starts with your free MPI score.</p>
            {mode !== 'signup' ? (
              <button type="button" onClick={() => switchMode('signup')} className="block w-full text-center text-sm text-fg-3 hover:text-fg-1 py-2">
                Parent or coach? <span className="text-cta font-semibold">Create your account</span>
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('signin')} className="block w-full text-center text-sm text-fg-3 hover:text-fg-1 py-2">
                Already have an account? <span className="text-cta font-semibold">Sign in</span>
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {!codeSent && (
          <div className="pb-8 pt-8 space-y-3 text-center">
            <div className="h-px bg-edge" />
            <p className="web-only text-xs text-fg-4 pt-2">
              In the <a href="https://www.skool.com/mindfit" target="_blank" rel="noopener noreferrer" className="text-cta hover:underline">MindFit Skool community</a>? Use your Skool email and your coach is linked automatically.
            </p>
            <p className="text-xs text-fg-4">
              <Link href="/terms" className="hover:text-fg-2">Terms</Link> · <Link href="/privacy" className="hover:text-fg-2">Privacy</Link> · <Link href="/support" className="hover:text-fg-2">Support</Link>
            </p>
          </div>
        )}
      </main>
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
