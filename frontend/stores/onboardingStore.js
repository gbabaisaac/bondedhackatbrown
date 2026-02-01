import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isFeatureEnabled } from '../utils/featureGates'

// Onboarding steps - reordered for better flow
export const ONBOARDING_STEPS = {
  INTRO: 'intro',                // Introduction screen
  BASIC_INFO: 'basic_info',      // Required: school, age, grade, gender, major
  PHOTOS: 'photos',              // Required: yearbook photo + additional photos
  CLASS_SCHEDULE: 'class_schedule', // Optional: class schedule for matching
  INTERESTS: 'interests',        // Optional
  STUDY_HABITS: 'study_habits',  // Optional
  LIVING_HABITS: 'living_habits', // Optional
  PERSONALITY: 'personality',     // Optional (for roommates)
}

// Step metadata for UI
export const STEP_METADATA = {
  [ONBOARDING_STEPS.INTRO]: {
    title: 'Welcome to Bonded',
    subtitle: "Let's set up your profile",
    isRequired: false,
    isIntro: true,
  },
  [ONBOARDING_STEPS.BASIC_INFO]: {
    title: 'Basic Information',
    subtitle: 'Help people find you on campus',
    valueProp: 'This helps other students recognize and connect with you',
    isRequired: true,
  },
  [ONBOARDING_STEPS.PHOTOS]: {
    title: 'Add Your Photos',
    subtitle: 'Show your best self',
    valueProp: 'Photos help people recognize you and make meaningful connections',
    isRequired: true,
  },
  [ONBOARDING_STEPS.CLASS_SCHEDULE]: {
    title: 'Your Class Schedule',
    subtitle: 'Find classmates instantly',
    valueProp: 'Connect with students in your classes for study groups and notes',
    isRequired: false,
  },
  [ONBOARDING_STEPS.INTERESTS]: {
    title: 'Your Interests',
    subtitle: 'What makes you, you?',
    valueProp: 'Share your passions to find people who share your interests',
    isRequired: false,
  },
  [ONBOARDING_STEPS.STUDY_HABITS]: {
    title: 'Study Habits',
    subtitle: 'Find your perfect study partner',
    valueProp: 'Match with study partners who have compatible study styles',
    isRequired: false,
  },
  [ONBOARDING_STEPS.LIVING_HABITS]: {
    title: 'Living Habits',
    subtitle: 'Find your ideal roommate',
    valueProp: 'Help us match you with roommates who share your lifestyle',
    isRequired: false,
  },
  [ONBOARDING_STEPS.PERSONALITY]: {
    title: 'Personality',
    subtitle: 'Your vibe',
    valueProp: 'Complete your Love Print to find people with compatible personalities',
    isRequired: false,
  },
}

// Completion percentages per step
// Adjusted for simplified onboarding: Steps 1, 2, 3, and 4 (formerly step 7)
export const STEP_COMPLETION = {
  [ONBOARDING_STEPS.INTRO]: 0,           // Intro doesn't count toward completion
  [ONBOARDING_STEPS.BASIC_INFO]: 25,    // Step 1: Required - Basic Info
  [ONBOARDING_STEPS.PHOTOS]: 25,        // Step 2: Required - Photos
  [ONBOARDING_STEPS.CLASS_SCHEDULE]: 15, // Step 3: Optional - Class Schedule
  [ONBOARDING_STEPS.INTERESTS]: 35,      // Step 4: Interests
  [ONBOARDING_STEPS.STUDY_HABITS]: 0,   // Gated - not counted
  [ONBOARDING_STEPS.LIVING_HABITS]: 0,  // Gated - not counted
  [ONBOARDING_STEPS.PERSONALITY]: 0,    // Gated - not counted
}

// Get active onboarding steps (filtered by feature gates)
export const getActiveOnboardingSteps = () => {
  const allSteps = Object.values(ONBOARDING_STEPS).filter(step => step !== ONBOARDING_STEPS.INTRO)

  return allSteps.filter(step => {
    // Always include: BASIC_INFO, PHOTOS, CLASS_SCHEDULE, INTERESTS
    if (step === ONBOARDING_STEPS.BASIC_INFO ||
      step === ONBOARDING_STEPS.PHOTOS ||
      step === ONBOARDING_STEPS.CLASS_SCHEDULE ||
      step === ONBOARDING_STEPS.INTERESTS) {
      return true
    }

    // Check feature gates for optional steps
    if (step === ONBOARDING_STEPS.STUDY_HABITS) {
      return isFeatureEnabled('ONBOARDING_STUDY_HABITS')
    }
    if (step === ONBOARDING_STEPS.LIVING_HABITS) {
      return isFeatureEnabled('ONBOARDING_LIVING_HABITS')
    }
    if (step === ONBOARDING_STEPS.PERSONALITY) {
      return isFeatureEnabled('ONBOARDING_PERSONALITY')
    }

    return false
  })
}

