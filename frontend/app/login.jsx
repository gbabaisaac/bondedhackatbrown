import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Animated, ImageBackground, Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View, useColorScheme } from 'react-native'
import AnimatedLogo from '../components/AnimatedLogo'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import Input from '../components/Input'
import ScreenWrapper from '../components/ScreenWrapper'
import { hp } from '../helpers/common'
import { useSendOTP } from '../hooks/useSendOTP'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'
import { useAppTheme, useThemeMode } from './theme'

export default function Login() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const hoverValue = useRef(new Animated.Value(0)).current
  const { mutate: sendOTP } = useSendOTP()
  const { setMode } = useThemeMode()
  const systemScheme = useColorScheme() || 'light'

  // Force light mode while login screen is displayed, then restore system preference
  // Use useLayoutEffect to ensure theme changes BEFORE render
  useLayoutEffect(() => {
    setMode('light')
    return () => {
      setMode(systemScheme)
    }
  }, [setMode, systemScheme])

  useEffect(() => {
    const hoverAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverValue, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(hoverValue, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    )

    hoverAnimation.start()
    return () => {
      hoverAnimation.stop()
      hoverValue.setValue(0)
    }
  }, [hoverValue])

  const hoverTranslate = hoverValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  })

  const handleContinue = () => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address')
      return
    }

    setIsSending(true)

    sendOTP(trimmedEmail, {
      onSuccess: () => {
        setIsSending(false)
        router.push(`/otp?email=${encodeURIComponent(trimmedEmail)}`)
      },
      onError: (error) => {
        console.error('❌ Error sending OTP:', error)
        Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to send code'))
        setIsSending(false)
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
            <Text style={styles.title}>Please enter your email to continue.</Text>

            <Animated.View
              style={[
                styles.inputContainer,
                { transform: [{ translateY: hoverTranslate }] },
              ]}
            >
              <Input
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.inputWrapper}
              />
            </Animated.View>

            <Button
              title={isSending ? 'Sending...' : 'Continue'}
              onPress={handleContinue}
              buttonStyle={styles.button}
              disabled={isSending}
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
      marginBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.lg,
    },
    inputContainer: {
      width: '100%',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    inputWrapper: {
      width: '100%',
    },
    button: {
      width: '100%',
      marginTop: hp(10),
    },
  })
