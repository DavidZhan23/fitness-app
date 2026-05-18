import { apiBaseUrl } from '../config'

const TOKEN_KEY = 'fitness_auth_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  } catch {
    throw new Error('无法连接服务器，请检查网络后重试')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 502 || res.status === 503) {
      throw new Error('服务暂时不可用，请稍后重试（若持续出现请重启服务器 API）')
    }
    throw new Error(data.error || res.statusText || '请求失败')
  }
  return data as T
}