const initialState = {
  // User association - prevents data leaking between users
  userId: null,

  // Current state
  currentStep: ONBOARDING_STEPS.BASIC_INFO, // Start directly with Basic Info
  completedSteps: [],
  hasSeenIntro: true, // Skip intro

  // Form data (saved incrementally)
  formData: {
    // Step 1: Photos (Required)
    photos: [], // Array of photo objects: { uri, localUri, isYearbookPhoto, order, uploadedUrl }
    yearbookQuote: null, // Quote for yearbook photo

    // Step 2: Basic Info (Required)
    fullName: '',

    // Class Schedule (Optional)
    classSchedule: null, // JSONB: { courses: [...], rawText: '' }
    username: '',
    school: null,
    age: null,
    grade: null, // Freshman, Sophomore, Junior, Senior, Graduate
    gender: null,
    major: null,

    // Step 2: Interests (Optional)
    interests: [],
    personalityTags: [],
    humorStyle: null,
    aesthetic: null,

    // Step 3: Study Habits (Optional)
    studyHabits: {
      preferredStudyTime: null, // Morning, Afternoon, Evening, Night
      studyLocation: null, // Library, Dorm, Coffee Shop, etc.
      studyStyle: null, // Solo, Group, Both
      noiseLevel: null, // Quiet, Moderate, Noisy
    },

    // Step 4: Living Habits (Optional)
    livingHabits: {
      sleepSchedule: null, // Early Bird, Night Owl, Flexible
      cleanliness: null, // Very Clean, Moderate, Relaxed
      socialLevel: null, // Very Social, Moderate, Private
      guests: null, // Often, Sometimes, Rarely
    },

    // Step 5: Personality Questions (Optional - for roommates)
    personalityAnswers: {},
  },

  // Tracking
  completionPercentage: 0,
  lastSavedAt: null,
  canAccessApp: false, // True after basic info is complete
}

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),

      updateFormData: (step, data) => {
        const state = get()
        // Deep merge nested objects to avoid losing nested properties
        const newFormData = { ...state.formData }

        Object.keys(data).forEach(key => {
          const existingValue = state.formData[key]
          const newValue = data[key]

          // Deep merge if both are plain objects (not arrays, not null)
          if (
            existingValue !== null &&
            newValue !== null &&
            typeof existingValue === 'object' &&
            typeof newValue === 'object' &&
            !Array.isArray(existingValue) &&
            !Array.isArray(newValue)
          ) {
            newFormData[key] = { ...existingValue, ...newValue }
          } else {
            newFormData[key] = newValue
          }
        })

        // Calculate completion
        const completedSteps = getCompletedSteps(newFormData)
        const completionPercentage = calculateCompletion(completedSteps)

        // Can access app if all REQUIRED steps are complete
        const activeSteps = getActiveOnboardingSteps()
        const requiredSteps = activeSteps.filter(step => STEP_METADATA[step]?.isRequired)
        const canAccessApp = requiredSteps.every(step => completedSteps.includes(step))

        set({
          formData: newFormData,
          completedSteps,
          completionPercentage,
          canAccessApp,
          lastSavedAt: new Date().toISOString(),
        })
      },

      markStepComplete: (step) => {
        const state = get()
        if (!state.completedSteps.includes(step)) {
          const completedSteps = [...state.completedSteps, step]
          const completionPercentage = calculateCompletion(completedSteps)

          set({
            completedSteps,
            completionPercentage,
            lastSavedAt: new Date().toISOString(),
          })
        }
      },

      // Check if step is complete
      isStepComplete: (step) => {
        return get().completedSteps.includes(step)
      },

      // Get next incomplete step
      getNextIncompleteStep: () => {
        const { completedSteps } = get()
        const activeSteps = getActiveOnboardingSteps()

        for (const step of activeSteps) {
          if (!completedSteps.includes(step)) {
            return step
          }
        }
        return null // All steps complete
      },

      // Reset onboarding (for testing or restart)
      resetOnboarding: () => set(initialState),

      // Clear onboarding data (after successful completion)
      clearOnboarding: () => set(initialState),

      // Mark intro as seen
      markIntroSeen: () => set({ hasSeenIntro: true }),

      // Set user ID - clears data if user changes to prevent data leaking
      setUserId: (newUserId) => {
        const state = get()
        if (state.userId && state.userId !== newUserId) {
          // User changed - reset onboarding data
          console.log('🔄 User changed, resetting onboarding state')
          set({ ...initialState, userId: newUserId })
        } else if (!state.userId) {
          // First time setting user ID
          set({ userId: newUserId })
        }
      },

      // Clear user association on logout
      clearUserId: () => {
        set({ userId: null })
      },

      // Sync onboarding state from profile data
      syncFromProfile: (profile) => {
        const state = get()
        if (!profile) return

        // Build formData from profile - start from INITIAL state to avoid stale rehydrated data
        const syncedFormData = {
          ...initialState.formData,
          fullName: profile.full_name || '',
          username: profile.username || '',
          school: profile.university?.name || null,
          age: profile.age || null,
          grade: profile.grade || null,
          gender: profile.gender || null,
          major: profile.major || null,
          interests: profile.interests || [],
          personalityTags: profile.personality_tags || [],
          humorStyle: profile.humor_style || null,
          aesthetic: profile.aesthetic || null,
          studyHabits: profile.study_habits || state.formData.studyHabits,
          livingHabits: profile.living_habits || state.formData.livingHabits,
          personalityAnswers: profile.personality_answers || {},
          yearbookQuote: profile.yearbook_quote || null,
          classSchedule: profile.class_schedule || null,
        }

        // Add photos if they exist in profile
        if (profile.photos && profile.photos.length > 0) {
          syncedFormData.photos = profile.photos.map((url, idx) => ({
            uri: url,
            uploadedUrl: url,
            isYearbookPhoto: idx === 0 || url === profile.avatar_url,
            order: idx,
          }))
        } else if (profile.avatar_url) {
          // Fallback to avatar_url if photos array is missing/empty
          syncedFormData.photos = [{
            uri: profile.avatar_url,
            uploadedUrl: profile.avatar_url,
            isYearbookPhoto: true,
            order: 0,
          }]
        }

        // Calculate completed steps from synced data
        const completedSteps = getCompletedSteps(syncedFormData)
        const completionPercentage = calculateCompletion(completedSteps)

        // Can access app if all REQUIRED steps are complete
        const activeSteps = getActiveOnboardingSteps()
        const requiredSteps = activeSteps.filter(step => STEP_METADATA[step]?.isRequired)
        const canAccessApp = requiredSteps.every(step => completedSteps.includes(step))

        // Set current step to first incomplete step
        let nextStep = activeSteps.find(step => !completedSteps.includes(step))
        if (!nextStep && activeSteps.length > 0) {
          nextStep = activeSteps[0] // Default to first step if all complete
        }

        set({
          formData: syncedFormData,
          completedSteps,
          completionPercentage,
          canAccessApp,
          currentStep: nextStep || state.currentStep,
          lastSavedAt: profile.last_onboarding_update || new Date().toISOString(),
        })
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist everything - only essential data
      partialize: (state) => ({
        userId: state.userId,
        formData: state.formData,
        completedSteps: state.completedSteps,
        completionPercentage: state.completionPercentage,
        canAccessApp: state.canAccessApp,
        lastSavedAt: state.lastSavedAt,
        hasSeenIntro: state.hasSeenIntro,
      }),
    }
  )
)

