/** supabase = 官方托管；selfhosted = 腾讯云等自托管 API */
export type BackendMode = 'supabase' | 'selfhosted'

export const backendMode = (import.meta.env.VITE_BACKEND ?? 'supabase') as BackendMode

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const isSelfHosted = backendMode === 'selfhosted'

export const isBackendConfigured = isSelfHosted
  ? Boolean(apiBaseUrl)
  : Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
