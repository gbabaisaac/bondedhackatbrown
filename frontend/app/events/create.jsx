import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Calendar as CalendarIcon, ChevronRight, Lock, MapPin } from '../../components/Icons'
import LocationPicker from '../../components/LocationPicker'
import { hp, wp } from '../../helpers/common'
import { getStaticMapUrlWithCoords } from '../../helpers/mapUtils'
import { createSignedUrlForPath, uploadImageToBondedMedia } from '../../helpers/mediaStorage'
import { useCreateEvent } from '../../hooks/events/useCreateEvent'
import { supabase } from '../../lib/supabase'
import { getFriendlyErrorMessage } from '../../utils/userFacingErrors'
import { useAuthStore } from '../../stores/authStore'
import { useClubsContext } from '../../contexts/ClubsContext'
import { useAppTheme } from '../theme'
import { formatDateShort, formatTimeForDisplay } from '../../utils/dateFormatters'

import { Logger } from '../../utils/logger'

export default function CreateEvent() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { user } = useAuthStore()
  const { orgId, eventId, mode } = useLocalSearchParams()
  const { getClub } = useClubsContext()
  const preselectedOrg = orgId ? getClub(orgId) : null
  const preselectedOrgId = typeof orgId === 'string' ? orgId : null
  const createEventMutation = useCreateEvent()

  const isEditMode = mode === 'edit' && eventId
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode)

  const [eventName, setEventName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(new Date())
  const [eventTime, setEventTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date())
  const [location, setLocation] = useState('')
  const [eventImage, setEventImage] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [showInviteesModal, setShowInviteesModal] = useState(false)
  const [selectedVisibility, setSelectedVisibility] = useState(preselectedOrgId ? 'org_only' : 'public')
  const [selectedInvitees, setSelectedInvitees] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(preselectedOrgId)
  const [locationCoords, setLocationCoords] = useState(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mapPreviewUrl, setMapPreviewUrl] = useState(null)

  // Fetch event data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchEventData = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single()

          if (error) throw error

          if (data) {
            setEventName(data.title || '')
            setDescription(data.description || '')
            setEventDate(new Date(data.start_at))
            setEventTime(new Date(data.start_at))
            setEndTime(new Date(data.end_at))
            setLocation(data.location_name || '')
            setEventImage(data.image_url)
            setSelectedVisibility(data.visibility || 'public')
            setSelectedOrgId(data.org_id)
          }
        } catch (error) {
          console.error('Error fetching event:', error)
          Alert.alert('Error', 'Failed to load event data')
        } finally {
          setIsLoadingEvent(false)
        }
      }
      fetchEventData()
    }
  }, [isEditMode, eventId])

  const pickImage = async () => {
    try {
      // Request permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to add an event image. Please enable it in your device settings.',
          [{ text: 'OK' }]
        )
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEventImage(result.assets[0].uri)
      }
    } catch (error) {
      Logger.error('Image picker error:', error)
      Alert.alert(
        'Error',
        'Failed to open image picker. Please try again.',
        [{ text: 'OK' }]
      )
    }
  }


  const handleLocationSelect = () => {
    setShowLocationPicker(true)
  }

  const handleLocationPicked = (locationData) => {
    // locationData contains: { description, formatted_address, coordinates: { lat, lng }, ... }
    setLocation(locationData.formatted_address || locationData.description)
    if (locationData.coordinates) {
      setLocationCoords({
        lat: locationData.coordinates.lat,
        lng: locationData.coordinates.lng,
      })
      // Generate map preview using coordinates
      const mapUrl = getStaticMapUrlWithCoords(
        locationData.coordinates.lat,
        locationData.coordinates.lng,
        wp(90),
        hp(20)
      )
      setMapPreviewUrl(mapUrl)
    }
  }

  const uploadEventImage = async (eventId) => {
    if (!eventImage || !user || !eventId) {
      Logger.debug('Skipping image upload: no image, user, or event')
      return null
    }

    try {
      setIsUploading(true)
      Logger.info('Starting image upload for event:', eventId)

      const uploadResult = await uploadImageToBondedMedia({
        fileUri: eventImage,
        mediaType: 'event_cover',
        ownerType: 'event',
        ownerId: eventId,
        userId: user.id,
        eventId,
        upsert: true,
      })

      const signedUrl = await createSignedUrlForPath(uploadResult.path)
      return signedUrl
    } catch (error) {
      Logger.error('Error uploading image:', error)
      Alert.alert(
        'Upload Error',
        getFriendlyErrorMessage(error, 'Failed to upload event image. Event will be created without image.'),
        [{ text: 'OK' }]
      )
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateEvent = async () => {
    // Validate required fields
    if (!eventName.trim()) {
      Alert.alert('Missing Information', 'Please enter an event name')
      return
    }

    if (!location.trim()) {
      Alert.alert('Missing Information', 'Please select a location')
      return
    }

    try {
      // Combine date and time
      const startDateTime = new Date(eventDate)
      startDateTime.setHours(eventTime.getHours())
      startDateTime.setMinutes(eventTime.getMinutes())

      const endDateTime = new Date(eventDate)
      endDateTime.setHours(endTime.getHours())
      endDateTime.setMinutes(endTime.getMinutes())

      // Prepare event data
      const eventData = {
        title: eventName.trim(),
        description: description.trim() || null,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        location_name: location.trim(),
        location_address: location.trim(),
        visibility: selectedVisibility,
        requires_approval: selectedVisibility === 'invite_only',
        allow_sharing: true,
        is_paid: false,
        org_id: selectedOrgId || null,
      }

      let targetEventId

      if (isEditMode) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId)

        if (error) throw error
        targetEventId = eventId
      } else {
        // Create new event
        eventData.image_url = null
        eventData.invites = selectedInvitees.map(id => ({ user_id: id }))
        const createdEvent = await createEventMutation.mutateAsync(eventData)
        targetEventId = createdEvent?.id
      }

      // Handle image upload if there's a new image
      if (eventImage && targetEventId && !eventImage.startsWith('http')) {
        const imageUrl = await uploadEventImage(targetEventId)
        if (imageUrl) {
          await supabase
            .from('events')
            .update({ image_url: imageUrl })
            .eq('id', targetEventId)
        }
      }

      Alert.alert('Success', isEditMode ? 'Event updated successfully!' : 'Event created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      Logger.error('Error creating event:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to create event. Please try again.'))
    }
  }

  const mockConnections = []

  const toggleInvitee = (id) => {
    setSelectedInvitees((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  if (isLoadingEvent) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
            <Text style={{ marginTop: hp(2), color: theme.colors.textSecondary }}>Loading event...</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>
          <TouchableOpacity
            onPress={handleCreateEvent}
            style={styles.headerButton}
            activeOpacity={0.7}
            disabled={createEventMutation.isPending || isUploading}
          >
            {createEventMutation.isPending || isUploading ? (
              <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
            ) : (
              <Text style={styles.createText}>{isEditMode ? 'Save' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Add Event Image */}
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickImage}
            activeOpacity={0.8}
            delayPressIn={0}
          >
            {eventImage ? (
              <Image source={{ uri: eventImage }} style={styles.eventImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.cameraIcon}>
                  <Text style={styles.cameraIconText}>📷</Text>
                </View>
                <Text style={styles.imagePlaceholderText}>Add event image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Event Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event name</Text>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="Enter event name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this event about?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Event Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event date</Text>
            <TouchableOpacity
              style={styles.dateTimeField}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeContent}>
                <CalendarIcon size={hp(2)} color={theme.colors.textSecondary} />
                <Text style={styles.dateTimeText}>{formatDateShort(eventDate)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.dateTimeField}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateTimeContent}>
                  <Text style={styles.timeIcon}>🕐</Text>
                  <Text style={styles.dateTimeText}>{formatTimeForDisplay(eventTime)}</Text>
                </View>
              </TouchableOpacity>
              <ChevronRight size={hp(2)} color={theme.colors.textSecondary} />
              <TouchableOpacity
                style={styles.dateTimeField}
                onPress={() => setShowEndTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateTimeContent}>
                  <Text style={styles.timeIcon}>🕐</Text>
                  <Text style={styles.dateTimeText}>{formatTimeForDisplay(endTime)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TouchableOpacity
              style={styles.inputWithIcon}
              onPress={handleLocationSelect}
              activeOpacity={0.7}
            >
              <MapPin size={hp(2)} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={location}
                placeholder="Enter location or address"
                placeholderTextColor={theme.colors.textSecondary}
                editable={false}
              />
            </TouchableOpacity>
            {location && mapPreviewUrl && (
              <TouchableOpacity
                style={styles.mapPreviewContainer}
                onPress={() => setShowLocationPicker(true)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: mapPreviewUrl }}
                  style={styles.mapPreviewImage}
                  resizeMode="cover"
                />
                <View style={styles.mapPreviewOverlay}>
                  <Text style={styles.mapPreviewText}>{location}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Organization */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization</Text>
            <View style={styles.selectField}>
              <Text style={styles.selectFieldText}>
                {preselectedOrg?.name || 'No organization selected'}
              </Text>
            </View>
          </View>

          {/* Visibility & Access */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Visibility & Access</Text>
            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setShowVisibilityModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectFieldLeft}>
                <Lock size={hp(2)} color={theme.colors.textSecondary} />
                <Text style={styles.selectFieldText}>
                  {selectedVisibility === 'public' ? 'Public Event' :
                    selectedVisibility === 'org_only' ? 'Org Members Only' :
                      'Invite Only'}
                </Text>
              </View>
              <ChevronRight size={hp(2)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Ticketing */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ticketing</Text>
            <TouchableOpacity
              style={styles.selectField}
              onPress={() => { }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectFieldText}>Free Event</Text>
              <ChevronRight size={hp(2)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Invite Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>INVITEES</Text>
            <TouchableOpacity
              style={styles.inviteField}
              onPress={() => setShowInviteesModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.inviteAvatars}>
                {selectedInvitees.length === 0 ? (
                  <Text style={styles.inviteText}>Invite people or orgs</Text>
                ) : (
                  <>
                    {selectedInvitees.slice(0, 3).map((id) => {
                      const invitee = mockConnections.find((c) => c.id === id)
                      return invitee ? (
                        <View key={id} style={styles.avatar}>
                          <Text style={styles.avatarText}>{invitee.avatar}</Text>
                        </View>
                      ) : null
                    })}
                    {selectedInvitees.length > 3 && (
                      <Text style={styles.inviteText}>+{selectedInvitees.length - 3}</Text>
                    )}
                    {selectedInvitees.length <= 3 && (
                      <Text style={styles.inviteText}>
                        {selectedInvitees.length === 1 ? '1 person' : `${selectedInvitees.length} people`}
                      </Text>
                    )}
                  </>
                )}
              </View>
              <ChevronRight size={hp(2)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Create Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (createEventMutation.isPending || isUploading) && styles.nextButtonDisabled
            ]}
            onPress={handleCreateEvent}
            activeOpacity={0.8}
            disabled={createEventMutation.isPending || isUploading}
          >
            {createEventMutation.isPending || isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.white} />
                <Text style={styles.nextButtonText}>
                  {isUploading ? 'Uploading...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.nextButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date/Time Pickers */}
        {Platform.OS === 'android' && (
          <>
            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false)
                  if (selectedDate) {
                    setEventDate(selectedDate)
                  }
                }}
                minimumDate={new Date()}
                textColor={theme.colors.textPrimary}
                themeVariant={theme.mode}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={eventTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false)
                  if (selectedTime) {
                    setEventTime(selectedTime)
                  }
                }}
                textColor={theme.colors.textPrimary}
                themeVariant={theme.mode}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowEndTimePicker(false)
                  if (selectedTime) {
                    setEndTime(selectedTime)
                  }
                }}
                textColor={theme.colors.textPrimary}
                themeVariant={theme.mode}
              />
            )}
          </>
        )}

        {Platform.OS === 'ios' && (
          <>
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.pickerModal}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerModalButton}
                    >
                      <Text style={styles.pickerModalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerModalTitle}>Select Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerModalButton}
                    >
                      <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setEventDate(selectedDate)
                      }
                    }}
                    minimumDate={new Date()}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </Modal>

            <Modal
              visible={showTimePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.pickerModal}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(false)}
                      style={styles.pickerModalButton}
                    >
                      <Text style={styles.pickerModalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerModalTitle}>Start Time</Text>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(false)}
                      style={styles.pickerModalButton}
                    >
                      <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={eventTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        setEventTime(selectedTime)
                      }
                    }}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
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
                    <Text style={styles.pickerModalTitle}>End Time</Text>
                    <TouchableOpacity
                      onPress={() => setShowEndTimePicker(false)}
                      style={styles.pickerModalButton}
                    >
                      <Text style={[styles.pickerModalButtonText, styles.pickerModalButtonDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        setEndTime(selectedTime)
                      }
                    }}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </Modal>
          </>
        )}

        {/* Visibility & Access Modal */}
        <Modal
          visible={showVisibilityModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowVisibilityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visibility & Access</Text>
                <TouchableOpacity
                  onPress={() => setShowVisibilityModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {['public', 'org_only', 'invite_only'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionRow,
                      selectedVisibility === option && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedVisibility(option)
                      setShowVisibilityModal(false)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedVisibility === option && styles.optionTextSelected,
                      ]}
                    >
                      {option === 'public' ? 'Public Event' :
                        option === 'org_only' ? 'Org Members Only' :
                          'Invite Only'}
                    </Text>
                    {selectedVisibility === option && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Invitees Modal */}
        <Modal
          visible={showInviteesModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInviteesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite People & Orgs</Text>
                <TouchableOpacity
                  onPress={() => setShowInviteesModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {mockConnections.map((connection) => (
                  <TouchableOpacity
                    key={connection.id}
                    style={[
                      styles.inviteeRow,
                      selectedInvitees.includes(connection.id) && styles.inviteeRowSelected,
                    ]}
                    onPress={() => toggleInvitee(connection.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.inviteeLeft}>
                      <View style={styles.inviteeAvatar}>
                        <Text style={styles.inviteeAvatarText}>{connection.avatar}</Text>
                      </View>
                      <View style={styles.inviteeInfo}>
                        <Text style={styles.inviteeName}>{connection.name}</Text>
                        <Text style={styles.inviteeType}>
                          {connection.type === 'org' ? 'Organization' : 'Friend'}
                        </Text>
                      </View>
                    </View>
                    {selectedInvitees.includes(connection.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Location Picker Modal */}
        <LocationPicker
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationPicked}
          placeholder="Search for a location or address"
          initialValue={location}
        />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  headerButton: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
  },
  cancelText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '400',
    color: theme.colors.bondedPurple,
  },
  headerTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  createText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '400',
    color: theme.colors.bondedPurple,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  imagePicker: {
    width: '100%',
    height: hp(20),
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: hp(3),
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    marginBottom: hp(1),
  },
  cameraIconText: {
    fontSize: hp(4),
  },
  imagePlaceholderText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inputGroup: {
    marginBottom: hp(2.5),
  },
  label: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: hp(12),
    paddingTop: hp(1.5),
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: wp(2),
  },
  dateTimeField: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: hp(1),
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  dateTimeText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  timeIcon: {
    fontSize: hp(2),
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  selectFieldText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  lockIcon: {
    fontSize: hp(2),
  },
  inviteField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inviteAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  avatar: {
    width: hp(3.5),
    height: hp(3.5),
    borderRadius: hp(1.75),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  inviteText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  footer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.offWhite,
  },
  nextButton: {
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  locationConfirmButton: {
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  locationConfirmButtonDisabled: {
    opacity: 0.5,
  },
  locationConfirmButtonText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  mapPreviewContainer: {
    marginTop: hp(1.5),
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
    height: hp(20),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  mapPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  mapPreviewText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
    flex: 1,
  },
  geocodingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(1),
    paddingVertical: hp(1),
  },
  geocodingText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  locationError: {
    marginTop: hp(1),
    padding: wp(3),
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  locationErrorText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.error,
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  modalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCloseText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  modalBody: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    marginBottom: hp(1),
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionRowSelected: {
    backgroundColor: theme.colors.bondedPurple + '10',
    borderColor: theme.colors.bondedPurple,
  },
  optionText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  optionTextSelected: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: hp(2),
    color: theme.colors.bondedPurple,
    fontWeight: '700',
  },
  inviteeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    marginBottom: hp(1),
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inviteeRowSelected: {
    backgroundColor: theme.colors.bondedPurple + '10',
    borderColor: theme.colors.bondedPurple,
  },
  inviteeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteeAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  inviteeAvatarText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  inviteeInfo: {
    flex: 1,
  },
  inviteeName: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.2),
  },
  inviteeType: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: hp(2),
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  pickerModalTitle: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pickerModalButton: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
  },
  pickerModalButtonText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  pickerModalButtonDone: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  locationInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: hp(2),
  },
})
