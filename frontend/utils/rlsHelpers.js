/**
 * RLS (Row Level Security) error handling utilities
 * Consolidates RLS recursion error detection and logging across the codebase
 */

/**
 * Check if an error is an RLS recursion error
 * RLS recursion errors occur when policies reference the same table in subqueries
 * Error codes: 42P17 (infinite recursion), 54001 (stack depth exceeded)
 */
export function isRlsRecursionError(error) {
  return (
    error?.code === '42P17' ||
    error?.code === '54001' ||
    error?.message?.toLowerCase()?.includes('infinite recursion') ||
    error?.message?.toLowerCase()?.includes('stack depth')
  )
}

/**
 * Log a helpful hint about fixing RLS recursion errors
 * @param {string} table - The table name that has the RLS issue
 */
export function logRlsFixHint(table = 'profiles') {
  console.warn(
    `⚠️ RLS recursion error detected on ${table} table. ` +
    `This is a database policy issue. See database/fix-all-rls-recursion.sql for fixes.`
  )
}

/**
 * Check if an error is a network error (timeout, connection issues)
 */
export function isNetworkError(error) {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  return (
    error?.code === 'PGRST301' || // Connection timeout
    error?.code === 'PGRST302' || // Connection error
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('upstream connect error') ||
    message.includes('connection termination') ||
    message.includes('connection timeout') ||
    message.includes('disconnect/reset') ||
    message === '' || // Empty error message often indicates network failure
    error?.code === 'ENOTFOUND'
  )
}
