import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../../components/AppTopBar'
import BottomNav from '../../components/BottomNav'
import Picker from '../../components/Picker'
import { MapPin } from '../../components/Icons'
import { useClubsContext } from '../../contexts/ClubsContext'
import { hp, wp } from '../../helpers/common'
import { formatTime } from '../../utils/dateFormatters'
import { useAppTheme } from '../theme'

const CATEGORIES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'arts', label: 'Arts' },
  { value: 'service', label: 'Service' },
  { value: 'business', label: 'Business' },
  { value: 'social', label: 'Social' },
]

export default function CreateOrg() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  
  // Hooks must be called at top level unconditionally
  const clubsContext = useClubsContext()
  const createClub = clubsContext?.createClub
  const orgsAvailable = clubsContext?.orgsAvailable !== false
  
  // Debug: Log to see if component is rendering
  console.log('CreateOrg rendering - clubsContext:', !!clubsContext, 'createClub:', !!createClub)
  
  // Check if createClub function is available
  if (!clubsContext || !createClub) {
    console.warn('CreateOrg: Missing context or createClub function')
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="Create Organization"
            onPressProfile={() => router.back()}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp(5) }}>
            <Text style={{ fontSize: hp(2), color: theme.colors.textPrimary, textAlign: 'center' }}>
              Unable to load organization creation. Please try again.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('academic')
  const [isPublic, setIsPublic] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [coverImage, setCoverImage] = useState(null)
  const [avatar, setAvatar] = useState(null)
  
  // Meeting times and location
  const [meetingTimes, setMeetingTimes] = useState([])
  const [meetingLocation, setMeetingLocation] = useState('')
  const locationCoords = null
  const [isMeetingPublic, setIsMeetingPublic] = useState(true)
  
  // Meeting time picker states
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [editingMeetingIndex, setEditingMeetingIndex] = useState(null)
  const [tempMeetingDay, setTempMeetingDay] = useState('')
  const [tempMeetingTime, setTempMeetingTime] = useState(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const pickImage = async (type) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'cover' ? [16, 9] : [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        if (type === 'cover') {
          setCoverImage(result.assets[0].uri)
        } else {
          setAvatar(result.assets[0].uri)
        }
      }
    } catch (error) {
      console.log('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const addMeetingTime = () => {
    if (!tempMeetingDay || !tempMeetingTime) {
      Alert.alert('Error', 'Please select both day and time')
      return
    }
    
    if (editingMeetingIndex !== null) {
      const updated = [...meetingTimes]
      updated[editingMeetingIndex] = {
        day: tempMeetingDay,
        time: tempMeetingTime.toISOString(),
      }
      setMeetingTimes(updated)
      setEditingMeetingIndex(null)
    } else {
      setMeetingTimes([...meetingTimes, {
        day: tempMeetingDay,
        time: tempMeetingTime.toISOString(),
      }])
    }
    
    setTempMeetingDay('')
    setTempMeetingTime(new Date())
    setShowDayPicker(false)
    setShowTimePicker(false)
  }

  const removeMeetingTime = (index: number) => {
    setMeetingTimes(meetingTimes.filter((_, i) => i !== index))
  }

  const editMeetingTime = (index: number) => {
    const meeting = meetingTimes[index]
    setTempMeetingDay(meeting.day)
    setTempMeetingTime(new Date(meeting.time))
    setEditingMeetingIndex(index)
    setShowDayPicker(true)
  }

  const handleCreate = async () => {
    // TODO: Upload org avatar/cover to bonded-media and insert public.media rows.
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an organization name')
      return
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description')
      return
    }

    const clubData = {
      name: name.trim(),
      description: description.trim(),
      category,
      isPublic,
      requiresApproval,
      coverImage: coverImage || null,
      avatar: avatar || null,
      meetingTimes,
      meetingLocation,
      locationCoords,
      isMeetingPublic,
    }

    if (isSubmitting) return
    setIsSubmitting(true)
    const result = await createClub(clubData)
    setIsSubmitting(false)
    const clubId = result?.id
    if (!clubId) {
      Alert.alert('Error', result?.error || 'Failed to create organization. Please try again.')
      return
    }

    Alert.alert('Success', 'Organization created!', [
      {
        text: 'OK',
        onPress: () => router.replace({ pathname: '/clubs/[id]', params: { id: clubId } }),
      },
    ])
  }

  // Debug: Ensure component is rendering
  console.log('CreateOrg: Rendering component with theme:', !!theme, 'styles:', !!styles)
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="Create Organization"
          onPressProfile={() => router.back()}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardDismissMode="on-drag"
            bounces={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Start an Organization</Text>
              <Text style={styles.subtitle}>
                Give your org a clear identity, then add meeting details for members.
              </Text>
            </View>

          {/* Basic Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Computer Science Club"
                placeholderTextColor={theme.colors.textSecondary + '60'}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell people about your organization..."
                placeholderTextColor={theme.colors.textSecondary + '60'}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <Picker
                options={CATEGORIES}
                value={category}
                onValueChange={setCategory}
                placeholder="Select category"
              />
            </View>
          </View>

          {/* Media Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Media</Text>
            
            {/* Avatar */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Avatar</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => pickImage('avatar')}
                activeOpacity={0.7}
              >
                {avatar ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: avatar }} style={styles.avatarPreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        setAvatar(null)
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={hp(2.5)} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePickerContent}>
                    <View style={styles.imagePickerIconContainer}>
                      <Ionicons name="camera-outline" size={hp(2.5)} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.imagePickerText}>Add Avatar</Text>
                    <Text style={styles.imagePickerSubtext}>Square image recommended</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Cover Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cover Image (optional)</Text>
              {coverImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setCoverImage(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={hp(2.5)} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={() => pickImage('cover')}
                  activeOpacity={0.7}
                >
                  <View style={styles.imagePickerContent}>
                    <View style={styles.imagePickerIconContainer}>
                      <Ionicons name="image-outline" size={hp(2.5)} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.imagePickerText}>Add Cover Image</Text>
                    <Text style={styles.imagePickerSubtext}>16:9 aspect ratio recommended</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Settings Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Settings</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchText}>Public Organization</Text>
                <Text style={styles.switchSubtext}>
                  Anyone can see and join
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={(value) => {
                  setIsPublic(value)
                  if (!value) {
                    setRequiresApproval(true)
                  }
                }}
                trackColor={{
                  false: theme.colors.backgroundSecondary,
                  true: theme.colors.accent + '50',
                }}
                thumbColor={isPublic ? theme.colors.accent : theme.colors.textSecondary}
              />
            </View>

            {!isPublic && (
              <View style={[styles.switchRow, styles.switchRowLast]}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchText}>Require Approval</Text>
                  <Text style={styles.switchSubtext}>
                    Approve join requests manually
                  </Text>
                </View>
                <Switch
                  value={requiresApproval}
                  onValueChange={setRequiresApproval}
                  trackColor={{
                    false: theme.colors.backgroundSecondary,
                    true: theme.colors.accent + '50',
                  }}
                  thumbColor={
                    requiresApproval ? theme.colors.accent : theme.colors.textSecondary
                  }
                />
              </View>
            )}
            {isPublic && (
              <View style={styles.switchRowLast} />
            )}
          </View>

          {/* Meeting Times & Location Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meeting Information</Text>
            
            {/* Meeting Times */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meeting Times</Text>
              {meetingTimes.length > 0 && (
                <View style={styles.meetingTimesList}>
                  {meetingTimes.map((meeting, index) => (
                    <View key={index} style={styles.meetingTimeItem}>
                      <View style={styles.meetingTimeContent}>
                        <Ionicons name="time-outline" size={hp(1.8)} color={theme.colors.textPrimary} />
                        <Text style={styles.meetingTimeText}>
                          {meeting.day} at {formatTime(new Date(meeting.time))}
                        </Text>
                      </View>
                      <View style={styles.meetingTimeActions}>
                        <TouchableOpacity
                          onPress={() => editMeetingTime(index)}
                          style={styles.meetingTimeActionButton}
                        >
                          <Ionicons name="pencil-outline" size={hp(1.8)} color={theme.colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeMeetingTime(index)}
                          style={styles.meetingTimeActionButton}
                        >
                          <Ionicons name="trash-outline" size={hp(1.8)} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.addMeetingTimeButton}
                onPress={() => setShowDayPicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={hp(2)} color={theme.colors.accent} />
                <Text style={styles.addMeetingTimeText}>Add Meeting Time</Text>
              </TouchableOpacity>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meeting Location</Text>
              <View style={styles.inputWithIcon}>
                <MapPin size={hp(2)} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.inputInline]}
                  value={meetingLocation}
                  placeholder="Enter meeting location"
                  placeholderTextColor={theme.colors.textSecondary + '60'}
                  onChangeText={setMeetingLocation}
                />
              </View>
            </View>

            {/* Meeting Visibility */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchText}>Public Meetings</Text>
                <Text style={styles.switchSubtext}>
                  Anyone can see meeting times and location
                </Text>
              </View>
              <Switch
                value={isMeetingPublic}
                onValueChange={setIsMeetingPublic}
                trackColor={{
                  false: theme.colors.backgroundSecondary,
                  true: theme.colors.accent + '50',
                }}
                thumbColor={isMeetingPublic ? theme.colors.accent : theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!orgsAvailable || isSubmitting) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            activeOpacity={0.8}
            disabled={!orgsAvailable || isSubmitting}
          >
            <Text style={styles.createButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Text>
          </TouchableOpacity>
          {!orgsAvailable && (
            <Text style={styles.createButtonHelper}>
              Organization creation is unavailable until the orgs table is deployed.
            </Text>
          )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Day Picker Modal */}
        <Modal
          visible={showDayPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Day</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDayPicker(false)
                    setTempMeetingDay('')
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayOption,
                      tempMeetingDay === day && styles.dayOptionSelected,
                    ]}
                    onPress={() => {
                      setTempMeetingDay(day)
                      setShowDayPicker(false)
                      setShowTimePicker(true)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayOptionText,
                        tempMeetingDay === day && styles.dayOptionTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                    {tempMeetingDay === day && (
                      <Ionicons name="checkmark" size={hp(2)} color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Time Picker Modal */}
        {showTimePicker && (
          <Modal
            visible={showTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => {
              setShowTimePicker(false)
              setTempMeetingDay('')
              setEditingMeetingIndex(null)
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowTimePicker(false)
                      setTempMeetingDay('')
                      setEditingMeetingIndex(null)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={tempMeetingTime}
                      mode="time"
                      display="spinner"
                      textColor={theme.colors.textPrimary}
                      themeVariant={theme.mode}
                      style={{ backgroundColor: theme.colors.background }}
                      onChange={(event, selectedTime) => {
                        if (selectedTime) {
                          setTempMeetingTime(selectedTime)
                        }
                      }}
                    />
                  ) : (
                    <DateTimePicker
                      value={tempMeetingTime}
                      mode="time"
                      display="default"
                      textColor={theme.colors.textPrimary}
                      themeVariant={theme.mode}
                      style={{ backgroundColor: theme.colors.background }}
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(false)
                        if (selectedTime) {
                          setTempMeetingTime(selectedTime)
                          addMeetingTime()
                        }
                      }}
                    />
                  )}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => {
                        addMeetingTime()
                        setShowTimePicker(false)
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: hp(40), // Extra padding for keyboard to prevent content cutoff
    gap: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.extrabold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    lineHeight: hp(2.4),
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputInline: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: hp(12),
    textAlignVertical: 'top',
    paddingTop: theme.spacing.md,
  },
  imagePickerButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  imagePickerContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  imagePickerIconContainer: {
    width: hp(6),
    height: hp(6),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  imagePickerText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  imagePickerSubtext: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: theme.ui.metaOpacity,
  },
  imagePreviewWrapper: {
    position: 'relative',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatarPreview: {
    width: hp(12),
    height: hp(12),
    borderRadius: theme.radius.full,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  coverImagePreview: {
    width: '100%',
    height: hp(20),
    borderRadius: theme.radius.md,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    padding: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  switchRowLast: {
    borderBottomWidth: 0,
  },
  switchLabel: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  switchText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  switchSubtext: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: theme.ui.metaOpacity,
  },
  createButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
  createButtonHelper: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  meetingTimesList: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  meetingTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  meetingTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  meetingTimeText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  meetingTimeActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  meetingTimeActionButton: {
    padding: theme.spacing.xs,
  },
  addMeetingTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addMeetingTimeText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  modalCloseText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semibold,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  dayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  dayOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  dayOptionText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  dayOptionTextSelected: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.accent,
  },
  confirmButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  confirmButtonText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
  locationInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  mapPreviewContainer: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mapPreviewImage: {
    width: '100%',
    height: hp(15),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  mapPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  mapPreviewText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
    flex: 1,
  },
  geocodingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  geocodingText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  locationError: {
    marginTop: theme.spacing.sm,
    padding: wp(3),
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  locationErrorText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.error,
  },
  locationConfirmButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  locationConfirmButtonDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
    opacity: 0.5,
  },
  locationConfirmButtonText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
})
