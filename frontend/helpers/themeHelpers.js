/**
 * Theme Helper Functions
 * Utility functions to abstract color logic and component styling
 */

/**
 * Get event color based on event type and visibility
 * @param {Object} event - Event object with visibility, org_id, type, and optional color
 * @param {Object} theme - Theme object from useAppTheme()
 * @returns {string} Color hex code
 */
export const getEventColor = (event, theme) => {
  // If event has custom color, use it
  if (event.color) return event.color
  
  // Personal events - Purple
  if (!event.org_id && event.visibility === 'invite_only') {
    return theme.eventColors.personal
  }
  
  // Org events - Green
  if (event.visibility === 'org_only' && event.org_id) {
    return theme.eventColors.org
  }
  
  // Campus/School events - Blue
  if (event.visibility === 'school') {
    return theme.eventColors.campus
  }
  
  // Public events - Orange
  if (event.visibility === 'public') {
    return theme.eventColors.public
  }
  
  // Tasks - Gray
  if (event.type === 'task') {
    return theme.eventColors.task
  }
  
  // Default - Purple
  return theme.eventColors.personal
}

/**
 * Get event type label
 * @param {Object} event - Event object
 * @returns {string} Event type label
 */
export const getEventTypeLabel = (event) => {
  if (!event.org_id && event.visibility === 'invite_only') return 'Personal'
  if (event.visibility === 'org_only' && event.org_id) return 'Org'
  if (event.visibility === 'school') return 'Campus'
  if (event.visibility === 'public') return 'Public'
  return 'Event'
}

/**
 * Get tag color for forum post tags (QUESTION, CONFESSION, etc.)
 * @param {string} tag - Tag name
 * @param {Object} theme - Theme object from useAppTheme()
 * @returns {string} Color hex code
 */
export const getTagColor = (tag, theme) => {
  return theme.tagColors[tag] || theme.colors.bondedPurple
}

/**
 * Get forum category tag colors (Housing, STEM, etc.)
 * Returns object with bg, text, and border colors
 * @param {string} tag - Tag name
 * @param {Object} theme - Theme object from useAppTheme()
 * @returns {Object} { bg, text, border } color object
 */
export const getForumTagColors = (tag, theme) => {
  const tagColor = theme.tagColors[tag]
  if (tagColor && typeof tagColor === 'object') {
    return tagColor
  }
  // Default fallback
  return {
    bg: theme.colors.backgroundSecondary,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
  }
}

/**
 * Get component variant styles
 * @param {string} variant - Variant name (e.g., 'primary', 'secondary')
 * @param {string} componentType - Component type ('button', 'card', 'input')
 * @param {Object} theme - Theme object from useAppTheme()
 * @returns {Object} Style object
 */
export const getComponentStyles = (variant, componentType, theme) => {
  const variants = {
    button: theme.buttonVariants,
    card: theme.cardVariants,
    input: theme.inputVariants,
  }
  
  const componentVariants = variants[componentType]
  if (!componentVariants) {
    console.warn(`Component type "${componentType}" not found`)
    return {}
  }
  
  const variantStyle = componentVariants[variant]
  if (!variantStyle) {
    console.warn(`Variant "${variant}" not found for component type "${componentType}"`)
    return componentVariants.default || {}
  }
  
  return variantStyle
}

/**
 * Get status color
 * @param {string} status - Status type ('success', 'error', 'warning', 'info')
 * @param {Object} theme - Theme object from useAppTheme()
 * @returns {string} Color hex code
 */
export const getStatusColor = (status, theme) => {
  return theme.statusColors[status] || theme.colors.textSecondary
}


