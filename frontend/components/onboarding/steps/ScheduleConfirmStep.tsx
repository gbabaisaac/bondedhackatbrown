/**
 * Schedule Confirmation Step
 * Shows final confirmation before creating section chats
 * Toggle for each section to join chat (ON by default)
 * Info about labs/recitations not creating chats
 */

import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { CourseDraft } from '../../../utils/schedule/parseSchedule'

interface ScheduleConfirmStepProps {
  courses: CourseDraft[]
  onConfirm: (selectedSections: Set<string>) => void
  onEdit?: () => void
  isSaving?: boolean
  onScroll: (event: any) => void
}

export default function ScheduleConfirmStep({ courses, onConfirm, onEdit, isSaving = false, onScroll }: ScheduleConfirmStepProps) {
  const styles = createStyles(ONBOARDING_THEME)
  const [localSaving, setLocalSaving] = useState(false)
  const [saveCompleted, setSaveCompleted] = useState(false)
  
  // Track which sections user wants to join (section key = courseCode-sectionId)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(() => {
    // Default: all sections selected
    const initial = new Set<string>()
    courses.forEach((course) => {
      // Only sections (not labs/recitations/PRO) are selected by default
      const hasSectionComponent = course.components.some((c) => c.type === 'Lecture')
      if (hasSectionComponent) {
        initial.add(`${course.courseCode}-${course.sectionId}`)
      }
    })
    return initial
  })

  const toggleSection = (sectionKey: string) => {
    const updated = new Set(selectedSections)
    if (updated.has(sectionKey)) {
      updated.delete(sectionKey)
    } else {
      updated.add(sectionKey)
    }
    setSelectedSections(updated)
  }

  const handleConfirm = () => {
    if (isSaving || localSaving) return
    setLocalSaving(true)
    onConfirm(selectedSections)
    // Assume save succeeded after a short delay for UI purposes
    // In real implementation, this should be driven by parent success callback
    setTimeout(() => {
      setLocalSaving(false)
      setSaveCompleted(true)
    }, 1500)
  }

  // Group courses by whether they have section components (eligible for chat)
  const sectionCourses = courses.filter((course) =>
    course.components.some((c) => c.type === 'Lecture')
  )
  const metadataCourses = courses.filter(
    (course) => !course.components.some((c) => c.type === 'Lecture')
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text style={styles.title}>Confirm Your Schedule</Text>
      <Text style={styles.subtitle}>Choose which sections to join for section-only chats</Text>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={hp(2.5)} color={ONBOARDING_THEME.colors.bondedPurple} />
        <Text style={styles.infoText}>
          Only sections create chats. Labs and recitations are saved but do not create chats automatically. You can create groups from them later.
        </Text>
      </View>

      {/* Section Courses (eligible for chat) */}
      {sectionCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section Chats</Text>
          {sectionCourses.map((course) => {
            const sectionKey = `${course.courseCode}-${course.sectionId}`
            const isSelected = selectedSections.has(sectionKey)
            const sectionComponent = course.components.find((c) => c.type === 'Lecture')

            return (
              <View key={sectionKey} style={styles.sectionCard}>
                <View style={styles.sectionInfo}>
                  <Text style={styles.courseCode}>{course.courseCode}</Text>
                  <Text style={styles.sectionDetails}>
                    Section {course.sectionId} • {sectionComponent?.days.join(', ')} •{' '}
                    {sectionComponent?.startTime} - {sectionComponent?.endTime}
                  </Text>
                </View>
                <Switch
                  value={isSelected}
                  onValueChange={() => toggleSection(sectionKey)}
                  trackColor={{ false: '#E0E0E0', true: ONBOARDING_THEME.colors.bondedPurple }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )
          })}
        </View>
      )}

      {/* Metadata Courses (labs, recitations, PRO) */}
      {metadataCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved for Later</Text>
          <Text style={styles.sectionSubtitle}>
            These won't create chats, but you can use them to create groups later
          </Text>
          {metadataCourses.map((course) => {
            const componentTypes = course.components.map((c) => c.type).join(', ')
            return (
              <View key={`${course.courseCode}-${course.sectionId}`} style={styles.metadataCard}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.metadataDetails}>
                  {componentTypes} • Section {course.sectionId}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.confirmButton, (isSaving || localSaving) ? styles.confirmButtonDisabled : null]}
        onPress={handleConfirm}
        disabled={isSaving || localSaving}
      >
        <Text style={styles.confirmButtonText}>{(isSaving || localSaving) ? 'Saving...' : 'Save Schedule'}</Text>
      </TouchableOpacity>

      {/* Edit Schedule button - only shows after successful save */}
      {saveCompleted && onEdit && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
        >
          <Text style={styles.editButtonText}>Edit Schedule</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingVertical: hp(3),
      paddingHorizontal: wp(5),
      paddingBottom: hp(20),
    },
    title: {
      fontSize: hp(3.5),
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: hp(1),
    },
    subtitle: {
      fontSize: hp(1.8),
      color: '#8E8E8E',
      marginBottom: hp(3),
    },
    infoBanner: {
      flexDirection: 'row',
      backgroundColor: '#F0F0FF',
      borderRadius: 8,
      padding: hp(1.5),
      marginBottom: hp(3),
      gap: wp(2),
    },
    infoText: {
      flex: 1,
      fontSize: hp(1.6),
      color: '#1A1A1A',
      lineHeight: hp(2.2),
    },
    section: {
      marginBottom: hp(3),
    },
    sectionTitle: {
      fontSize: hp(2.2),
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: hp(1),
    },
    sectionSubtitle: {
      fontSize: hp(1.6),
      color: '#8E8E8E',
      marginBottom: hp(1.5),
    },
    sectionCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: hp(1.5),
      marginBottom: hp(1),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionInfo: {
      flex: 1,
    },
    courseCode: {
      fontSize: hp(2),
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: hp(0.5),
    },
    sectionDetails: {
      fontSize: hp(1.5),
      color: '#8E8E8E',
    },
    metadataCard: {
      backgroundColor: '#F9F9F9',
      borderRadius: 8,
      padding: hp(1.5),
      marginBottom: hp(1),
    },
    metadataDetails: {
      fontSize: hp(1.5),
      color: '#8E8E8E',
      marginTop: hp(0.5),
    },
    confirmButton: {
      backgroundColor: theme.colors.bondedPurple,
      borderRadius: 16,
      paddingVertical: hp(2.5),
      paddingHorizontal: wp(6),
      alignItems: 'center',
      marginTop: hp(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: theme.colors.bondedPurple,
    },
    confirmButtonDisabled: {
      opacity: 0.6,
    },
    confirmButtonText: {
      fontSize: hp(2.2),
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    editButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: hp(1.5),
      alignItems: 'center',
      marginTop: hp(1),
      borderWidth: 1,
      borderColor: theme.colors.bondedPurple,
    },
    editButtonText: {
      fontSize: hp(1.8),
      fontWeight: '600',
      color: theme.colors.bondedPurple,
    },
  })





