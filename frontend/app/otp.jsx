import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, ImageBackground, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View, useColorScheme } from 'react-native'
import AnimatedLogo from '../components/AnimatedLogo'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import ScreenWrapper from '../components/ScreenWrapper'
import { hp } from '../helpers/common'
import { useSendOTP } from '../hooks/useSendOTP'
import { useVerifyOTP } from '../hooks/useVerifyOTP'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme, useThemeMode } from './theme'

const getFriendlyOtpError = (error) => {
  const raw = (error?.message || '').toLowerCase()

  if (raw.includes('expired')) {
    return 'That code has expired. Tap "Resend Code" to get a new one.'
  }

  if (raw.includes('invalid') || raw.includes('token') || raw.includes('otp')) {
    return 'That code is not correct. Double-check the numbers and try again.'
  }

  return 'We could not verify that code. Please try again, or resend a new one.'
}

export default function OTP() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { email } = useLocalSearchParams()

  const [code, setCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(60) // Start with 60s cooldown
  const [isNavigating, setIsNavigating] = useState(false)
  const { mutate: sendOTP, isPending: isSending } = useSendOTP()
  const { mutate: verifyOTP, isPending: isVerifying } = useVerifyOTP()
  const { user } = useAuthStore()
  // Only fetch profile if user is authenticated to prevent crashes
  const { data: profile, isLoading: profileLoading, error: profileError } = useCurrentUserProfile()
  const cooldownTimerRef = useRef(null)
  const navigationTimeoutRef = useRef(null)
  const hasNavigatedRef = useRef(false) // Prevent multiple navigations
  const { setMode } = useThemeMode()
  const systemScheme = useColorScheme() || 'light'
  
  // Add error boundary to catch any unexpected errors
  useEffect(() => {
    if (profileError) {
      console.error('❌ Profile error in OTP screen:', profileError)
      // Don't crash - just log the error
    }
  }, [profileError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
      hasNavigatedRef.current = false
    }
  }, [])

  // Force light mode while OTP screen is displayed, then restore system preference
  // Use useLayoutEffect to ensure theme changes BEFORE render
  useLayoutEffect(() => {
    setMode('light')
    return () => {
      setMode(systemScheme)
    }
  }, [setMode, systemScheme])

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
    } else {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }
    }
  }, [resendCooldown])

  // Navigate after profile loads
  useEffect(() => {
    // Prevent multiple navigations
    if (hasNavigatedRef.current) {
      console.log('⏭️ Navigation already completed, skipping')
      return
    }

    if (!isNavigating) return
    if (!user) {
      // User not set yet, wait a bit
      console.log('⏳ Waiting for user to be set...')
      return
    }
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
    }
    
    // Timeout fallback - if profile doesn't load within 5 seconds, navigate to onboarding
    navigationTimeoutRef.current = setTimeout(() => {
      if (isNavigating && !hasNavigatedRef.current) {
        console.warn('⚠️ Profile load timeout, navigating to onboarding')
        hasNavigatedRef.current = true
        setIsNavigating(false)
        try {
          router.replace('/onboarding')
        } catch (error) {
          console.error('❌ Navigation error:', error)
          hasNavigatedRef.current = false // Reset on error
        }
      }
    }, 5000)
    
    // If there's an error, still try to navigate (profile might not exist yet)
    if (profileError) {
      console.warn('⚠️ Profile error, navigating to onboarding:', profileError)
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true
        setIsNavigating(false)
        try {
          router.replace('/onboarding')
        } catch (error) {
          console.error('❌ Navigation error:', error)
          hasNavigatedRef.current = false // Reset on error
        }
      }
      return
    }
    
    if (!profileLoading && profile !== undefined) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
      
      if (hasNavigatedRef.current) {
        console.log('⏭️ Already navigated, skipping')
        return
      }

      hasNavigatedRef.current = true
      setIsNavigating(false)
      
      try {
        // Handle null profile (user not authenticated or profile doesn't exist)
        if (!profile || profile === null) {
          console.warn('⚠️ Profile is null, navigating to onboarding')
          router.replace('/onboarding')
          return
        }
        
        // Check if user has basic profile data
        const hasBasicProfileData = profile?.username && profile?.full_name && 
          (profile?.avatar_url || profile?.major || profile?.graduation_year)
        
        // Navigate based on profile status
        if (hasBasicProfileData) {
          // User has basic profile - go to home
          console.log('✅ User has basic profile, navigating to yearbook')
          router.replace('/yearbook')
        } else if (profile?.onboarding_complete) {
          // Onboarding complete but no basic data (edge case) - go to home
          console.log('✅ Onboarding complete, navigating to yearbook')
          router.replace('/yearbook')
        } else {
          // New user or incomplete profile - go to onboarding
          console.log('✅ New user, navigating to onboarding')
          router.replace('/onboarding')
        }
      } catch (error) {
        console.error('❌ Navigation error after profile load:', error)
        hasNavigatedRef.current = false // Reset on error to allow retry
        // Fallback navigation
        try {
          router.replace('/onboarding')
          hasNavigatedRef.current = true
        } catch (fallbackError) {
          console.error('❌ Fallback navigation also failed:', fallbackError)
        }
      }
    }
    
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [isNavigating, profileLoading, profile, profileError, user, router])

  const handleVerify = () => {
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back and try again.')
      return
    }

    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code we emailed you.')
      return
    }

    verifyOTP(
      { email: String(email), token: code },
      {
        onSuccess: () => {
          console.log('✅ OTP verified successfully')
          // Reset navigation flag
          hasNavigatedRef.current = false
          // Small delay to ensure auth store is updated before fetching profile
          setTimeout(() => {
            // Set navigating flag and wait for profile to load
            setIsNavigating(true)
          }, 500) // Increased delay to ensure auth store is fully updated
        },
        onError: (error) => {
          console.error('Error verifying OTP:', error)
          const message = getFriendlyOtpError(error)
          Alert.alert('Couldn\'t verify code', message)
          setIsNavigating(false)
          hasNavigatedRef.current = false // Reset on error
        },
      }
    )
  }

  const handleResend = () => {
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back and try again.')
      return
    }

    if (resendCooldown > 0) {
      Alert.alert('Please wait', `You can request a new code in ${resendCooldown} seconds.`)
      return
    }

    console.log('🔄 Resending OTP to:', email)

    sendOTP(String(email), {
      onSuccess: () => {
        console.log('✅ OTP resent successfully')
        setCode('') // Clear old code
        setResendCooldown(60) // Set 60 second cooldown
        Alert.alert('Code sent!', 'Check your email for a new 6-digit code.\n\nNote: Codes expire after 60 seconds.')
      },
      onError: (error) => {
        console.error('❌ Error resending OTP:', error)
        const errorMessage = error?.message || ''
        if (errorMessage.includes('security purposes')) {
          Alert.alert('Too many requests', 'Please wait a minute before requesting another code.')
        } else {
          Alert.alert('Could not resend code', 'Please wait a moment and try again.')
        }
      },
    })
  }

  return (
    <ImageBackground
      source={require('../assets/images/bonded-gradient.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScreenWrapper bg="transparent">
        <StatusBar style="light" />
        <BackButton onPress={() => router.back()} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <AnimatedLogo size={60} style={styles.animatedLogo} />
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
            <Text style={styles.hint}>Check your inbox (and spam folder)</Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
              placeholder="000000"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Button
              title={isVerifying ? 'Verifying…' : 'Verify Code'}
              onPress={handleVerify}
              buttonStyle={styles.button}
              disabled={isVerifying || code.length !== 6}
            />

            <Button
              title={
                isSending
                  ? 'Sending…'
                  : resendCooldown > 0
                  ? `Resend code (${resendCooldown}s)`
                  : 'Resend code'
              }
              onPress={handleResend}
              buttonStyle={[styles.button, { marginTop: hp(2) }]}
              disabled={isSending || resendCooldown > 0}
            />
          </View>
        </TouchableWithoutFeedback>
      </ScreenWrapper>
    </ImageBackground>
  )
}

const createStyles = (theme) =>
  StyleSheet.create({
    background: {
      flex: 1,
      width: '100%',
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xxxl,
    },
    animatedLogo: {
      marginTop: hp(-20),
      marginBottom: hp(4),
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.xxl,
      fontWeight: theme.typography.weights.extrabold,
      textAlign: 'center',
      letterSpacing: -0.5,
      fontFamily: theme.typography.fontFamily.heading,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.md,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    hint: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.sm,
      textAlign: 'center',
      marginBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      opacity: 0.7,
    },
    codeInput: {
      width: '60%',
      height: hp(7),
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.9)',
      color: '#000',
      fontSize: theme.typography.sizes.xxl,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 8,
    },
    button: {
      width: '100%',
      marginTop: hp(4),
    },
  })
