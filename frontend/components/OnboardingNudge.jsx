import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'

/**
 * Global onboarding nudge component
 * Shows a modal/banner to remind users to complete onboarding
 */
function OnboardingNudge() {
  const router = useRouter()
  const theme = useAppTheme()
  const { data: profile, isLoading } = useCurrentUserProfile()
  const [showNudge, setShowNudge] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  useEffect(() => {
    if (isLoading || !profile) return

    // Check if user has basic profile data (username, full_name, etc.)
    // If they do, they're an existing user and shouldn't be forced to onboarding
    const hasBasicProfileData = profile.username && profile.full_name &&
      (profile.avatar_url || profile.major || profile.graduation_year)

    // Show nudge only if:
    // 1. Onboarding is incomplete AND
    // 2. User doesn't have basic profile data (new user) AND
    // 3. Nudge hasn't been dismissed
    if (!profile.onboarding_complete && !hasBasicProfileData && !nudgeDismissed) {
      // Show nudge after 5 seconds of being on a screen
      const timer = setTimeout(() => {
        setShowNudge(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [profile, isLoading, nudgeDismissed])

  const handleComplete = () => {
    setShowNudge(false)
    setNudgeDismissed(true)
    router.push('/onboarding')
  }

  // Onboarding is now mandatory - no dismiss option
  const handleDismiss = () => {
    // Force redirect to onboarding instead of allowing dismiss
    router.push('/onboarding')
  }

  // Check if user has basic profile data
  const hasBasicProfileData = profile?.username && profile?.full_name

  if (!showNudge || !profile || profile.onboarding_complete || hasBasicProfileData) {
    return null
  }

  const completionPercentage = profile.profile_completion_percentage || 0

  return (
    <Modal
      visible={showNudge}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
    // Prevent closing by tapping outside
    >
      <View style={styles.overlay}>
        <View style={[styles.nudgeCard, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <Ionicons name="person-circle-outline" size={hp(4)} color={theme.colors.bondedPurple} />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Complete Your Profile
            </Text>
          </View>

          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            You're {completionPercentage}% done! Please complete your profile setup to access all features including posts, events, and connecting with classmates.
          </Text>

          {/* Progress bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${completionPercentage}%`,
                  backgroundColor: theme.colors.bondedPurple,
                },
              ]}
            />
          </View>

          {/* Single button - onboarding is mandatory */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.bondedPurple }]}
            onPress={handleComplete}
          >
            <Text style={[styles.buttonText, { color: theme.colors.white }]}>Complete Onboarding</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  nudgeCard: {
    borderRadius: 20,
    padding: hp(2.5),
    width: '100%',
    maxWidth: wp(85),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  title: {
    fontSize: hp(2.2),
    fontWeight: '700',
    marginTop: hp(1),
    textAlign: 'center',
  },
  message: {
    fontSize: hp(1.6),
    lineHeight: hp(2.4),
    textAlign: 'center',
    marginBottom: hp(2),
  },
  progressBarContainer: {
    height: hp(0.8),
    borderRadius: hp(0.4),
    marginBottom: hp(2.5),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: hp(0.4),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  button: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set inline
  },
  secondaryButton: {
    borderWidth: 1,
    // borderColor set inline
  },
  buttonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
  },
})

export { OnboardingNudge }
