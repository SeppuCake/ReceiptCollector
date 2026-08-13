import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const cloudConfigured = Boolean(url && publishableKey)

export const supabase: SupabaseClient | undefined = cloudConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : undefined

