import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import Picker from '../../Picker'

const LivingHabitsStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [localData, setLocalData] = useState({
    sleepSchedule: formData.livingHabits?.sleepSchedule || null,
    cleanliness: formData.livingHabits?.cleanliness || null,
    socialLevel: formData.livingHabits?.socialLevel || null,
    guests: formData.livingHabits?.guests || null,
  })

  const handleChange = (field, value) => {
    const newData = {
      ...localData,
      [field]: value,
    }
    setLocalData(newData)
    
    // Update store
    updateFormData(ONBOARDING_STEPS.LIVING_HABITS, {
      livingHabits: newData,
    })
  }

  const sleepScheduleOptions = [
    { value: 'early-bird', label: 'Early Bird - I wake up early (before 7am)' },
    { value: 'night-owl', label: 'Night Owl - I stay up late (after 11pm)' },
    { value: 'flexible', label: 'Flexible - I adapt to different schedules' },
  ]

  const cleanlinessOptions = [
    { value: 'very-clean', label: 'Very Clean - I keep things organized and tidy' },
    { value: 'moderate', label: 'Moderate - I keep things reasonably clean' },
    { value: 'relaxed', label: 'Relaxed - I\'m okay with some mess' },
  ]

  const socialLevelOptions = [
    { value: 'very-social', label: 'Very Social - I love having people around' },
    { value: 'moderate', label: 'Moderate - I enjoy social time but need space too' },
    { value: 'private', label: 'Private - I prefer quiet and personal space' },
  ]

  const guestsOptions = [
    { value: 'often', label: 'Often - I have guests over regularly' },
    { value: 'sometimes', label: 'Sometimes - I have guests occasionally' },
    { value: 'rarely', label: 'Rarely - I prefer to keep guests to a minimum' },
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
      <Text style={styles.title}>Living Habits</Text>
      <Text style={styles.subtitle}>Help us find your perfect roommate (optional)</Text>

      <Picker
        label="Sleep Schedule"
        placeholder="What's your sleep schedule like?"
        value={localData.sleepSchedule}
        options={sleepScheduleOptions}
        onValueChange={(value) => handleChange('sleepSchedule', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Cleanliness Level"
        placeholder="How clean do you keep your space?"
        value={localData.cleanliness}
        options={cleanlinessOptions}
        onValueChange={(value) => handleChange('cleanliness', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Social Level"
        placeholder="How social are you at home?"
        value={localData.socialLevel}
        options={socialLevelOptions}
        onValueChange={(value) => handleChange('socialLevel', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Guest Policy"
        placeholder="How often do you have guests?"
        value={localData.guests}
        options={guestsOptions}
        onValueChange={(value) => handleChange('guests', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />
    </ScrollView>
  )
}

export default LivingHabitsStep

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: hp(2),
    paddingBottom: hp(20), // Extra padding for fixed navigation buttons at bottom
  },
  title: {
    fontSize: hp(4),
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'System',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: hp(2.2),
    color: '#8E8E8E',
    fontFamily: 'System',
    marginBottom: hp(4),
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: hp(3),
  },
})
