import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  Image,
  Modal,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import Picker from '../Picker'
import { useEventsContext } from '../../contexts/EventsContext'
import { formatDate, formatTime } from '../../utils/dateFormatters'

const CATEGORIES = [
  { value: 'social', label: 'Social' },
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'party', label: 'Party' },
  { value: 'club', label: 'Club' },
  { value: 'other', label: 'Other' },
]

const CreateEventModal = ({ visible, onClose, onSuccess }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const { createEvent } = useEventsContext()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('social')
  
  // Date/Time states
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  
  const [coverImage, setCoverImage] = useState(null)
  const [isPublic, setIsPublic] = useState(true)
  const [maxAttendees, setMaxAttendees] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [allowPlusOnes, setAllowPlusOnes] = useState(true)
  const [link, setLink] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringType, setRecurringType] = useState('weekly')
  const [recurringEndDate, setRecurringEndDate] = useState(new Date())
  const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false)

  // Forum selection
  const [selectedForums, setSelectedForums] = useState([])
  const mockForums = [
    { id: 'forum-quad', name: 'Quad' },
    { id: 'forum-events', name: 'Campus Events' },
    { id: 'forum-academic', name: 'Academic' },
  ]

  const toggleForum = (forumId) => {
    setSelectedForums((prev) =>
      prev.includes(forumId)
        ? prev.filter((id) => id !== forumId)
        : [...prev, forumId]
    )
  }

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Image,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        setCoverImage(result.assets[0].uri)
      }
    } catch (error) {
      console.log('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const removeImage = () => {
    setCoverImage(null)
  }


  const resetForm = () => {
    setTitle('')
    setDescription('')
    setLocation('')
    setCategory('social')
    setStartDate(new Date())
    setEndDate(new Date())
    setCoverImage(null)
    setIsPublic(true)
    setMaxAttendees('')
    setRequireApproval(false)
    setAllowPlusOnes(true)
    setLink('')
    setIsRecurring(false)
    setRecurringType('weekly')
    setRecurringEndDate(new Date())
    setSelectedForums([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title')
      return
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End date and time must be after start date and time')
      return
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      category,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isPublic,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      requireApproval,
      allowPlusOnes,
      coverImage,
      link: link.trim() || null,
      postedToForums: selectedForums,
      clubId: null,
      isRecurring,
      recurringType: isRecurring ? recurringType : null,
      recurringEndDate: isRecurring ? recurringEndDate.toISOString() : null,
    }

    const eventId = createEvent(eventData)
    resetForm()
    onClose()
    if (onSuccess) {
      onSuccess(eventId)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              {/* iOS 17+ Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
                <Text style={styles.swipeHint}>Swipe down to dismiss</Text>
              </View>

              {/* iOS 17+ Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.cancelButton}
                  activeOpacity={0.6}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>New Event</Text>
                <TouchableOpacity
                  onPress={handleCreate}
                  style={styles.createButton}
                  activeOpacity={0.6}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Event Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Fall Hackathon 2025"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Tell people about your event..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Date & Time */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Start Date & Time *</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      style={[styles.input, styles.dateInput]}
                      onPress={() => setShowStartDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateTimeButton}>
                        <Ionicons
                          name="calendar-outline"
                          size={hp(2)}
                          color={theme.eventColors.campus}
                        />
                        <Text style={styles.dateTimeText}>
                          {formatDate(startDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.input, styles.timeInput]}
                      onPress={() => setShowStartTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateTimeButton}>
                        <Ionicons
                          name="time-outline"
                          size={hp(2)}
                          color={theme.eventColors.campus}
                        />
                        <Text style={styles.dateTimeText}>
                          {formatTime(startDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>End Date & Time</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      style={[styles.input, styles.dateInput]}
                      onPress={() => setShowEndDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateTimeButton}>
                        <Ionicons
                          name="calendar-outline"
                          size={hp(2)}
                          color={theme.eventColors.campus}
                        />
                        <Text style={styles.dateTimeText}>
                          {formatDate(endDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.input, styles.timeInput]}
                      onPress={() => setShowEndTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateTimeButton}>
                        <Ionicons
                          name="time-outline"
                          size={hp(2)}
                          color={theme.eventColors.campus}
                        />
                        <Text style={styles.dateTimeText}>
                          {formatTime(endDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g., Engineering Building, Room 201"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                {/* Link */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Link (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={link}
                    onChangeText={setLink}
                    placeholder="https://example.com"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Recurring Event */}
                <View style={styles.section}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                      <Text style={styles.switchText}>Recurring Event</Text>
                      <Text style={styles.switchSubtext}>Repeat this event on a schedule</Text>
                    </View>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: theme.colors.border, true: theme.eventColors.org }}
                      thumbColor={theme.colors.white}
                    />
                  </View>

                  {isRecurring && (
                    <View style={styles.recurringOptions}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Repeat</Text>
                        <View style={styles.recurringTypeRow}>
                          {['daily', 'weekly', 'monthly'].map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.recurringTypeButton,
                                recurringType === type && styles.recurringTypeButtonActive,
                              ]}
                              onPress={() => setRecurringType(type)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.recurringTypeText,
                                  recurringType === type && styles.recurringTypeTextActive,
                                ]}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Repeat Until</Text>
                        <TouchableOpacity
                          style={styles.input}
                          onPress={() => setShowRecurringEndDatePicker(true)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dateTimeButton}>
                            <Ionicons
                              name="calendar-outline"
                              size={hp(2)}
                              color={theme.eventColors.campus}
                            />
                            <Text style={styles.dateTimeText}>
                              {formatDate(recurringEndDate)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Cover Image/Flyer */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Event Flyer/Image (optional)</Text>
                  {coverImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: coverImage }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={removeImage}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={hp(2.5)} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={pickImage}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image-outline" size={hp(3)} color={theme.eventColors.campus} />
                      <Text style={styles.imagePickerText}>Add Flyer/Image</Text>
                    </TouchableOpacity>
                  )}
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

                {/* Privacy Settings */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Privacy Settings</Text>

                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Text style={styles.switchText}>Public Event</Text>
                      <Text style={styles.switchSubtext}>
                        Anyone can see and RSVP
                      </Text>
                    </View>
                    <Switch
                      value={isPublic}
                      onValueChange={setIsPublic}
                      trackColor={{ false: theme.colors.border, true: theme.eventColors.org }}
                      thumbColor={theme.colors.white}
                    />
                  </View>

                  {!isPublic && (
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <Text style={styles.switchText}>Require Approval</Text>
                        <Text style={styles.switchSubtext}>
                          Approve RSVPs manually
                        </Text>
                      </View>
                      <Switch
                        value={requireApproval}
                        onValueChange={setRequireApproval}
                        trackColor={{ false: theme.colors.border, true: theme.eventColors.org }}
                        thumbColor={theme.colors.white}
                      />
                    </View>
                  )}

                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Text style={styles.switchText}>Allow Plus-Ones</Text>
                      <Text style={styles.switchSubtext}>
                        Attendees can bring guests
                      </Text>
                    </View>
                    <Switch
                      value={allowPlusOnes}
                      onValueChange={setAllowPlusOnes}
                      trackColor={{ false: theme.colors.border, true: theme.eventColors.org }}
                      thumbColor={theme.colors.white}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Max Attendees (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={maxAttendees}
                      onChangeText={setMaxAttendees}
                      placeholder="Leave empty for unlimited"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Post to Forums */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Post to Forums</Text>
                  <Text style={styles.sectionSubtext}>
                    Event will appear in selected forums
                  </Text>
                  {mockForums.map((forum) => (
                    <TouchableOpacity
                      key={forum.id}
                      style={styles.forumOption}
                      onPress={() => toggleForum(forum.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedForums.includes(forum.id) && styles.checkboxChecked,
                        ]}
                      >
                        {selectedForums.includes(forum.id) && (
                          <Ionicons
                            name="checkmark"
                            size={hp(1.5)}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                      <Text style={styles.forumOptionText}>{forum.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </TouchableWithoutFeedback>
      </Pressable>

      {/* Date/Time Pickers - Android */}
      {Platform.OS === 'android' && (
        <>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(false)
                if (selectedDate) {
                  const newDate = new Date(selectedDate)
                  newDate.setHours(startDate.getHours())
                  newDate.setMinutes(startDate.getMinutes())
                  setStartDate(newDate)
                }
              }}
              minimumDate={new Date()}
            />
          )}

          {showStartTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowStartTimePicker(false)
                if (selectedTime) {
                  const newDate = new Date(startDate)
                  newDate.setHours(selectedTime.getHours())
                  newDate.setMinutes(selectedTime.getMinutes())
                  setStartDate(newDate)
                }
              }}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false)
                if (selectedDate) {
                  const newDate = new Date(selectedDate)
                  newDate.setHours(endDate.getHours())
                  newDate.setMinutes(endDate.getMinutes())
                  setEndDate(newDate)
                }
              }}
              minimumDate={startDate}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endDate}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowEndTimePicker(false)
                if (selectedTime) {
                  const newDate = new Date(endDate)
                  newDate.setHours(selectedTime.getHours())
                  newDate.setMinutes(selectedTime.getMinutes())
                  setEndDate(newDate)
                }
              }}
            />
          )}

          {showRecurringEndDatePicker && (
            <DateTimePicker
              value={recurringEndDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowRecurringEndDatePicker(false)
                if (selectedDate) {
                  setRecurringEndDate(selectedDate)
                }
              }}
              minimumDate={startDate}
            />
          )}
        </>
      )}

      {/* Date/Time Pickers - iOS (wrapped in Modal) */}
      {Platform.OS === 'ios' && (
        <>
          <Modal
            visible={showStartDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Start Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const newDate = new Date(selectedDate)
                        newDate.setHours(startDate.getHours())
                        newDate.setMinutes(startDate.getMinutes())
                        setStartDate(newDate)
                      }
                    }}
                    minimumDate={new Date()}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showStartTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStartTimePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowStartTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Start Time</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={startDate}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        const newDate = new Date(startDate)
                        newDate.setHours(selectedTime.getHours())
                        newDate.setMinutes(selectedTime.getMinutes())
                        setStartDate(newDate)
                      }
                    }}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showEndDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select End Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const newDate = new Date(selectedDate)
                        newDate.setHours(endDate.getHours())
                        newDate.setMinutes(endDate.getMinutes())
                        setEndDate(newDate)
                      }
                    }}
                    minimumDate={startDate}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showEndTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEndTimePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowEndTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select End Time</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={endDate}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        const newDate = new Date(endDate)
                        newDate.setHours(selectedTime.getHours())
                        newDate.setMinutes(selectedTime.getMinutes())
                        setEndDate(newDate)
                      }
                    }}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showRecurringEndDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowRecurringEndDatePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowRecurringEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Repeat Until</Text>
                  <TouchableOpacity
                    onPress={() => setShowRecurringEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={recurringEndDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setRecurringEndDate(selectedDate)
                      }
                    }}
                    minimumDate={startDate}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </Modal>
  )
}

