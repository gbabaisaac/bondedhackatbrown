/**
 * Feature Gates
 * 
 * Controls which features are enabled/disabled in the app.
 * Features can be gated for various reasons:
 * - Not ready for production
 * - Beta testing
 * - Gradual rollout
 * - Maintenance
 * 
 * To enable a feature, set its value to true.
 * To disable a feature, set its value to false.
 */

export const FEATURE_GATES = {
  // Link AI - AI-powered conversation assistant
  LINK_AI: false,
  
  // Rate My Professor - Professor rating and review system
  RATE_MY_PROFESSOR: false,
  
  // Paid Events - Event ticketing and payment system
  PAID_EVENTS: false,

  // Circles - live rooms (backend pending)
  CIRCLES: false,

  // School discovery/search (placeholder UI)
  BROWSE_SCHOOLS: false,
  SEARCH_FORUMS: false,
  
  // Onboarding Steps - Gated for future expansion
  ONBOARDING_STUDY_HABITS: false,    // Study habits step (gated)
  ONBOARDING_LIVING_HABITS: false,    // Living habits step (gated)
  ONBOARDING_PERSONALITY: false,      // Personality step (gated)
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} - True if feature is enabled, false otherwise
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURE_GATES[featureName] === true
}

/**
 * Get all enabled features
 * @returns {string[]} - Array of enabled feature names
 */
export const getEnabledFeatures = () => {
  return Object.keys(FEATURE_GATES).filter(key => FEATURE_GATES[key] === true)
}

/**
 * Get all disabled features
 * @returns {string[]} - Array of disabled feature names
 */
export const getDisabledFeatures = () => {
  return Object.keys(FEATURE_GATES).filter(key => FEATURE_GATES[key] === false)
}
