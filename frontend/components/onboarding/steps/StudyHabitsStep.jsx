import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import Picker from '../../Picker'

const StudyHabitsStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [localData, setLocalData] = useState({
    preferredStudyTime: formData.studyHabits?.preferredStudyTime || null,
    studyLocation: formData.studyHabits?.studyLocation || null,
    studyStyle: formData.studyHabits?.studyStyle || null,
    noiseLevel: formData.studyHabits?.noiseLevel || null,
  })

  const handleChange = (field, value) => {
    const newData = {
      ...localData,
      [field]: value,
    }
    setLocalData(newData)
    
    // Update store
    updateFormData(ONBOARDING_STEPS.STUDY_HABITS, {
      studyHabits: newData,
    })
  }

  const preferredStudyTimeOptions = [
    { value: 'morning', label: 'Morning (6am - 12pm)' },
    { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
    { value: 'evening', label: 'Evening (5pm - 10pm)' },
    { value: 'night', label: 'Night (10pm - 2am)' },
    { value: 'flexible', label: 'Flexible' },
  ]

  const studyLocationOptions = [
    { value: 'library', label: 'Library' },
    { value: 'dorm', label: 'Dorm Room' },
    { value: 'coffee-shop', label: 'Coffee Shop' },
    { value: 'campus-study-space', label: 'Campus Study Space' },
    { value: 'outdoors', label: 'Outdoors' },
    { value: 'home', label: 'Home' },
    { value: 'flexible', label: 'Flexible' },
  ]

  const studyStyleOptions = [
    { value: 'solo', label: 'Solo - I prefer studying alone' },
    { value: 'group', label: 'Group - I prefer studying with others' },
    { value: 'both', label: 'Both - I enjoy both solo and group study' },
  ]

  const noiseLevelOptions = [
    { value: 'quiet', label: 'Quiet - I need silence to focus' },
    { value: 'moderate', label: 'Moderate - Some background noise is okay' },
    { value: 'noisy', label: 'Noisy - I can focus with music/conversation' },
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
      <Text style={styles.title}>Study Habits</Text>
      <Text style={styles.subtitle}>Help us match you with study partners (optional)</Text>

      <Picker
        label="Preferred Study Time"
        placeholder="When do you like to study?"
        value={localData.preferredStudyTime}
        options={preferredStudyTimeOptions}
        onValueChange={(value) => handleChange('preferredStudyTime', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Study Location"
        placeholder="Where do you prefer to study?"
        value={localData.studyLocation}
        options={studyLocationOptions}
        onValueChange={(value) => handleChange('studyLocation', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Study Style"
        placeholder="How do you prefer to study?"
        value={localData.studyStyle}
        options={studyStyleOptions}
        onValueChange={(value) => handleChange('studyStyle', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />

      <Picker
        label="Noise Level Preference"
        placeholder="What noise level works best for you?"
        value={localData.noiseLevel}
        options={noiseLevelOptions}
        onValueChange={(value) => handleChange('noiseLevel', value)}
        containerStyle={styles.inputGroup}
        theme={ONBOARDING_THEME}
      />
    </ScrollView>
  )
}

export default StudyHabitsStep

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
