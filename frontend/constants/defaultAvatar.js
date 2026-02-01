/**
 * Default avatar configuration
 * Used when user hasn't uploaded a profile picture
 */

// Using a data URI for a simple default avatar SVG
// This ensures it works offline and doesn't require network requests
export const DEFAULT_AVATAR_URI = 'https://ui-avatars.com/api/?name=User&size=400&background=8B5CF6&color=fff&bold=true'

// Alternative: Generate avatar based on user's name
export const getDefaultAvatar = (name = 'User') => {
  // Extract initials from name
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=8B5CF6&color=fff&bold=true`
}

// Check if an avatar URL is the default
export const isDefaultAvatar = (avatarUrl) => {
  if (!avatarUrl) return true
  return avatarUrl.includes('ui-avatars.com')
}
