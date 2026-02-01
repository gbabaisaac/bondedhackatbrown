import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { US_SCHOOLS } from '../../../constants/schools'
import { hp, wp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import { supabase } from '../../../lib/supabase'
import Input from '../../Input'
import Picker from '../../Picker'

const BasicInfoStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [localData, setLocalData] = useState({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    username: formData.username || '',
    school: formData.school || null,
    age: formData.age || null,
    grade: formData.grade || '',
    gender: formData.gender || '',
    major: formData.major || '',
  })

  const [usernameValidation, setUsernameValidation] = useState({
    isChecking: false,
    isValid: false,
    message: '',
  })

  // Username validation
  const validateUsername = (username) => {
    if (!username) {
      return { isValid: false, message: '' }
    }

    // Check length (3-20 characters)
    if (username.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' }
    }
    if (username.length > 20) {
      return { isValid: false, message: 'Username must be less than 20 characters' }
    }

    // Check format: only letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return { isValid: false, message: 'Only letters, numbers, and underscores allowed' }
    }

    // Check if starts with a letter
    if (!/^[a-zA-Z]/.test(username)) {
      return { isValid: false, message: 'Username must start with a letter' }
    }

    return { isValid: true, message: '' }
  }

  // Check username availability with debounce
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      const username = localData.username.trim()

      if (!username) {
        setUsernameValidation({ isChecking: false, isValid: false, message: '' })
        return
      }

      // First validate format
      const formatCheck = validateUsername(username)
      if (!formatCheck.isValid) {
        setUsernameValidation({ isChecking: false, isValid: false, message: formatCheck.message })
        return
      }

      // Then check availability
      setUsernameValidation({ isChecking: true, isValid: false, message: 'Checking availability...' })

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', username)
          .limit(1)

        if (error) throw error

        if (data && data.length > 0) {
          setUsernameValidation({
            isChecking: false,
            isValid: false,
            message: 'Username already taken',
          })
        } else {
          setUsernameValidation({
            isChecking: false,
            isValid: true,
            message: 'Username available!',
          })
        }
      } catch (error) {
        console.error('Error checking username:', error)
        setUsernameValidation({
          isChecking: false,
          isValid: false,
          message: 'Error checking username',
        })
      }
    }

    // Debounce the check
    const timeoutId = setTimeout(checkUsernameAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [localData.username])

  const handleChange = (field, value) => {
    let processedValue = value

    // For username, convert to lowercase and remove spaces
    if (field === 'username') {
      processedValue = value.toLowerCase().replace(/\s/g, '')
    }

    const newData = {
      ...localData,
      [field]: processedValue,
    }
    setLocalData(newData)

    // Update store
    updateFormData(ONBOARDING_STEPS.BASIC_INFO, {
      firstName: newData.firstName,
      lastName: newData.lastName,
      username: newData.username,
      school: newData.school,
      age: newData.age,
      grade: newData.grade,
      gender: newData.gender,
      major: newData.major,
    })
  }

  // Age options (17-30, typical college age range)
  const ageOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const age = i + 17
      return { value: age, label: age.toString() }
    })
  }, [])

  const gradeOptions = [
    { value: 'incoming-freshman', label: 'Incoming Freshman' },
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate' },
  ]
  
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ]

  const majorOptions = [
    { value: 'undecided', label: 'Undecided' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'business', label: 'Business' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'psychology', label: 'Psychology' },
    { value: 'biology', label: 'Biology' },
    { value: 'economics', label: 'Economics' },
    { value: 'political-science', label: 'Political Science' },
    { value: 'history', label: 'History' },
    { value: 'philosophy', label: 'Philosophy' },
    { value: 'architecture', label: 'Architecture' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'english', label: 'English' },
    { value: 'communications', label: 'Communications' },
    { value: 'journalism', label: 'Journalism' },
    { value: 'education', label: 'Education' },
    { value: 'nursing', label: 'Nursing' },
    { value: 'pre-med', label: 'Pre-Med' },
    { value: 'pre-law', label: 'Pre-Law' },
    { value: 'art', label: 'Art' },
    { value: 'music', label: 'Music' },
    { value: 'theater', label: 'Theater' },
    { value: 'film', label: 'Film' },
    { value: 'design', label: 'Design' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'sociology', label: 'Sociology' },
    { value: 'anthropology', label: 'Anthropology' },
    { value: 'international-relations', label: 'International Relations' },
    { value: 'environmental-science', label: 'Environmental Science' },
    { value: 'neuroscience', label: 'Neuroscience' },
    { value: 'public-health', label: 'Public Health' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
      bounces={true}
    >
      <Text style={styles.title}>Let's get started</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

      <Input
        label="First name"
        placeholder="Enter your first name"
        value={localData.firstName}
        onChangeText={(value) => handleChange('firstName', value)}
        autoCapitalize="words"
        containerStyle={styles.inputGroup}
      />

      <Input
        label="Last name"
        placeholder="Enter your last name"
        value={localData.lastName}
        onChangeText={(value) => handleChange('lastName', value)}
        autoCapitalize="words"
        containerStyle={styles.inputGroup}
      />

      {/* Username Input */}
      <View style={styles.inputGroup}>
        <Input
          label="Username"
          placeholder="Choose a unique username"
          value={localData.username}
          onChangeText={(value) => handleChange('username', value)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* Validation indicator */}
        {localData.username.length > 0 && (
          <View style={styles.validationContainer}>
            {usernameValidation.isChecking ? (
              <>
                <ActivityIndicator size="small" color="#A45CFF" />
                <Text style={styles.validationText}>{usernameValidation.message}</Text>
              </>
            ) : usernameValidation.isValid ? (
              <>
                <Ionicons name="checkmark-circle" size={hp(2)} color="#4CAF50" />
                <Text style={[styles.validationText, styles.validationSuccess]}>
                  {usernameValidation.message}
                </Text>
              </>
            ) : usernameValidation.message ? (
              <>
                <Ionicons name="close-circle" size={hp(2)} color="#EF4444" />
                <Text style={[styles.validationText, styles.validationError]}>
                  {usernameValidation.message}
                </Text>
              </>
            ) : null}
          </View>
        )}
        <Text style={styles.helperText}>
          3-20 characters • Letters, numbers, and underscores only
        </Text>
      </View>

      {/* School Picker */}
      <Picker
        label="School"
        placeholder="Select your university"
        value={localData.school}
        options={US_SCHOOLS}
        onValueChange={(value) => handleChange('school', value)}
        searchable={true}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      {/* Age Picker */}
      <Picker
        label="Age"
        placeholder="Select your age"
        value={localData.age}
        options={ageOptions}
        onValueChange={(value) => handleChange('age', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      {/* Grade Picker */}
      <Picker
        label="Grade"
        placeholder="Select your grade"
        value={localData.grade}
        options={gradeOptions}
        onValueChange={(value) => handleChange('grade', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      {/* Gender Picker */}
      <Picker
        label="Gender"
        placeholder="Select your gender"
        value={localData.gender}
        options={genderOptions}
        onValueChange={(value) => handleChange('gender', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      {/* Major Picker */}
      <Picker
        label="Major"
        placeholder="Select your major"
        value={localData.major}
        options={majorOptions}
        onValueChange={(value) => handleChange('major', value)}
        searchable={true}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />
    </ScrollView>
  )
}

export default BasicInfoStep

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    paddingBottom: hp(20), // Extra padding for fixed navigation buttons at bottom
  },
  title: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: theme.colors.textPrimary || '#1A1A1A',
    fontFamily: theme.typography?.fontFamily?.heading || 'System',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: hp(2),
    color: theme.colors.textSecondary || '#8E8E8E',
    fontFamily: theme.typography?.fontFamily?.body || 'System',
    marginBottom: hp(5),
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: hp(2.5),
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(0.8),
  },
  validationText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary || '#8E8E8E',
    fontFamily: theme.typography?.fontFamily?.body || 'System',
  },
  validationSuccess: {
    color: '#4CAF50',
  },
  validationError: {
    color: '#EF4444',
  },
  helperText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary || '#8E8E8E',
    fontFamily: theme.typography?.fontFamily?.body || 'System',
    marginTop: hp(0.5),
    opacity: 0.7,
  },
})
