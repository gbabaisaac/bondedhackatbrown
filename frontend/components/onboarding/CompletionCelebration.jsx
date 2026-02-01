import React, { useEffect, useRef } from 'react'
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ONBOARDING_THEME } from '../../constants/onboardingTheme'
import { hp, wp } from '../../helpers/common'
import AnimatedLogo from '../AnimatedLogo'
import Button from '../Button'

const CompletionCelebration = ({ onContinue }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const scaleAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const confettiAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Scale animation for logo
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start()

    // Fade in text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start()

    // Confetti effect
    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 1000,
      delay: 200,
      useNativeDriver: true,
    }).start()
  }, [])

  const logoScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  })

  const confettiRotation = confettiAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Confetti effect */}
      <Animated.View
        style={[
          styles.confetti,
          {
            transform: [{ rotate: confettiRotation }],
            opacity: confettiAnim,
          },
        ]}
      >
        <Text style={styles.confettiEmoji}>🎉</Text>
      </Animated.View>

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <AnimatedLogo size={100} />
      </Animated.View>

      {/* Title */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>Welcome to Bonded!</Text>
        <Text style={styles.subtitle}>Your profile is live</Text>
      </Animated.View>

      {/* Benefits */}
      <Animated.View style={[styles.benefitsContainer, { opacity: fadeAnim }]}>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitEmoji}>✨</Text>
          <Text style={styles.benefitText}>Start discovering people on your campus</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitEmoji}>👥</Text>
          <Text style={styles.benefitText}>Find study partners, roommates, and friends</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitEmoji}>🎯</Text>
          <Text style={styles.benefitText}>Complete your profile anytime for better matches</Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <Button
          title="Let's Go!"
          onPress={onContinue}
          buttonStyle={styles.button}
          theme={ONBOARDING_THEME}
        />
      </Animated.View>
    </ScrollView>
  )
}

export default CompletionCelebration

const createStyles = (theme) => StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
    paddingTop: hp(8),
    paddingBottom: hp(8),
    minHeight: '100%',
  },
  confetti: {
    position: 'absolute',
    top: hp(5),
    right: wp(10),
  },
  confettiEmoji: {
    fontSize: hp(8),
  },
  logoContainer: {
    marginBottom: hp(4),
  },
  title: {
    fontSize: hp(5),
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(1.5),
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: hp(2.5),
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(6),
    fontFamily: theme.typography.fontFamily.body,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: hp(6),
    gap: hp(2.5),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: theme.radius.md,
    padding: wp(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  benefitEmoji: {
    fontSize: hp(3.5),
    marginRight: wp(3),
  },
  benefitText: {
    flex: 1,
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    lineHeight: hp(2.8),
    fontFamily: theme.typography.fontFamily.body,
  },
  buttonContainer: {
    width: '100%',
    paddingTop: hp(2),
  },
  button: {
    width: '100%',
  },
})
