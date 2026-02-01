import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ALL_INTERESTS } from '../../../constants/interests'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'

const InterestsStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [localData, setLocalData] = useState({
    interests: formData.interests || [],
  })

  const handleInterestToggle = (interest) => {
    const newInterests = localData.interests.includes(interest)
      ? localData.interests.filter(i => i !== interest)
      : [...localData.interests, interest]
    
    const newData = { ...localData, interests: newInterests }
    setLocalData(newData)
    updateFormData(ONBOARDING_STEPS.INTERESTS, newData)
  }

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
      <Text style={styles.title}>What are you interested in?</Text>
      <Text style={styles.subtitle}>Help us find your people (optional)</Text>

      {/* Interests Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <Text style={styles.sectionSubtitle}>Select as many as you like</Text>
        <View style={styles.tagsContainer}>
          {ALL_INTERESTS.map((interest) => {
            const isSelected = localData.interests.includes(interest)
            return (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.tag,
                  isSelected && styles.tagSelected,
                ]}
                onPress={() => handleInterestToggle(interest)}
              >
                <Text
                  style={[
                    styles.tagText,
                    isSelected && styles.tagTextSelected,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

export default InterestsStep

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
  section: {
    marginBottom: hp(4),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.textPrimary || '#1A1A1A',
    fontFamily: theme.typography?.fontFamily?.heading || 'System',
    marginBottom: hp(0.5),
  },
  sectionSubtitle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary || '#8E8E8E',
    fontFamily: theme.typography?.fontFamily?.body || 'System',
    marginBottom: hp(2.5),
    opacity: 0.7,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(3.5),
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagSelected: {
    backgroundColor: theme.colors.primary || '#A45CFF',
    borderColor: theme.colors.primary || '#A45CFF',
  },
  tagText: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary || '#1A1A1A',
    fontFamily: theme.typography?.fontFamily?.body || 'System',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
