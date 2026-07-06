'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NO_ACCESS_MSG =
  "This account doesn't have access yet. Join the MindFit community on Skool or contact your coach."

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    searchParams.get('error') === 'no_access' ? NO_ACCESS_MSG : ''
  )
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const inputClass =
    'w-full border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-800 text-gray-100 placeholder:text-gray-500'

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
      options: { shouldCreateUser: gateData.shouldCreateUser },
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mindfit-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-cta">MindFit</h1>
          <p className="text-gray-500 mt-1">Mental Skills Training</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-white/10 p-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-100">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use the email you joined the MindFit community with.
          </p>

          {codeSent ? (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-gray-400">
                We sent a 6-digit code to <span className="text-gray-200">{email}</span>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                placeholder="000000"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm bg-red-900/30 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? 'Checking…' : 'Sign in'}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setCode(''); setError('') }}
                  className="text-gray-500 hover:text-gray-300"
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
              <form onSubmit={showPassword ? handlePasswordLogin : sendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>

                {showPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm bg-red-900/30 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading
                    ? 'One moment…'
                    : showPassword
                      ? 'Sign in with password'
                      : 'Email me a sign-in code'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setShowPassword(!showPassword); setError('') }}
                className="block w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-4"
              >
                {showPassword ? 'Use a sign-in code instead' : 'Use password instead'}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-6">
                New here? Join the community at{' '}
                <a
                  href="https://www.skool.com/mindfit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cta hover:underline"
                >
                  skool.com/mindfit
                </a>{' '}
                and access is automatic.
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
