import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, ImageBackground, StyleSheet, Text, useColorScheme, View } from 'react-native'
import ScreenWrapper from '../components/ScreenWrapper'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useSaveOnboarding } from '../hooks/useSaveOnboarding'
import { getActiveOnboardingSteps, ONBOARDING_STEPS, STEP_METADATA, useOnboardingStore } from '../stores/onboardingStore'
import { useThemeMode } from './theme'
// Onboarding always uses light mode - don't use dynamic theme
import BackButton from '../components/BackButton'
import OnboardingCarousel from '../components/onboarding/OnboardingCarousel'
import OnboardingNavigation from '../components/onboarding/OnboardingNavigation'
import BasicInfoStep from '../components/onboarding/steps/BasicInfoStep'
import ClassScheduleStep from '../components/onboarding/steps/ClassScheduleStep'
import InterestsStep from '../components/onboarding/steps/InterestsStep'
import LivingHabitsStep from '../components/onboarding/steps/LivingHabitsStep'
import PersonalityStep from '../components/onboarding/steps/PersonalityStep'
import PhotoSelectionStep from '../components/onboarding/steps/PhotoSelectionStep'
import StudyHabitsStep from '../components/onboarding/steps/StudyHabitsStep'
import { ONBOARDING_THEME } from '../constants/onboardingTheme'
import { hp, wp } from '../helpers/common'
import { useAuthStore } from '../stores/authStore'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'

