import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
// Onboarding always uses light mode
import { ONBOARDING_THEME } from '../../constants/onboardingTheme'
import { hp, wp } from '../../helpers/common'
import { ONBOARDING_STEPS, STEP_METADATA } from '../../stores/onboardingStore'

const ProgressBar = ({ currentStep, completionPercentage }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const steps = Object.values(ONBOARDING_STEPS).filter(step => step !== ONBOARDING_STEPS.INTRO)
  const currentStepIndex = steps.indexOf(currentStep)
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 0
  const totalSteps = steps.length
  
  const animatedWidth = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: completionPercentage,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [completionPercentage])

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  })

  // Don't show progress on intro screen
  if (currentStep === ONBOARDING_STEPS.INTRO) {
    return null
  }

  const stepMetadata = STEP_METADATA[currentStep]
  const isRequired = stepMetadata?.isRequired

  return (
    <View style={styles.container}>
      {/* Progress dots (like Yik Yak) */}
      <View style={styles.progressDotsContainer}>
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isCompleted = index < currentStepIndex
          return (
            <View
              key={step}
              style={[
                styles.progressDot,
                isActive && styles.progressDotActive,
                isCompleted && styles.progressDotCompleted,
              ]}
            />
          )
        })}
      </View>

      {/* Step number and label */}
      <View style={styles.stepInfo}>
        <Text style={styles.stepIndicator}>
          Step {currentStepNumber}/{totalSteps}
        </Text>
        {isRequired !== undefined && (
          <View style={[styles.badge, isRequired && styles.requiredBadge]}>
            <Text style={[styles.badgeText, isRequired && styles.requiredBadgeText]}>
              {isRequired ? 'Required' : 'Optional'}
            </Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: widthInterpolated },
            ]}
          />
        </View>
        <Text style={styles.percentageText}>{Math.round(completionPercentage)}%</Text>
      </View>

      {/* Value proposition */}
      {stepMetadata?.valueProp && (
        <Text style={styles.valueProp}>{stepMetadata.valueProp}</Text>
      )}
    </View>
  )
}

export default ProgressBar

const createStyles = (theme) => StyleSheet.create({
  container: {
    gap: hp(1.5),
    marginBottom: hp(0.5),
  },
  progressDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.5),
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  progressDotActive: {
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  progressDotCompleted: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  stepIndicator: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    fontFamily: 'System',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(142, 142, 142, 0.15)',
  },
  requiredBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)', // Purple with 15% opacity
  },
  badgeText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  requiredBadgeText: {
    color: theme.colors.bondedPurple,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  progressBarBackground: {
    flex: 1,
    height: hp(0.6),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.pill,
  },
  percentageText: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontWeight: '600',
    minWidth: wp(10),
    textAlign: 'right',
    fontFamily: 'System',
  },
  valueProp: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: hp(0.5),
    fontFamily: 'System',
  },
})

