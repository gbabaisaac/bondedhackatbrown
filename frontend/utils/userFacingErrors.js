export const getFriendlyErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback

  const raw = typeof error === 'string' ? error : error?.message || ''
  const message = raw.toLowerCase()

  if (!message) return fallback
  if (message.includes('network request failed') || message.includes('timeout') || message.includes('timed out') || message.includes('fetch') || message.includes('connection')) {
    return 'Connection issue. Please check your internet and try again.'
  }
  if (message.includes('permission') || message.includes('not authorized') || message.includes('not allowed') || message.includes('jwt')) {
    return 'You do not have permission to do that.'
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a bit and try again.'
  }
  if (message.includes('not found')) {
    return 'That item could not be found.'
  }

  return fallback
}
