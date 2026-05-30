/**
 * Guard QA seed/cleanup scripts to the local fitness database only.
 */

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1'])

/**
 * @param {string} databaseUrl
 * @returns {void}
 */
export function assertLocalFitnessDatabase(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('DATABASE_URL is required')
  }

  let parsed
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error(`Invalid DATABASE_URL: ${databaseUrl}`)
  }

  const host = parsed.hostname
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      `DATABASE_URL host must be localhost or 127.0.0.1 (got "${host}")`,
    )
  }

  const dbName =
    parsed.pathname.replace(/^\//, '').split('/')[0] ||
    parsed.searchParams.get('database') ||
    ''

  if (dbName !== 'fitness') {
    throw new Error(
      `DATABASE_URL database must be "fitness" (got "${dbName || '(empty)'}")`,
    )
  }
}
