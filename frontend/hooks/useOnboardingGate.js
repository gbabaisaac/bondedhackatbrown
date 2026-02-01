import { useRouter } from 'expo-router'
import { Alert } from 'react-native'
import { useCurrentUserProfile } from './useCurrentUserProfile'

/**
 * Hook to gate features based on onboarding completion
 * Returns functions to check if user can access features and show nudges
 */
export function useOnboardingGate() {
  const { data: profile } = useCurrentUserProfile()
  const router = useRouter()
  
  const isOnboardingComplete = profile?.onboarding_complete || false
  const completionPercentage = profile?.profile_completion_percentage || 0
  
  /**
   * Check if user can access a feature
   * Returns { canAccess: boolean, reason?: string }
   * All features are now accessible regardless of onboarding status
   */
  const canAccessFeature = (featureName) => {
    // All features are accessible - no gating based on onboarding
    return { canAccess: true }
  }
  
  /**
   * Show nudge to complete onboarding
   */
  const showOnboardingNudge = (featureName = 'this feature') => {
    Alert.alert(
      'Complete Your Profile',
      `To use ${featureName}, please complete your onboarding first. You're ${completionPercentage}% done!`,
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Complete Now',
          onPress: () => router.push('/onboarding'),
          style: 'default',
        },
      ]
    )
  }
  
  /**
   * Gate a feature - always allows access (no gating)
   */
  const gateFeature = (featureName, showNudge = true) => {
    // Always allow access - no gating
    return true
  }
  
  return {
    isOnboardingComplete,
    completionPercentage,
    canAccessFeature,
    showOnboardingNudge,
    gateFeature,
  }
}
