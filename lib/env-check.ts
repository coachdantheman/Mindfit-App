// Server env vars with no fallback. Without them sign-in, the database or the cron jobs break.
const REQUIRED_SERVER_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
] as const

export function missingServerEnv(): string[] {
  return REQUIRED_SERVER_ENV.filter(name => !process.env[name])
}