// Helper: Calculate which steps are complete based on form data
// Only checks active steps (gated steps are ignored)
function getCompletedSteps(formData) {
  const completed = []
  const activeSteps = getActiveOnboardingSteps()

  // Photos (Required - at least 1 photo)
  if (formData.photos && formData.photos.length > 0 && activeSteps.includes(ONBOARDING_STEPS.PHOTOS)) {
    completed.push(ONBOARDING_STEPS.PHOTOS)
  }

  // Class Schedule (Optional - at least 1 course)
  if (formData.classSchedule?.courses?.length > 0 && activeSteps.includes(ONBOARDING_STEPS.CLASS_SCHEDULE)) {
    completed.push(ONBOARDING_STEPS.CLASS_SCHEDULE)
  }

  // Basic Info (Required)
  if (formData.fullName && formData.username && formData.school && formData.age && formData.grade && formData.gender && formData.major && activeSteps.includes(ONBOARDING_STEPS.BASIC_INFO)) {
    completed.push(ONBOARDING_STEPS.BASIC_INFO)
  }

  // Interests
  if (formData.interests && formData.interests.length > 0 && activeSteps.includes(ONBOARDING_STEPS.INTERESTS)) {
    completed.push(ONBOARDING_STEPS.INTERESTS)
  }

  // Study Habits (only if feature gate enabled)
  if (isFeatureEnabled('ONBOARDING_STUDY_HABITS') &&
    formData.studyHabits &&
    Object.values(formData.studyHabits).every(v => v !== null) &&
    activeSteps.includes(ONBOARDING_STEPS.STUDY_HABITS)) {
    completed.push(ONBOARDING_STEPS.STUDY_HABITS)
  }

  // Living Habits (only if feature gate enabled)
  if (isFeatureEnabled('ONBOARDING_LIVING_HABITS') &&
    formData.livingHabits &&
    Object.values(formData.livingHabits).every(v => v !== null) &&
    activeSteps.includes(ONBOARDING_STEPS.LIVING_HABITS)) {
    completed.push(ONBOARDING_STEPS.LIVING_HABITS)
  }

  // Personality (only if feature gate enabled)
  if (isFeatureEnabled('ONBOARDING_PERSONALITY') &&
    formData.personalityAnswers &&
    Object.keys(formData.personalityAnswers).length > 0 &&
    activeSteps.includes(ONBOARDING_STEPS.PERSONALITY)) {
    completed.push(ONBOARDING_STEPS.PERSONALITY)
  }

  return completed
}

// Helper: Calculate completion percentage
function calculateCompletion(completedSteps) {
  return completedSteps.reduce((total, step) => {
    return total + (STEP_COMPLETION[step] || 0)
  }, 0)
}
