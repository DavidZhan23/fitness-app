/** 自托管 API 根地址（开发 .env.local / 生产构建时注入） */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const isBackendConfigured = Boolean(apiBaseUrl)
