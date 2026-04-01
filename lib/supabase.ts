import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client — safe to use in 'use client' components
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
