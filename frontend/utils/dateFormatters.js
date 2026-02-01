/**
 * Centralized date and time formatting utilities
 * Consolidates all date/time formatting functions across the codebase
 */

/**
 * Format date and time together (e.g., "Mon, Jan 15, 2:30 PM")
 */
export function formatDateTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format date only (e.g., "Mon, Jan 15" or "Today", "Tomorrow")
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return `${dayName}, ${monthDay}`
  }
}

/**
 * Format short date (e.g., "Jan 15")
 */
export function formatDateShort(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format time only (e.g., "2:30pm")
 */
export function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase().replace(/\s/g, '')
}

/**
 * Format time for display in forms (e.g., "2:30 PM")
 */
export function formatTimeForDisplay(timeString) {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format message list timestamp (e.g., "Jan 27, 3:22 PM" or "Jan 27, 2024, 3:22 PM")
 */
export function formatMessageListTimestamp(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format relative time for message list (e.g., "10 min ago", "1 hour ago", "2 days ago")
 * Falls back to "Mon DD" (and year if not current year) after 7 days.
 */
export function formatRelativeMessageTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * Format relative time ago (e.g., "5m", "2h", "3d", "Just now")
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format timestamp for messages/chat (e.g., "5m", "2h", "3d")
 * Similar to formatTimeAgo but with weeks/months support
 */
export function formatTimestamp(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  // Less than 1 minute
  if (diff < 60 * 1000) return 'Just now'
  // Less than 1 hour
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m`
  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h`
  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d`
  // Else show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Extended time ago with weeks and months (e.g., "2w", "3mo")
 */
export function getTimeAgo(dateString) {
  if (!dateString) return 'Just now'

  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks}w`

  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo`
}
