import { createClient } from '@supabase/supabase-js'

/** Project URL only — no /rest/v1/ suffix (common copy-paste mistake). */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as ReturnType<typeof createClient>)