export default CreateEventModal

const createStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: hp(2.8),
    borderTopRightRadius: hp(2.8),
    maxHeight: '95%',
    minHeight: '75%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: hp(1),
    paddingBottom: hp(0.5),
  },
  dragHandle: {
    width: wp(12),
    height: hp(0.5),
    backgroundColor: theme.colors.border,
    borderRadius: hp(0.25),
    marginBottom: hp(0.5),
  },
  swipeHint: {
    fontSize: hp(1.2),
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    paddingVertical: hp(0.5),
  },
  cancelButtonText: {
    fontSize: hp(1.7),
    color: '#007AFF',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  modalTitle: {
    fontSize: hp(2.1),
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  createButton: {
    paddingVertical: hp(0.5),
  },
  createButtonText: {
    fontSize: hp(1.7),
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(6),
    backgroundColor: '#F2F2F7',
  },
  inputGroup: {
    marginBottom: hp(2.5),
  },
  label: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: '#000000',
    marginBottom: hp(1),
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: hp(1.2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: hp(1.7),
    color: '#000000',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
    }),
  },
  textArea: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  dateTimeText: {
    fontSize: hp(1.7),
    color: '#000000',
  },
  section: {
    marginTop: hp(2),
    marginBottom: hp(2),
    padding: wp(4),
    backgroundColor: '#FFFFFF',
    borderRadius: hp(1.4),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#000000',
    marginBottom: hp(0.5),
  },
  sectionSubtext: {
    fontSize: hp(1.4),
    color: '#8E8E93',
    marginBottom: hp(1.5),
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  switchLabel: {
    flex: 1,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchText: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#000000',
    marginBottom: hp(0.2),
  },
  switchSubtext: {
    fontSize: hp(1.3),
    color: '#8E8E93',
  },
  recurringOptions: {
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  recurringTypeRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  recurringTypeButton: {
    flex: 1,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: hp(0.8),
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  recurringTypeText: {
    fontSize: hp(1.5),
    fontWeight: '500',
    color: '#000000',
  },
  recurringTypeTextActive: {
    color: '#FFFFFF',
  },
  forumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    gap: wp(3),
  },
  checkbox: {
    width: hp(2.2),
    height: hp(2.2),
    borderRadius: hp(0.4),
    borderWidth: 2,
    borderColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  forumOptionText: {
    fontSize: hp(1.6),
    color: '#000000',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: hp(1),
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: wp(2),
  },
  imagePickerText: {
    fontSize: hp(1.7),
    fontWeight: '500',
    color: '#007AFF',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: hp(1),
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: hp(20),
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: hp(1),
    right: wp(4),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: hp(1.25),
    padding: hp(0.5),
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: hp(2),
    borderTopRightRadius: hp(2),
    paddingBottom: hp(2),
    maxHeight: '50%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  pickerModalTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#000000',
  },
  pickerModalButton: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
  },
  pickerModalButtonText: {
    fontSize: hp(1.6),
    fontWeight: '400',
    color: '#8E8E93',
  },
  pickerModalButtonDone: {
    color: '#007AFF',
    fontWeight: '600',
  },
  iosPickerContainer: {
    width: '100%',
    minHeight: hp(25),
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
})