export default function Onboarding() {
  const styles = createStyles(ONBOARDING_THEME)
  const router = useRouter()
  const log = (...args) => {
    if (__DEV__) console.log(...args)
  }
  const { setMode } = useThemeMode()
  const systemScheme = useColorScheme() || 'light'
  const { user } = useAuthStore()
  const { data: profile } = useCurrentUserProfile()
  const {
    currentStep,
    formData,
    completedSteps,
    completionPercentage,
    canAccessApp,
    setCurrentStep,
    updateFormData,
    markStepComplete,
    getNextIncompleteStep,
    syncFromProfile,
    setUserId,
  } = useOnboardingStore()

  const { mutate: saveOnboarding, isPending: isSaving } = useSaveOnboarding()
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const lastScrollY = useRef(0)
  const [hasSynced, setHasSynced] = useState(false)

  // Sync onboarding store from profile when component mounts or profile loads
  useEffect(() => {
    if (user?.id && profile && !hasSynced) {
      setUserId(user.id)
      syncFromProfile(profile)
      setHasSynced(true)

      // Navigate to first incomplete step
      const nextStep = getNextIncompleteStep()
      if (nextStep) {
        setCurrentStep(nextStep)
      }
    }
  }, [user?.id, profile, hasSynced, setUserId, syncFromProfile, getNextIncompleteStep, setCurrentStep])

  // Force light mode while onboarding is displayed, then restore system preference
  // Use useLayoutEffect to ensure theme changes BEFORE render
  useLayoutEffect(() => {
    setMode('light')
    return () => {
      setMode(systemScheme)
    }
  }, [setMode, systemScheme])

  // Auto-save when form data changes (debounced) - save partial data always
  useEffect(() => {
    // Only save if we have at least some data (basic info started)
    if (!formData.school && !formData.age && !formData.grade && !formData.major && !formData.photos?.length) {
      return // Don't save empty state
    }

    // Don't trigger auto-save if a save is already in progress
    if (isSaving) {
      log('⏳ Skipping auto-save - save already in progress')
      return
    }

    const timer = setTimeout(() => {
      // Double-check isSaving hasn't changed during debounce period
      if (isSaving) {
        log('⏳ Skipping auto-save - save started during debounce')
        return
      }

      log('💾 Auto-saving onboarding progress:', {
        completionPercentage,
        completedSteps: completedSteps.length,
        hasBasicInfo: !!(formData.school && formData.age && formData.grade && formData.major),
        hasPhotos: !!(formData.photos?.length > 0),
      })

      saveOnboarding({
        formData,
        completedSteps,
        completionPercentage,
      }, {
        onSuccess: (result) => {
          log('✅ Onboarding progress saved')
          // Show alert if photo upload had issues
          if (result?.photoUploadError) {
            Alert.alert(
              'Photo Upload Issue',
              result.photoUploadError,
              [{ text: 'OK' }]
            )
          }
        },
        onError: (error) => {
          console.error('❌ Failed to save onboarding progress:', error)
          if (error.code === 'USERNAME_TAKEN') {
            Alert.alert('Username Taken', getFriendlyErrorMessage(error, 'This username is already taken.'))
          }
        }
      })
    }, 2000) // Debounce: save 2 seconds after last change

    return () => clearTimeout(timer)
  }, [formData, completedSteps, completionPercentage, saveOnboarding, isSaving])

  const handleContinue = async () => {
    // If on photos step, upload photos before continuing
    if (currentStep === ONBOARDING_STEPS.PHOTOS && formData.photos?.length > 0) {
      try {
        // Upload photos via saveOnboarding
        const result = await new Promise((resolve, reject) => {
          saveOnboarding(
            { formData, completedSteps, completionPercentage },
            {
              onSuccess: (data) => {
                markStepComplete(currentStep)
                resolve(data)
              },
              onError: (error) => {
                console.error('Error uploading photos:', error)
                reject(error)
              },
            }
          )
        })

        // Show alert if photo upload had issues but still allow continuation
        if (result?.photoUploadError) {
          Alert.alert(
            'Photo Upload Issue',
            result.photoUploadError,
            [{ text: 'Continue Anyway' }]
          )
        }
      } catch (error) {
        console.error('Failed to upload photos:', error)
        // Show user-friendly error and allow them to continue
        Alert.alert(
          'Photo Upload Failed',
          'Your photos could not be uploaded. You can continue and we will try again later, or go back to retry.',
          [
            { text: 'Go Back', style: 'cancel' },
            { text: 'Continue Anyway', onPress: () => markStepComplete(currentStep) }
          ]
        )
        return // Don't auto-advance, let the user decide
      }
    } else {
      // Mark current step as complete
      markStepComplete(currentStep)
    }

    // Get next step in sequence (only active steps, excluding intro)
    const steps = getActiveOnboardingSteps()
    const currentStepIndex = steps.indexOf(currentStep)

    if (currentStepIndex < steps.length - 1) {
      // Go to next step in sequence
      const nextStep = steps[currentStepIndex + 1]
      setCurrentStep(nextStep)
      // Reset scroll state when changing steps
      setIsScrollingDown(false)
      lastScrollY.current = 0
    } else {
      // All steps complete - show celebration
      setShowCelebration(true)
    }
  }

  const handleCelebrationContinue = () => {
    setShowCelebration(false)
    router.replace('/yearbook')
  }


  const handleBack = () => {
    // If on first step (Basic Info), go back to previous screen
    if (currentStep === ONBOARDING_STEPS.BASIC_INFO) {
      router.back()
      return
    }

    const steps = getActiveOnboardingSteps()
    const stepIndex = steps.indexOf(currentStep)

    if (stepIndex > 0) {
      // Go to previous step in sequence
      const prevStep = steps[stepIndex - 1]
      setCurrentStep(prevStep)
      // Reset scroll state when changing steps
      setIsScrollingDown(false)
      lastScrollY.current = 0
    } else {
      // If on first step, go back to previous screen
      router.back()
    }
  }


  // Handle scroll to show/hide back button
  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y
    const scrollingDown = currentScrollY > lastScrollY.current && currentScrollY > 50

    if (scrollingDown !== isScrollingDown) {
      setIsScrollingDown(scrollingDown)
    }

    lastScrollY.current = currentScrollY
  }

  // Render current step component with scroll handler
  const renderStepContent = () => {
    const commonProps = {
      formData,
      updateFormData,
      onScroll: handleScroll,
    }

    switch (currentStep) {
      case ONBOARDING_STEPS.BASIC_INFO:
        return <BasicInfoStep {...commonProps} />
      case ONBOARDING_STEPS.PHOTOS:
        return <PhotoSelectionStep {...commonProps} />
      case ONBOARDING_STEPS.CLASS_SCHEDULE:
        return <ClassScheduleStep {...commonProps} />
      case ONBOARDING_STEPS.INTERESTS:
        return <InterestsStep {...commonProps} />
      case ONBOARDING_STEPS.STUDY_HABITS:
        return <StudyHabitsStep {...commonProps} />
      case ONBOARDING_STEPS.LIVING_HABITS:
        return <LivingHabitsStep {...commonProps} />
      case ONBOARDING_STEPS.PERSONALITY:
        return <PersonalityStep {...commonProps} />
      default:
        return <BasicInfoStep {...commonProps} />
    }
  }

  const stepMetadata = STEP_METADATA[currentStep] || {}
  const isFirstStep = currentStep === ONBOARDING_STEPS.BASIC_INFO
  const orderedSteps = getActiveOnboardingSteps()
  const currentStepIndex = orderedSteps.indexOf(currentStep)

  const renderStepPills = () => (
    <View style={styles.stepPillsContainer}>
      {orderedSteps.map((step, idx) => {
        const isActive = step === currentStep
        const isCompleted = completedSteps.includes(step)
        return (
          <View
            key={step}
            style={[
              styles.stepPill,
              isActive && styles.stepPillActive,
              isCompleted && !isActive && styles.stepPillCompleted,
            ]}
          >
            <Text style={[styles.stepPillText, isActive && styles.stepPillTextActive]}>
              {idx + 1}
            </Text>
          </View>
        )
      })}
    </View>
  )

  // Can continue logic - all steps require validation
  const canContinue =
    (currentStep === ONBOARDING_STEPS.BASIC_INFO &&
      formData.school && formData.age && formData.grade && formData.gender && formData.major &&
      (formData.fullName || (formData.firstName && formData.lastName)) && formData.username) ||
    (currentStep === ONBOARDING_STEPS.PHOTOS && formData.photos?.length > 0) ||
    (currentStep === ONBOARDING_STEPS.INTERESTS && formData.interests?.length > 0) ||
    (currentStep === ONBOARDING_STEPS.CLASS_SCHEDULE && formData.classSchedule?.courses?.length > 0) ||
    (currentStep === ONBOARDING_STEPS.STUDY_HABITS &&
      formData.studyHabits?.preferredStudyTime && formData.studyHabits?.studyLocation &&
      formData.studyHabits?.studyStyle && formData.studyHabits?.noiseLevel) ||
    (currentStep === ONBOARDING_STEPS.LIVING_HABITS &&
      formData.livingHabits?.sleepSchedule && formData.livingHabits?.cleanliness &&
      formData.livingHabits?.socialLevel && formData.livingHabits?.guests) ||
    (currentStep === ONBOARDING_STEPS.PERSONALITY &&
      Object.keys(formData.personalityAnswers || {}).length > 0)

  // Show celebration screen
  if (showCelebration) {
    return (
      <ImageBackground
        source={require('../assets/images/bonded-gradient.jpg')}
        style={styles.background}
        resizeMode='cover'
      >
        <ScreenWrapper bg='transparent'>
          <StatusBar style='light' />
          <OnboardingCarousel onContinue={handleCelebrationContinue} />
        </ScreenWrapper>
      </ImageBackground>
    )
  }

  return (
    <ImageBackground
      source={require('../assets/images/bonded-gradient.jpg')}
      style={styles.background}
      resizeMode='cover'
    >
      <ScreenWrapper bg='transparent'>
        <StatusBar style='light' />
        <BackButton onPress={handleBack} visible={!isScrollingDown} theme={ONBOARDING_THEME} />

        {/* Step Progress at Top */}
        <View style={styles.stepProgressBar}>
          {renderStepPills()}
        </View>

        <View style={styles.container}>
          {/* Step Content - Conditional rendering */}
          <View style={styles.stepContainer}>
            {renderStepContent()}
          </View>

          {/* Navigation Buttons - Fixed at bottom */}
          <OnboardingNavigation
            isFirstStep={isFirstStep}
            canContinue={canContinue}
            onContinue={handleContinue}
            onBack={handleBack}
            isSaving={isSaving}
          />
        </View>
      </ScreenWrapper>
    </ImageBackground>
  )
}

const createStyles = () => StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stepProgressBar: {
    alignItems: 'center',
    paddingTop: hp(1),
    paddingBottom: hp(1),
  },
  stepPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  stepPill: {
    width: hp(3.2),
    height: hp(3.2),
    borderRadius: hp(1.6),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillActive: {
    backgroundColor: '#A45CFF',
    borderColor: '#A45CFF',
    shadowColor: '#A45CFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stepPillCompleted: {
    backgroundColor: 'rgba(164, 92, 255, 0.3)',
    borderColor: 'rgba(164, 92, 255, 0.5)',
  },
  stepPillText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    fontSize: hp(1.4),
  },
  stepPillTextActive: {
    color: '#FFFFFF',
    fontSize: hp(1.5),
  },
  stepContainer: {
    flex: 1,
  },
})
