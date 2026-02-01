/**
 * Schedule Entry Step
 * Beautiful manual class entry interface
 */

import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import { hp, wp } from '../../../helpers/common'
import { parseScheduleImage } from '../../../services/scheduleParser'
import { pickScheduleImage, takeSchedulePhoto } from '../../../utils/ocr/extractText'
import { getFriendlyErrorMessage } from '../../../utils/userFacingErrors'

interface ScheduleUploadStepProps {
  formData: any
  updateFormData: (step: string, data: any) => void
  onScroll: (event: any) => void
  onScheduleParsed: (parsedSchedule: any) => void
}

interface ClassEntry {
  id: string
  courseCode: string
  courseName: string
  professor: string
  days: string[]
  startTime: string
  endTime: string
  location: string
}

const DAYS = [
  { key: 'M', label: 'Mon' },
  { key: 'T', label: 'Tue' },
  { key: 'W', label: 'Wed' },
  { key: 'R', label: 'Thu' },
  { key: 'F', label: 'Fri' },
]

const createEmptyClass = (): ClassEntry => ({
  id: Date.now().toString(),
  courseCode: '',
  courseName: '',
  professor: '',
  days: [],
  startTime: '',
  endTime: '',
  location: '',
})

export default function ScheduleUploadStep({
  formData,
  updateFormData,
  onScroll,
  onScheduleParsed,
}: ScheduleUploadStepProps) {
  const styles = createStyles(ONBOARDING_THEME)

  // Initialize with existing classes or one empty class
  const initialClasses = formData.classSchedule?.parsedSchedule?.courses?.map((c: any, index: number) => ({
    id: index.toString(),
    courseCode: c.courseCode || '',
    courseName: c.courseName || '',
    professor: c.professor || '',
    days: c.components?.[0]?.days || [],
    startTime: c.components?.[0]?.startTime || '',
    endTime: c.components?.[0]?.endTime || '',
    location: c.components?.[0]?.location || '',
  })) || [createEmptyClass()]

  const [classes, setClasses] = useState<ClassEntry[]>(initialClasses)
  const [expandedId, setExpandedId] = useState<string | null>(classes[0]?.id || null)
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = async (useCamera = false) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const uri = useCamera ? await takeSchedulePhoto() : await pickScheduleImage()

      if (!uri) return

      setIsScanning(true)
      const parsedClasses = await parseScheduleImage(uri)

      if (parsedClasses && parsedClasses.length > 0) {
        const dayMap: Record<string, string> = {
          'Monday': 'M',
          'Tuesday': 'T',
          'Wednesday': 'W',
          'Thursday': 'R',
          'Friday': 'F',
        }

        const newClasses: ClassEntry[] = parsedClasses.map((c: any, index: number) => ({
          id: `scanned-${Date.now()}-${index}`,
          courseCode: c.class_code || '',
          courseName: c.class_name || '',
          professor: c.professor || '',
          days: c.days_of_week.map((d: string) => dayMap[d] || d.charAt(0)) || [],
          startTime: c.start_time || '',
          endTime: c.end_time || '',
          location: c.location || '',
        }))

        const finalClasses = [...classes.filter(c => c.courseCode), ...newClasses]
        setClasses(finalClasses.length > 0 ? finalClasses : [createEmptyClass()])
        saveSchedule(finalClasses.length > 0 ? finalClasses : [createEmptyClass()])
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        if (newClasses.length > 0) {
          setExpandedId(newClasses[0].id)
        }
      }
    } catch (error: any) {
      console.error('Scan failed:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Scan Failed', getFriendlyErrorMessage(error, 'Could not parse schedule. Please try a clearer photo.'))
    } finally {
      setIsScanning(false)
    }
  }

  const updateClass = (id: string, field: keyof ClassEntry, value: any) => {
    const updatedClasses = classes.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    )
    setClasses(updatedClasses)
    saveSchedule(updatedClasses)
  }

  const toggleDay = (classId: string, day: string) => {
    const classEntry = classes.find(c => c.id === classId)
    if (!classEntry) return

    const newDays = classEntry.days.includes(day)
      ? classEntry.days.filter(d => d !== day)
      : [...classEntry.days, day]

    updateClass(classId, 'days', newDays)
  }

  const addClass = () => {
    const newClass = createEmptyClass()
    const updatedClasses = [...classes, newClass]
    setClasses(updatedClasses)
    setExpandedId(newClass.id)
    saveSchedule(updatedClasses)
  }

  const removeClass = (id: string) => {
    if (classes.length <= 1) return
    const updatedClasses = classes.filter(c => c.id !== id)
    setClasses(updatedClasses)
    if (expandedId === id) {
      setExpandedId(updatedClasses[0]?.id || null)
    }
    saveSchedule(updatedClasses)
  }

  const saveSchedule = (classesToSave: ClassEntry[]) => {
    const parsedSchedule = {
      courses: classesToSave.map(c => ({
        courseCode: c.courseCode,
        courseName: c.courseName,
        professor: c.professor,
        sectionId: '0001',
        components: [
          {
            type: 'Lecture' as const,
            days: c.days,
            startTime: c.startTime,
            endTime: c.endTime,
            location: c.location,
          },
        ],
      })),
      rawText: '',
    }

    updateFormData(ONBOARDING_STEPS.CLASS_SCHEDULE, {
      classSchedule: {
        parsedSchedule,
        courses: parsedSchedule.courses,
        rawText: parsedSchedule.rawText || '',
      },
    })
    onScheduleParsed(parsedSchedule)
  }

  const getClassSummary = (c: ClassEntry) => {
    if (!c.courseCode) return 'New Class'
    const daysStr = c.days.length > 0 ? c.days.join('') : ''
    const timeStr = c.startTime ? ` • ${c.startTime}` : ''
    return `${c.courseCode}${daysStr ? ` • ${daysStr}` : ''}${timeStr}`
  }

  const isClassComplete = (c: ClassEntry) => {
    return c.courseCode.trim().length > 0
  }

  const completedCount = classes.filter(isClassComplete).length

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="book-outline" size={hp(4)} color={ONBOARDING_THEME.colors.bondedPurple} />
            </View>
          </View>

          <Text style={styles.title}>Add Your Classes</Text>
          <Text style={styles.subtitle}>Connect with your classmates</Text>

          {completedCount > 0 && (
            <View style={styles.progressBadge}>
              <Ionicons name="checkmark-circle" size={hp(1.8)} color="#4CAF50" />
              <Text style={styles.progressText}>{completedCount} class{completedCount !== 1 ? 'es' : ''} added</Text>
            </View>
          )}
        </View>

        {/* OCR Scan Options */}
        <View style={styles.scanContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => handleScan(false)}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            <View style={styles.scanIconContainer}>
              <Ionicons name="image-outline" size={hp(2.5)} color="#FFFFFF" />
            </View>
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanButton, styles.scanButtonOutline]}
            onPress={() => handleScan(true)}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={hp(2.5)} color={ONBOARDING_THEME.colors.bondedPurple} />
            <Text style={[styles.scanButtonText, styles.scanButtonTextOutline]}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Class Cards */}
        <View style={styles.classesContainer}>
          {classes.map((classEntry, index) => (
            <View key={classEntry.id} style={styles.classCard}>
              {/* Card Header - Always Visible */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedId(expandedId === classEntry.id ? null : classEntry.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <View style={[
                    styles.classNumber,
                    isClassComplete(classEntry) && styles.classNumberComplete
                  ]}>
                    {isClassComplete(classEntry) ? (
                      <Ionicons name="checkmark" size={hp(1.8)} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.classNumberText}>{index + 1}</Text>
                    )}
                  </View>
                  <Text style={styles.classSummary} numberOfLines={1}>
                    {getClassSummary(classEntry)}
                  </Text>
                </View>

                <View style={styles.cardHeaderRight}>
                  {classes.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeClass(classEntry.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={hp(2)} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                  <Ionicons
                    name={expandedId === classEntry.id ? "chevron-up" : "chevron-down"}
                    size={hp(2.5)}
                    color="#8E8E8E"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded Form */}
              {expandedId === classEntry.id && (
                <View style={styles.cardBody}>
                  {/* Course Code */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Course Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., CS 101, MATH 201"
                      placeholderTextColor="#BDBDBD"
                      value={classEntry.courseCode}
                      onChangeText={(text) => updateClass(classEntry.id, 'courseCode', text.toUpperCase())}
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* Course Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Course Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Introduction to Computer Science"
                      placeholderTextColor="#BDBDBD"
                      value={classEntry.courseName}
                      onChangeText={(text) => updateClass(classEntry.id, 'courseName', text)}
                    />
                  </View>

                  {/* Professor */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Professor</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Dr. Smith"
                      placeholderTextColor="#BDBDBD"
                      value={classEntry.professor}
                      onChangeText={(text) => updateClass(classEntry.id, 'professor', text)}
                    />
                  </View>

                  {/* Days */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Days</Text>
                    <View style={styles.daysContainer}>
                      {DAYS.map(day => (
                        <TouchableOpacity
                          key={day.key}
                          style={[
                            styles.dayButton,
                            classEntry.days.includes(day.key) && styles.dayButtonActive
                          ]}
                          onPress={() => toggleDay(classEntry.id, day.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.dayButtonText,
                            classEntry.days.includes(day.key) && styles.dayButtonTextActive
                          ]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Time Row */}
                  <View style={styles.timeRow}>
                    <View style={[styles.inputGroup, styles.timeInput]}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 9:00 AM"
                        placeholderTextColor="#BDBDBD"
                        value={classEntry.startTime}
                        onChangeText={(text) => updateClass(classEntry.id, 'startTime', text)}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.timeInput]}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 10:30 AM"
                        placeholderTextColor="#BDBDBD"
                        value={classEntry.endTime}
                        onChangeText={(text) => updateClass(classEntry.id, 'endTime', text)}
                      />
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Room 101, Science Building"
                      placeholderTextColor="#BDBDBD"
                      value={classEntry.location}
                      onChangeText={(text) => updateClass(classEntry.id, 'location', text)}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Add Class Button */}
        <TouchableOpacity
          style={styles.addClassButton}
          onPress={addClass}
          activeOpacity={0.7}
        >
          <View style={styles.addClassIconContainer}>
            <Ionicons name="add" size={hp(2.5)} color={ONBOARDING_THEME.colors.bondedPurple} />
          </View>
          <Text style={styles.addClassText}>Add Another Class</Text>
        </TouchableOpacity>

        {/* Helper Text */}
        <View style={styles.helperContainer}>
          <Ionicons name="information-circle-outline" size={hp(2)} color="#BDBDBD" />
          <Text style={styles.helperText}>
            You can always update your schedule later in settings. Only the course code is required.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingVertical: hp(2),
      paddingHorizontal: wp(5),
      paddingBottom: hp(20),
    },
    header: {
      alignItems: 'center',
      marginBottom: hp(3),
    },
    iconContainer: {
      marginBottom: hp(2),
    },
    iconBackground: {
      width: hp(8),
      height: hp(8),
      borderRadius: hp(4),
      backgroundColor: `${theme.colors.bondedPurple}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: hp(3.2),
      fontWeight: '800',
      color: '#1A1A1A',
      textAlign: 'center',
      marginBottom: hp(0.5),
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: hp(1.8),
      fontWeight: '500',
      color: '#8E8E8E',
      textAlign: 'center',
    },
    progressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      paddingVertical: hp(0.6),
      paddingHorizontal: wp(3),
      borderRadius: 20,
      marginTop: hp(1.5),
      gap: wp(1.5),
    },
    progressText: {
      fontSize: hp(1.5),
      fontWeight: '600',
      color: '#4CAF50',
    },
    classesContainer: {
      gap: hp(1.5),
    },
    classCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.04)',
    },
    scanContainer: {
      flexDirection: 'row',
      gap: wp(3),
      marginBottom: hp(3),
    },
    scanButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ONBOARDING_THEME.colors.bondedPurple,
      paddingVertical: hp(1.8),
      borderRadius: 14,
      gap: wp(2),
      shadowColor: ONBOARDING_THEME.colors.bondedPurple,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    scanButtonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: ONBOARDING_THEME.colors.bondedPurple,
      shadowOpacity: 0,
      elevation: 0,
    },
    scanIconContainer: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      padding: wp(1),
      borderRadius: 8,
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: hp(1.7),
      fontWeight: '700',
    },
    scanButtonTextOutline: {
      color: ONBOARDING_THEME.colors.bondedPurple,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: hp(3),
      gap: wp(3),
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#E0E0E0',
    },
    dividerText: {
      fontSize: hp(1.2),
      fontWeight: '700',
      color: '#BDBDBD',
      letterSpacing: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(4),
      backgroundColor: '#FAFAFA',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    classNumber: {
      width: hp(3.5),
      height: hp(3.5),
      borderRadius: hp(1.75),
      backgroundColor: '#E0E0E0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(3),
    },
    classNumberComplete: {
      backgroundColor: '#4CAF50',
    },
    classNumberText: {
      fontSize: hp(1.6),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    classSummary: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: '#1A1A1A',
      flex: 1,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
    },
    deleteButton: {
      padding: wp(1),
    },
    cardBody: {
      padding: wp(4),
      paddingTop: hp(1),
      gap: hp(1.5),
    },
    inputGroup: {
      gap: hp(0.6),
    },
    inputLabel: {
      fontSize: hp(1.5),
      fontWeight: '600',
      color: '#666666',
      marginLeft: wp(1),
    },
    textInput: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      paddingVertical: hp(1.5),
      paddingHorizontal: wp(4),
      fontSize: hp(1.7),
      color: '#1A1A1A',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    daysContainer: {
      flexDirection: 'row',
      gap: wp(2),
    },
    dayButton: {
      flex: 1,
      paddingVertical: hp(1.2),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    dayButtonActive: {
      backgroundColor: `${theme.colors.bondedPurple}15`,
      borderColor: theme.colors.bondedPurple,
    },
    dayButtonText: {
      fontSize: hp(1.5),
      fontWeight: '600',
      color: '#8E8E8E',
    },
    dayButtonTextActive: {
      color: theme.colors.bondedPurple,
    },
    timeRow: {
      flexDirection: 'row',
      gap: wp(3),
    },
    timeInput: {
      flex: 1,
    },
    addClassButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp(1.8),
      marginTop: hp(2),
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.bondedPurple,
      borderStyle: 'dashed',
      backgroundColor: `${theme.colors.bondedPurple}08`,
    },
    addClassIconContainer: {
      width: hp(3.5),
      height: hp(3.5),
      borderRadius: hp(1.75),
      backgroundColor: `${theme.colors.bondedPurple}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(2.5),
    },
    addClassText: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: theme.colors.bondedPurple,
    },
    helperContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: hp(2.5),
      paddingHorizontal: wp(2),
      gap: wp(2),
    },
    helperText: {
      flex: 1,
      fontSize: hp(1.4),
      color: '#BDBDBD',
      lineHeight: hp(2),
    },
  })
