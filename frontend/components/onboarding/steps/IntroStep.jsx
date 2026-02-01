import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import AnimatedLogo from '../../AnimatedLogo'

const IntroStep = ({ onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  
  // Get total steps (excluding intro)
  const steps = Object.values(ONBOARDING_STEPS).filter(step => step !== ONBOARDING_STEPS.INTRO)
  const totalSteps = steps.length

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
      bounces={true}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <AnimatedLogo size={80} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome to Bonded!</Text>
        
        {/* Subtitle with time estimate */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Find your people on campus</Text>
          <View style={styles.timeEstimate}>
            <Text style={styles.timeIcon}>⏱</Text>
            <Text style={styles.timeText}>~3 minutes</Text>
          </View>
        </View>

        {/* Brief description */}
        <Text style={styles.description}>
          We'll help you set up your profile so you can connect with classmates, find study partners, and discover your people on campus.
        </Text>

        {/* Progress dots indicator */}
        <View style={styles.progressDotsContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === 0 && styles.progressDotActive, // First step (Basic Info) is next
              ]}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

export default IntroStep

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: hp(4),
    paddingBottom: hp(8), // Extra padding at bottom for button
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  logoContainer: {
    marginBottom: hp(4),
  },
  title: {
    fontSize: hp(5),
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.5,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
    gap: hp(1.5),
  },
  subtitle: {
    fontSize: hp(2.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.heading,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeIcon: {
    fontSize: hp(2),
  },
  timeText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  description: {
    fontSize: hp(2),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(3),
    fontFamily: theme.typography.fontFamily.body,
    paddingHorizontal: wp(2),
    marginBottom: hp(4),
    maxWidth: '100%',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(2),
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 1)',
  },
})
