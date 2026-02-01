/**
 * Schedule Edit Step
 * Allows user to review and edit parsed schedule data
 * Shows one card per course section with nested components
 * Supports adding new courses and editing course codes
 * Features: Time pickers, Course search from Supabase courses table
 */

import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import React, { useEffect, useState } from 'react'
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { supabase } from '../../../lib/supabase'
import { ComponentDraft, ComponentType, CourseDraft } from '../../../utils/schedule/parseSchedule'

// Import JavaScript hook with require for TypeScript compatibility
const useCurrentUserProfile: () => { data: { university_id: string } | null } = require('../../../hooks/useCurrentUserProfile').useCurrentUserProfile

interface Course {
  id: string
  subject_code: string
  course_number: string
  full_code: string
  course_name?: string
}

interface ScheduleEditStepProps {
  courses: CourseDraft[]
  onSave: (courses: CourseDraft[]) => void
  onScroll: (event: any) => void
}

export default function ScheduleEditStep({ courses: initialCourses, onSave, onScroll }: ScheduleEditStepProps) {
  const styles = createStyles(ONBOARDING_THEME)
  const [courses, setCourses] = useState<CourseDraft[]>(initialCourses)
  const { data: userProfile } = useCurrentUserProfile()

  // Course search modal state
  const [showCourseSearch, setShowCourseSearch] = useState(false)
  const [courseSearchQuery, setCourseSearchQuery] = useState('')
  const [courseSearchResults, setCourseSearchResults] = useState<Course[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null)

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start')
  const [timePickerValue, setTimePickerValue] = useState(new Date())
  const [editingTimeContext, setEditingTimeContext] = useState<{
    courseIndex: number
    componentIndex: number
  } | null>(null)

  // Search courses from Supabase
  useEffect(() => {
    const searchCourses = async () => {
      if (courseSearchQuery.length < 2 || !userProfile?.university_id) {
        setCourseSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        // Smart search: handle "CSC 110" format by splitting into subject and number
        const trimmedQuery = courseSearchQuery.trim()
        const parts = trimmedQuery.split(/\s+/)

        let query = supabase
          .from('courses')
          .select('id, subject_code, course_number')
          .eq('university_id', userProfile.university_id)

        if (parts.length >= 2) {
          // Multi-part search like "CSC 110" - search by subject AND number
          const subjectPart = parts[0]
          const numberPart = parts.slice(1).join(' ')
          query = query
            .ilike('subject_code', `%${subjectPart}%`)
            .ilike('course_number', `%${numberPart}%`)
        } else {
          // Single word search - search subject OR number
          query = query.or(`subject_code.ilike.%${trimmedQuery}%,course_number.ilike.%${trimmedQuery}%`)
        }

        const { data, error } = await query.limit(20)

        if (error) throw error

        // Transform data to match interface
        const transformedData = (data || []).map(course => ({
          ...course,
          full_code: `${course.subject_code} ${course.course_number}`
        }))

        setCourseSearchResults(transformedData)
      } catch (error) {
        console.error('Error searching courses:', error)
        setCourseSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(searchCourses, 300)
    return () => clearTimeout(debounce)
  }, [courseSearchQuery, userProfile?.university_id])

  const updateCourse = (index: number, updates: Partial<CourseDraft>) => {
    const updated = [...courses]
    updated[index] = { ...updated[index], ...updates }
    setCourses(updated)
  }

  const updateComponent = (courseIndex: number, componentIndex: number, updates: Partial<ComponentDraft>) => {
    const updated = [...courses]
    updated[courseIndex].components[componentIndex] = {
      ...updated[courseIndex].components[componentIndex],
      ...updates,
    }
    setCourses(updated)
  }

  const deleteComponent = (courseIndex: number, componentIndex: number) => {
    Alert.alert('Delete Component', 'Are you sure you want to delete this component?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...courses]
          updated[courseIndex].components.splice(componentIndex, 1)
          if (updated[courseIndex].components.length === 0) {
            updated.splice(courseIndex, 1)
          }
          setCourses(updated)
        },
      },
    ])
  }

  const deleteCourse = (courseIndex: number) => {
    Alert.alert('Delete Course', 'Are you sure you want to delete this entire course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...courses]
          updated.splice(courseIndex, 1)
          setCourses(updated)
        },
      },
    ])
  }

  const handleAddCourse = () => {
    const newCourse: CourseDraft = {
      courseCode: '',
      sectionId: '0001',
      components: [
        {
          type: 'Lecture' as ComponentType,
          days: [],
          startTime: '',
          endTime: '',
          location: '',
        },
      ],
    }
    setCourses([...courses, newCourse])
  }

  const handleAddComponent = (courseIndex: number, type: ComponentType) => {
    const updated = [...courses]
    updated[courseIndex].components.push({
      type,
      days: [],
      startTime: '',
      endTime: '',
      location: '',
    })
    setCourses(updated)
  }

  const openCourseSearch = (courseIndex: number) => {
    setEditingCourseIndex(courseIndex)
    setCourseSearchQuery(courses[courseIndex].courseCode || '')
    setShowCourseSearch(true)
  }

  const selectCourse = (course: Course) => {
    if (editingCourseIndex !== null) {
      updateCourse(editingCourseIndex, { courseCode: course.full_code })
    }
    setShowCourseSearch(false)
    setCourseSearchQuery('')
    setEditingCourseIndex(null)
  }

  const openTimePicker = (courseIndex: number, componentIndex: number, mode: 'start' | 'end') => {
    const component = courses[courseIndex].components[componentIndex]
    const timeString = mode === 'start' ? component.startTime : component.endTime

    // Parse existing time or default to 9:00 AM
    let date = new Date()
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number)
      date.setHours(hours, minutes, 0, 0)
    } else {
      date.setHours(9, 0, 0, 0)
    }

    setTimePickerValue(date)
    setTimePickerMode(mode)
    setEditingTimeContext({ courseIndex, componentIndex })
    setShowTimePicker(true)
  }

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false)
    }

    if (selectedDate && editingTimeContext) {
      const hours = selectedDate.getHours().toString().padStart(2, '0')
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`

      const { courseIndex, componentIndex } = editingTimeContext
      const update = timePickerMode === 'start' ? { startTime: timeString } : { endTime: timeString }
      updateComponent(courseIndex, componentIndex, update)
    }
  }

  const confirmTimePicker = () => {
    if (editingTimeContext) {
      const hours = timePickerValue.getHours().toString().padStart(2, '0')
      const minutes = timePickerValue.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`

      const { courseIndex, componentIndex } = editingTimeContext
      const update = timePickerMode === 'start' ? { startTime: timeString } : { endTime: timeString }
      updateComponent(courseIndex, componentIndex, update)
    }
    setShowTimePicker(false)
    setEditingTimeContext(null)
  }

  const formatTimeForDisplay = (time: string) => {
    if (!time) return 'Select time'
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const componentTypes: ComponentType[] = ['Lecture', 'Lab', 'Recitation', 'PRO']

  const handleSave = () => {
    const invalidCourses = courses.filter((c) => !c.courseCode || c.courseCode.trim() === '')
    if (invalidCourses.length > 0) {
      Alert.alert('Missing Course Code', 'Please select a course for all entries.')
      return
    }

    const validCourses = courses.filter((c) => c.components.length > 0 && c.courseCode.trim() !== '')
    if (validCourses.length === 0) {
      Alert.alert('No Courses', 'Please add at least one course to continue.')
      return
    }
    onSave(validCourses)
  }

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Review Your Schedule</Text>
        <Text style={styles.subtitle}>Tap course codes to search, tap times to pick</Text>

        {courses.map((course, courseIndex) => (
          <View key={`course-${courseIndex}`} style={styles.courseCard}>
            {/* Course Header */}
            <View style={styles.courseHeader}>
              <View style={styles.courseInfo}>
                <TouchableOpacity style={styles.courseCodeButton} onPress={() => openCourseSearch(courseIndex)}>
                  <Text style={[styles.courseCodeText, !course.courseCode && styles.courseCodePlaceholder]}>
                    {course.courseCode || 'Tap to select course'}
                  </Text>
                  <Ionicons name="search" size={hp(2)} color={ONBOARDING_THEME.colors.primary} />
                </TouchableOpacity>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>Section</Text>
                  <TextInput
                    style={styles.sectionInput}
                    value={course.sectionId}
                    onChangeText={(text) => updateCourse(courseIndex, { sectionId: text })}
                    placeholder="0001"
                    placeholderTextColor="#BDBDBD"
                  />
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteCourse(courseIndex)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={hp(2.5)} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            {/* Components */}
            {course.components.map((component, componentIndex) => (
              <View key={componentIndex} style={styles.componentCard}>
                <View style={styles.componentHeader}>
                  <Text style={styles.componentType}>{component.type}</Text>
                  <TouchableOpacity
                    onPress={() => deleteComponent(courseIndex, componentIndex)}
                    style={styles.deleteComponentButton}
                  >
                    <Ionicons name="close-circle-outline" size={hp(2)} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {/* Days */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Days</Text>
                  <View style={styles.daysContainer}>
                    {dayOptions.map((day) => {
                      const isSelected = component.days.includes(day)
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                          onPress={() => {
                            const newDays = isSelected
                              ? component.days.filter((d) => d !== day)
                              : [...component.days, day].sort()
                            updateComponent(courseIndex, componentIndex, { days: newDays })
                          }}
                        >
                          <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
                            {day.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* Time - Now with pickers */}
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(courseIndex, componentIndex, 'start')}
                    >
                      <Ionicons name="time-outline" size={hp(2)} color={ONBOARDING_THEME.colors.primary} />
                      <Text style={[styles.timePickerText, !component.startTime && styles.timePlaceholder]}>
                        {formatTimeForDisplay(component.startTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.fieldLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(courseIndex, componentIndex, 'end')}
                    >
                      <Ionicons name="time-outline" size={hp(2)} color={ONBOARDING_THEME.colors.primary} />
                      <Text style={[styles.timePickerText, !component.endTime && styles.timePlaceholder]}>
                        {formatTimeForDisplay(component.endTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={component.location}
                    onChangeText={(text) => updateComponent(courseIndex, componentIndex, { location: text })}
                    placeholder="Building Room"
                    placeholderTextColor="#BDBDBD"
                  />
                </View>
              </View>
            ))}

            {/* Add Component Button */}
            <View style={styles.addComponentContainer}>
              <Text style={styles.addComponentLabel}>Add:</Text>
              {componentTypes
                .filter((type) => !course.components.some((c) => c.type === type))
                .map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.addComponentChip}
                    onPress={() => handleAddComponent(courseIndex, type)}
                  >
                    <Ionicons name="add" size={hp(1.4)} color={ONBOARDING_THEME.colors.primary} />
                    <Text style={styles.addComponentText}>{type}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        ))}

        {/* Add Course Button */}
        <TouchableOpacity style={styles.addCourseButton} onPress={handleAddCourse}>
          <Ionicons name="add-circle-outline" size={hp(2.5)} color={ONBOARDING_THEME.colors.bondedPurple} />
          <Text style={styles.addCourseText}>Add Another Course</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Course Search Modal */}
      <Modal visible={showCourseSearch} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Courses</Text>
            <TouchableOpacity onPress={() => setShowCourseSearch(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={hp(3)} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={hp(2.5)} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={courseSearchQuery}
              onChangeText={setCourseSearchQuery}
              placeholder="Search by course code (e.g., CSC 305)"
              placeholderTextColor="#999"
              autoFocus
              autoCapitalize="characters"
            />
            {courseSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCourseSearchQuery('')}>
                <Ionicons name="close-circle" size={hp(2.5)} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {searchLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : courseSearchResults.length === 0 && courseSearchQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={hp(5)} color="#CCC" />
              <Text style={styles.emptyText}>No courses found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={courseSearchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.courseSearchItem} onPress={() => selectCourse(item)}>
                  <View style={styles.courseSearchItemContent}>
                    <Text style={styles.courseSearchCode}>{item.full_code}</Text>
                    <Text style={styles.courseSearchSubject}>{item.subject_code} {item.course_number}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={hp(2.5)} color="#CCC" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Manual entry option */}
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => {
              if (editingCourseIndex !== null && courseSearchQuery.trim()) {
                updateCourse(editingCourseIndex, { courseCode: courseSearchQuery.toUpperCase().trim() })
              }
              setShowCourseSearch(false)
              setCourseSearchQuery('')
            }}
          >
            <Ionicons name="create-outline" size={hp(2)} color={ONBOARDING_THEME.colors.primary} />
            <Text style={styles.manualEntryText}>
              {courseSearchQuery.trim() ? `Use "${courseSearchQuery.toUpperCase()}"` : 'Enter manually'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal visible={showTimePicker} animationType="fade" transparent>
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimePicker(false)
                    setEditingTimeContext(null)
                  }}
                >
                  <Text style={styles.timePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>{timePickerMode === 'start' ? 'Start Time' : 'End Time'}</Text>
                <TouchableOpacity onPress={confirmTimePicker}>
                  <Text style={styles.timePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timePickerValue}
                mode="time"
                display="spinner"
                onChange={(event, date) => date && setTimePickerValue(date)}
                minuteInterval={5}
                textColor={ONBOARDING_THEME.colors.textPrimary}
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Picker */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          minuteInterval={5}
          textColor={ONBOARDING_THEME.colors.textPrimary}
          themeVariant="light"
        />
      )}
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingVertical: hp(2),
      paddingHorizontal: wp(5),
      paddingBottom: hp(20),
    },
    title: {
      fontSize: hp(3.2),
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: hp(0.5),
    },
    subtitle: {
      fontSize: hp(1.7),
      color: '#8E8E8E',
      marginBottom: hp(2.5),
      lineHeight: hp(2.4),
    },
    courseCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: hp(2),
      marginBottom: hp(2),
      shadowColor: '#A45CFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    courseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: hp(1.5),
      paddingBottom: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(164, 92, 255, 0.1)',
    },
    courseInfo: {
      flex: 1,
    },
    courseCodeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(164, 92, 255, 0.06)',
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3),
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: 'rgba(164, 92, 255, 0.2)',
      gap: wp(2),
    },
    courseCodeText: {
      fontSize: hp(2),
      fontWeight: '700',
      color: '#1A1A1A',
      flex: 1,
    },
    courseCodePlaceholder: {
      color: '#BDBDBD',
      fontWeight: '500',
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: hp(1),
    },
    sectionLabel: {
      fontSize: hp(1.5),
      color: '#BDBDBD',
      marginRight: wp(1),
    },
    sectionInput: {
      fontSize: hp(1.5),
      color: '#8E8E8E',
      padding: 0,
      minWidth: wp(15),
      fontWeight: '500',
    },
    deleteButton: {
      padding: hp(1),
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
      borderRadius: 10,
      marginLeft: wp(2),
    },
    componentCard: {
      backgroundColor: 'rgba(164, 92, 255, 0.04)',
      borderRadius: 12,
      padding: hp(1.8),
      marginTop: hp(1.2),
      borderWidth: 1,
      borderColor: 'rgba(164, 92, 255, 0.1)',
    },
    componentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(1.2),
    },
    componentType: {
      fontSize: hp(1.7),
      fontWeight: '700',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    deleteComponentButton: {
      padding: hp(0.5),
      opacity: 0.6,
    },
    field: {
      marginBottom: hp(1.5),
    },
    fieldLabel: {
      fontSize: hp(1.5),
      fontWeight: '600',
      color: '#666',
      marginBottom: hp(0.8),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    daysContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: wp(1.5),
    },
    dayChip: {
      paddingVertical: hp(1),
      paddingHorizontal: wp(3.5),
      borderRadius: 20,
      backgroundColor: '#F8F8F8',
      borderWidth: 1.5,
      borderColor: '#D0D0D0',
    },
    dayChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    dayChipText: {
      fontSize: hp(1.4),
      color: '#4A4A4A',
      fontWeight: '700',
    },
    dayChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    timeRow: {
      flexDirection: 'row',
      gap: wp(3),
      marginBottom: hp(1.5),
    },
    timeField: {
      flex: 1,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#E8E8E8',
      borderRadius: 10,
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3),
      backgroundColor: '#FFFFFF',
      gap: wp(2),
    },
    timePickerText: {
      fontSize: hp(1.7),
      color: '#333',
      fontWeight: '500',
    },
    timePlaceholder: {
      color: '#BDBDBD',
    },
    textInput: {
      borderWidth: 1.5,
      borderColor: '#E8E8E8',
      borderRadius: 10,
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3),
      fontSize: hp(1.7),
      backgroundColor: '#FFFFFF',
      color: '#333',
    },
    addComponentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: hp(1.8),
      flexWrap: 'wrap',
      gap: wp(2),
    },
    addComponentLabel: {
      fontSize: hp(1.4),
      color: '#BDBDBD',
      marginRight: wp(0.5),
      fontWeight: '500',
    },
    addComponentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: hp(0.7),
      paddingHorizontal: wp(3),
      borderRadius: 20,
      backgroundColor: 'rgba(164, 92, 255, 0.08)',
    },
    addComponentText: {
      fontSize: hp(1.3),
      color: theme.colors.primary,
      fontWeight: '600',
      marginLeft: wp(0.5),
    },
    addCourseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp(1.8),
      borderRadius: 14,
      backgroundColor: 'rgba(164, 92, 255, 0.06)',
      borderWidth: 1.5,
      borderColor: 'rgba(164, 92, 255, 0.2)',
      marginBottom: hp(2),
    },
    addCourseText: {
      fontSize: hp(1.7),
      color: theme.colors.bondedPurple,
      fontWeight: '600',
      marginLeft: wp(2),
    },
    saveButton: {
      backgroundColor: theme.colors.bondedPurple,
      borderRadius: 16,
      paddingVertical: hp(2.5),
      paddingHorizontal: wp(6),
      alignItems: 'center',
      marginTop: hp(3),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: theme.colors.bondedPurple,
    },
    saveButtonText: {
      fontSize: hp(2.2),
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      backgroundColor: '#F8F8FC',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
      fontSize: hp(2.2),
      fontWeight: '700',
      color: '#1A1A1A',
    },
    modalCloseButton: {
      padding: hp(0.5),
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      marginHorizontal: wp(5),
      marginTop: hp(2),
      borderRadius: 12,
      paddingHorizontal: wp(4),
      borderWidth: 1.5,
      borderColor: '#E8E8E8',
    },
    searchIcon: {
      marginRight: wp(2),
    },
    searchInput: {
      flex: 1,
      paddingVertical: hp(1.5),
      fontSize: hp(1.8),
      color: '#333',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: hp(1.7),
      color: '#999',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: hp(10),
    },
    emptyText: {
      fontSize: hp(1.9),
      fontWeight: '600',
      color: '#666',
      marginTop: hp(2),
    },
    emptySubtext: {
      fontSize: hp(1.5),
      color: '#999',
      marginTop: hp(0.5),
    },
    searchResultsList: {
      paddingHorizontal: wp(5),
      paddingTop: hp(2),
    },
    courseSearchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(4),
      borderRadius: 12,
      marginBottom: hp(1),
      borderWidth: 1,
      borderColor: '#F0F0F0',
    },
    courseSearchItemContent: {
      flex: 1,
    },
    courseSearchCode: {
      fontSize: hp(1.9),
      fontWeight: '700',
      color: '#1A1A1A',
    },
    courseSearchSubject: {
      fontSize: hp(1.4),
      color: '#999',
      marginTop: hp(0.3),
    },
    manualEntryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(164, 92, 255, 0.08)',
      marginHorizontal: wp(5),
      marginBottom: hp(4),
      paddingVertical: hp(1.5),
      borderRadius: 12,
      gap: wp(2),
    },
    manualEntryText: {
      fontSize: hp(1.6),
      fontWeight: '600',
      color: theme.colors.primary,
    },
    // Time Picker Modal Styles
    timePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
      zIndex: 1000,
      elevation: 1000,
    },
    timePickerModal: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: hp(4),
      zIndex: 1001,
      elevation: 1001,
    },
    timePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    timePickerTitle: {
      fontSize: hp(1.9),
      fontWeight: '700',
      color: '#1A1A1A',
    },
    timePickerCancel: {
      fontSize: hp(1.7),
      color: '#999',
    },
    timePickerDone: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: theme.colors.primary,
    },
  })
