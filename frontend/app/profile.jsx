import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppCard from '../components/AppCard'
import { ArrowLeft, Calendar, MapPin, School, User } from '../components/Icons'
import PrimaryButton from '../components/PrimaryButton'
import { hp, wp } from '../helpers/common'
import { createSignedUrlForPath, uploadImageToBondedMedia } from '../helpers/mediaStorage'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useFriends } from '../hooks/useFriends'
import { useProfile, useProfilePhotos } from '../hooks/useProfiles'
import { useProfileViewTracker, useProfileViewersCount } from '../hooks/useProfileViews'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme } from './theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const STABLE_EMPTY_ARRAY = []

export default function Profile() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const theme = useAppTheme()
  const { user } = useAuthStore()

  const targetUserId = params.userId || params.profileId || user?.id
  const isMe = targetUserId === user?.id

  // Fetch profile based on whether it's "me" or another user
  const { data: myProfile, isLoading: myLoading, error: myError } = useCurrentUserProfile()
  const { data: otherProfile, isLoading: otherLoading, error: otherError } = useProfile(isMe ? null : targetUserId)

  // Normalized profile data
  const userProfileRaw = isMe ? myProfile : otherProfile
  const profileLoading = isMe ? myLoading : otherLoading
  const profileError = isMe ? myError : otherError

  // Fetch gallery photos for "other" profile (lazy loading)
  const { data: otherPhotosData } = useProfilePhotos(isMe ? null : targetUserId)
  const otherPhotos = otherPhotosData || STABLE_EMPTY_ARRAY

  // Standardize the userProfile object for UI consistency
  const userProfile = useMemo(() => {
    if (!userProfileRaw) return null
    if (isMe) return userProfileRaw

    // Normalize "other" profile to match the structure from useCurrentUserProfile
    const profile = userProfileRaw
    const displayName = profile.full_name || profile.username || profile.email?.split('@')[0] || 'User'
    const avatarUrl = profile.avatar_url
    const allPhotos = [avatarUrl, ...otherPhotos].filter(Boolean).filter((url, index, self) => self.indexOf(url) === index)

    return {
      ...profile,
      name: displayName,
      handle: profile.username ? `@${profile.username}` : `@${profile.email?.split('@')[0] || 'user'}`,
      location: profile.university?.name || 'University',
      major: profile.major,
      grade: profile.grade,
      graduationYear: profile.graduation_year,
      avatarUrl: avatarUrl,
      photos: allPhotos,
      yearbook_quote: profile.yearbook_quote || null,
      interests: Array.isArray(profile.interests) ? profile.interests : [],
    }
  }, [userProfileRaw, isMe, otherPhotos])

  const { data: friends = [], isLoading: friendsLoading } = useFriends(isMe ? undefined : targetUserId)
  const { data: viewersCount = 0 } = useProfileViewersCount(targetUserId, { windowDays: 30 })
  const updateProfile = useUpdateProfile()

  // Track profile view if viewing another user's profile
  useProfileViewTracker(isMe ? null : targetUserId, 'profile_page', !isMe)

  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editQuote, setEditQuote] = useState('')
  const [focusQuoteInput, setFocusQuoteInput] = useState(false)
  const [newAvatarUri, setNewAvatarUri] = useState(null)
  const [newBannerUri, setNewBannerUri] = useState(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState([])
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const quoteInputRef = useRef(null)

  // Swipe-to-close gesture state
  const scrollViewRef = useRef(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const translateY = useRef(new Animated.Value(0)).current
  const gestureState = useRef({ isEnabled: true })

  // Keep track of the last synced profile ID to prevent infinite loops
  const lastSyncedIdRef = useRef(null)

  // Update edit fields when userProfile loads
  useEffect(() => {
    if (userProfile && userProfile.id !== lastSyncedIdRef.current) {
      setEditName(userProfile.full_name || userProfile.name || '')
      setEditQuote(userProfile.yearbook_quote || userProfile.yearbookQuote || '')
      const photos = Array.isArray(userProfile.photos) ? userProfile.photos : []
      setGalleryPhotos(photos.map((url, index) => ({ url, id: `existing-${index}` })))
      lastSyncedIdRef.current = userProfile.id
    }
  }, [userProfile])

  const profilePhotos = useMemo(() => {
    if (!userProfile) return []
    return Array.isArray(userProfile.photos) ? userProfile.photos : []
  }, [userProfile])

  React.useEffect(() => {
    setActivePhotoIndex(0)
  }, [profilePhotos.length])

  React.useEffect(() => {
    if (!showEditModal || !focusQuoteInput) return
    const timeoutId = setTimeout(() => {
      quoteInputRef.current?.focus()
    }, 200)
    setFocusQuoteInput(false)
    return () => clearTimeout(timeoutId)
  }, [showEditModal, focusQuoteInput])

  const avatarUrl = userProfile?.yearbookPhotoUrl || userProfile?.avatarUrl || profilePhotos[0] || null
  const displayQuote = userProfile?.yearbookQuote || userProfile?.yearbook_quote || ''

  // Disable gesture when modals are open
  useEffect(() => {
    gestureState.current.isEnabled = !showFriendsModal && !showEditModal
  }, [showFriendsModal, showEditModal])

  // Handle scroll position tracking
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y
    setIsAtTop(offsetY <= 0)
  }

  // Handle swipe-down-to-close gesture
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const { translationY: ty } = event.nativeEvent
        if (!isAtTop || !gestureState.current.isEnabled) {
          translateY.setValue(0)
          return
        }
        // Only allow downward gestures
        if (ty < 0) {
          translateY.setValue(0)
        }
      }
    }
  )

  const onHandlerStateChange = (event) => {
    const { translationY: ty, velocityY, state } = event.nativeEvent

    if (state === State.END) {
      const shouldClose = (ty > 100 || velocityY > 800) && isAtTop && gestureState.current.isEnabled

      if (shouldClose) {
        Animated.timing(translateY, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          router.back()
        })
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start()
      }
    }
  }

  // Handle avatar selection
  const handleSelectAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos to update your avatar.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets?.[0]) {
      setNewAvatarUri(result.assets[0].uri)
    }
  }

  // Handle banner selection
  const handleSelectBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos to update your banner.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    })

    if (!result.canceled && result.assets?.[0]) {
      setNewBannerUri(result.assets[0].uri)
    }
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!userProfile?.id) return

    const updates = {}

    try {
      if (newAvatarUri) {
        setIsUploadingAvatar(true)
        const uploadResult = await uploadImageToBondedMedia({
          fileUri: newAvatarUri,
          mediaType: 'profile_avatar',
          ownerType: 'user',
          ownerId: user.id,
          userId: user.id,
          upsert: true,
        })
        const avatarUrlNew = await createSignedUrlForPath(uploadResult.path)
        updates.avatar_url = avatarUrlNew
        setIsUploadingAvatar(false)
      }

      if (newBannerUri) {
        setIsUploadingBanner(true)
        const uploadResult = await uploadImageToBondedMedia({
          fileUri: newBannerUri,
          mediaType: 'profile_banner',
          ownerType: 'user',
          ownerId: user.id,
          userId: user.id,
          upsert: true,
        })
        const bannerUrl = await createSignedUrlForPath(uploadResult.path)
        updates.banner_url = bannerUrl
        setIsUploadingBanner(false)
      }

      if (editName.trim() !== (userProfile.full_name || userProfile.name || '')) {
        updates.full_name = editName.trim()
      }

      if (editQuote.trim() !== (userProfile.yearbook_quote || userProfile.yearbookQuote || '')) {
        updates.yearbook_quote = editQuote.trim()
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates)
        setNewAvatarUri(null)
        setNewBannerUri(null)
        setShowEditModal(false)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      Alert.alert('Error', 'Failed to save profile changes. Please try again.')
      setIsUploadingAvatar(false)
      setIsUploadingBanner(false)
    }
  }

  // Add photos to gallery
  const handleAddPhotosToGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos to add to your gallery.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets) {
      const existingUris = new Set(
        galleryPhotos
          .map((photo) => photo.localUri || photo.url)
          .filter(Boolean)
      )
      const newPhotos = result.assets.map((asset, index) => ({
        url: asset.uri,
        id: `new-${Date.now()}-${index}`,
        localUri: asset.uri,
        isNew: true,
      }))
      const uniqueNewPhotos = newPhotos.filter((photo) => !existingUris.has(photo.localUri))
      if (uniqueNewPhotos.length === 0) return
      setGalleryPhotos([...galleryPhotos, ...uniqueNewPhotos])
    }
  }

  // Remove photo from gallery
  const handleRemovePhoto = (photoId) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo from your gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setGalleryPhotos(galleryPhotos.filter(photo => photo.id !== photoId))
          },
        },
      ]
    )
  }

  // Set photo as yearbook photo (avatar)
  const handleSetAsYearbookPhoto = (photoUrl) => {
    Alert.alert(
      'Set Yearbook Photo',
      'Set this photo as your yearbook photo and profile avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: () => {
            setNewAvatarUri(photoUrl)
          },
        },
      ]
    )
  }

  // Upload gallery photos and save all changes
  const handleSaveAllChanges = async () => {
    if (!userProfile?.id) return

    try {
      const newPhotos = galleryPhotos.filter(photo => photo.isNew)
      if (newPhotos.length > 0) {
        setIsUploadingPhoto(true)
        const uploadedUrls = []
        for (const photo of newPhotos) {
          const uploadResult = await uploadImageToBondedMedia({
            fileUri: photo.localUri,
            mediaType: 'profile_photo',
            ownerType: 'user',
            ownerId: user.id,
            userId: user.id,
          })
          const signedUrl = await createSignedUrlForPath(uploadResult.path)
          if (signedUrl) {
            uploadedUrls.push(signedUrl)
          }
        }
        setGalleryPhotos((prev) => {
          const kept = prev.filter((photo) => !photo.isNew)
          const merged = [...kept, ...uploadedUrls.map((url, index) => ({
            url,
            id: `uploaded-${Date.now()}-${index}`,
            isNew: false,
          }))]
          return merged
        })
        setIsUploadingPhoto(false)
      }

      await handleSaveProfile()
    } catch (error) {
      console.error('Error saving changes:', error)
      Alert.alert('Error', 'Failed to save changes. Please try again.')
      setIsUploadingPhoto(false)
    }
  }

  const styles = createStyles(theme)

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (profileError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={hp(6)} color={theme.colors.error} />
          <Text style={styles.errorText}>Error loading profile</Text>
          <Text style={styles.errorSubtext}>{profileError.message || 'Unknown error'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.retryButtonText}>Complete Onboarding</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={5}
        failOffsetY={[-5, 0]}
        shouldCancelWhenOutside={false}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Back Button - Fixed */}
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <ArrowLeft size={hp(2)} color="#fff" strokeWidth={2} />
            </View>
          </TouchableOpacity>

          {/* More Options Button - Fixed (Only for "me") */}
          {isMe && (
            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={hp(2.5)} color="#fff" />
            </TouchableOpacity>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
        {/* Hero Image Carousel */}
        <View style={styles.heroSection}>
          {profilePhotos.length > 1 ? (
            <FlatList
              data={profilePhotos}
              keyExtractor={(item, index) => `photo-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                setActivePhotoIndex(newIndex)
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.heroImage}
                />
              )}
            />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="person" size={hp(10)} color={theme.colors.textSecondary} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Avatar + Name */}
          <View style={styles.avatarRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(userProfile?.name || userProfile?.full_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarInfo}>
              <Text style={styles.profileName}>
                {userProfile?.name || userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileHandle}>
                {userProfile?.handle || (userProfile?.username ? `@${userProfile.username}` : `@${userProfile?.email?.split('@')[0] || 'user'}`)}
              </Text>
            </View>
          </View>

          {/* Photo Gallery Carousel */}
          {profilePhotos.length > 0 && (
            <View style={styles.galleryPreview}>
              <FlatList
                data={profilePhotos}
                keyExtractor={(item, index) => `gallery-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: wp(1) }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.galleryThumbnail} />
                )}
              />
            </View>
          )}

          {/* Yearbook Quote */}
          <View style={styles.quoteSection}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTitle}>Yearbook Quote</Text>
              {isMe && (
                <TouchableOpacity
                  style={styles.quoteEditButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowEditModal(true)
                    setFocusQuoteInput(true)
                  }}
                >
                  <Text style={styles.quoteEditText}>{displayQuote ? 'Edit' : 'Add'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {displayQuote ? (
              <Text style={styles.quote}>"{displayQuote}"</Text>
            ) : (
              <Text style={styles.quotePlaceholder}>Add a quote that feels like you.</Text>
            )}
          </View>

          {/* Friends Button */}
          <PrimaryButton
            label={`Friends (${friends.length})`}
            icon="people-outline"
            onPress={() => setShowFriendsModal(true)}
            style={styles.friendsButton}
          />

          {/* Profile Views Counter (only show on own profile) */}
          {isMe && viewersCount > 0 && (
            <View style={styles.profileViewsContainer}>
              <Ionicons name="eye-outline" size={hp(2)} color={theme.colors.textSecondary} />
              <Text style={styles.profileViewsText}>
                {viewersCount} {viewersCount === 1 ? 'person' : 'people'} viewed your profile in the last 30 days
              </Text>
            </View>
          )}

          {/* Meta Pills */}
          <View style={styles.metaRow}>
            {userProfile?.major && (
              <View style={styles.metaPill}>
                <School size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaPillText}>{userProfile.major}</Text>
              </View>
            )}
            {userProfile?.graduationYear && (
              <View style={styles.metaPill}>
                <Calendar size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaPillText}>Class of {userProfile.graduationYear}</Text>
              </View>
            )}
            {userProfile?.grade && (
              <View style={styles.metaPill}>
                <User size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaPillText}>{userProfile.grade}</Text>
              </View>
            )}
          </View>

          {/* Location */}
          {userProfile?.location && (
            <View style={styles.locationRow}>
              <MapPin size={hp(1.8)} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.locationText}>{userProfile.location}</Text>
            </View>
          )}

          {/* Interests */}
          {userProfile?.interests && Array.isArray(userProfile.interests) && userProfile.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tagsRow}>
                {userProfile.interests.slice(0, 8).map((interest, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Friends</Text>
            <TouchableOpacity
              onPress={() => setShowFriendsModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={hp(2.5)} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {friendsLoading ? (
            <View style={styles.modalEmptyState}>
              <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
              <Text style={styles.modalEmptyText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.modalEmptyState}>
              <Ionicons name="people-outline" size={hp(5)} color={theme.colors.textSecondary} />
              <Text style={styles.modalEmptyText}>No friends yet</Text>
              <Text style={styles.modalEmptySubtext}>Start connecting with people on campus!</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.friendItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/yearbook',
                      params: { profileId: item.id },
                    })
                    setShowFriendsModal(false)
                  }}
                >
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                      <Ionicons name="person" size={hp(2.5)} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.friendDetails}>
                      {item.major ? `${item.major} • ` : ''}Class of {item.graduationYear || item.grade || 'N/A'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={hp(2)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.friendsList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={hp(2.5)} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.editScrollView}
            contentContainerStyle={styles.editScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar Selection */}
            <AppCard style={styles.editCard}>
              <Text style={styles.editLabel}>Profile Avatar</Text>
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: newAvatarUri || avatarUrl }}
                  style={styles.avatarPreview}
                />
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={handleSelectAvatar}
                  disabled={isUploadingAvatar}
                >
                  <Ionicons name="camera" size={hp(2)} color="#FFFFFF" />
                  <Text style={styles.changeImageText}>
                    {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </AppCard>

            {/* Name Input */}
            <AppCard style={styles.editCard}>
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.editInput}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.editHelperText}>Usernames are locked for V1.</Text>
            </AppCard>

            {/* Yearbook Quote Input */}
            <AppCard style={styles.editCard}>
              <Text style={styles.editLabel}>Yearbook Quote</Text>
              <TextInput
                value={editQuote}
                onChangeText={setEditQuote}
                style={[styles.editInput, { minHeight: hp(10) }]}
                placeholder="Add your yearbook quote..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={150}
                ref={quoteInputRef}
              />
              <Text style={styles.editHelperText}>{editQuote.length}/150 characters</Text>
            </AppCard>

            {/* Photo Gallery Management */}
            <AppCard style={styles.editCard}>
              <View style={styles.galleryHeader}>
                <Text style={styles.editLabel}>Photo Gallery</Text>
                <TouchableOpacity
                  style={styles.addPhotosButton}
                  onPress={handleAddPhotosToGallery}
                  disabled={isUploadingPhoto}
                >
                  <Ionicons name="add-circle" size={hp(2.2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.addPhotosButtonText}>Add Photos</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.editHelperText}>
                Manage your photo gallery. Tap a photo to set it as your yearbook photo.
              </Text>

              {galleryPhotos.length > 0 ? (
                <View style={styles.photoGalleryGrid}>
                  {galleryPhotos.map((photo) => (
                    <View key={photo.id} style={styles.galleryPhotoItem}>
                      <Image source={{ uri: photo.url }} style={styles.galleryPhotoImage} />
                      {photo.url === avatarUrl && (
                        <View style={styles.yearbookPhotoBadge}>
                          <Text style={styles.yearbookPhotoBadgeText}>Yearbook</Text>
                        </View>
                      )}
                      <View style={styles.galleryPhotoActions}>
                        <TouchableOpacity
                          style={styles.galleryActionButton}
                          onPress={() => handleSetAsYearbookPhoto(photo.url)}
                        >
                          <Ionicons name="star" size={hp(1.8)} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.galleryActionButton, styles.removeActionButton]}
                          onPress={() => handleRemovePhoto(photo.id)}
                        >
                          <Ionicons name="trash" size={hp(1.8)} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyGallery}>
                  <Ionicons name="images-outline" size={hp(4)} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyGalleryText}>No photos in your gallery</Text>
                  <Text style={styles.emptyGallerySubtext}>Add photos to create your gallery</Text>
                </View>
              )}
            </AppCard>

            <PrimaryButton
              label={
                updateProfile.isPending || isUploadingAvatar || isUploadingBanner || isUploadingPhoto
                  ? 'Saving...'
                  : 'Save All Changes'
              }
              icon="checkmark"
              onPress={handleSaveAllChanges}
              style={styles.saveButton}
              disabled={updateProfile.isPending || isUploadingAvatar || isUploadingBanner || isUploadingPhoto}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(8),
  },
  errorText: {
    marginTop: hp(2),
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.error,
  },
  errorSubtext: {
    marginTop: hp(1),
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: hp(1.6),
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(6) : hp(4),
    left: wp(4),
    zIndex: 100,
  },
  backButtonCircle: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(6) : hp(4),
    right: wp(4),
    zIndex: 100,
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    width: '100%',
    height: hp(55),
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: hp(55),
    resizeMode: 'cover',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentSection: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    marginTop: -hp(3),
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(10),
    minHeight: hp(50),
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    marginBottom: hp(2),
  },
  avatarImage: {
    width: hp(8),
    height: hp(8),
    borderRadius: hp(4),
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  avatarFallback: {
    width: hp(8),
    height: hp(8),
    borderRadius: hp(4),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  avatarInitial: {
    fontSize: hp(3),
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  avatarInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: hp(2.8),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.3,
  },
  profileHandle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    marginTop: hp(0.3),
  },
  galleryPreview: {
    marginBottom: hp(2),
  },
  galleryThumbnail: {
    width: wp(28),
    height: wp(28),
    borderRadius: theme.radius.md,
    marginRight: wp(2),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  quoteSection: {
    marginBottom: hp(2.5),
    padding: wp(3.5),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  quoteTitle: {
    fontSize: hp(1.6),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  quoteEditButton: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  quoteEditText: {
    fontSize: hp(1.4),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quote: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: hp(2.5),
  },
  quotePlaceholder: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    lineHeight: hp(2.4),
  },
  friendsButton: {
    marginBottom: hp(2.5),
  },
  profileViewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    marginBottom: hp(2.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileViewsText: {
    flex: 1,
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(2.5),
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    gap: wp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaPillText: {
    fontSize: hp(1.4),
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(2.5),
  },
  locationText: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
  },
  interestsSection: {
    marginBottom: hp(2.5),
  },
  sectionTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1.2),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  tag: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.9),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  onboardingWarning: {
    marginTop: hp(2),
    padding: hp(2),
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  onboardingWarningTitle: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: theme.colors.warning,
    marginBottom: hp(0.5),
  },
  onboardingWarningText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  onboardingButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.bondedPurple + '20',
    borderRadius: theme.radius.md,
  },
  onboardingButtonText: {
    fontSize: hp(1.4),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: hp(2.4),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: hp(0.5),
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: hp(4),
  },
  modalEmptyText: {
    marginTop: hp(2),
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalEmptySubtext: {
    marginTop: hp(1),
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  friendsList: {
    paddingVertical: hp(1),
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  friendAvatar: {
    width: hp(5.5),
    height: hp(5.5),
    borderRadius: hp(2.75),
  },
  friendAvatarPlaceholder: {
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.2),
  },
  friendDetails: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
  },
  // Edit modal styles
  editScrollView: {
    flex: 1,
  },
  editScrollContent: {
    padding: wp(4),
    paddingBottom: hp(4),
  },
  editCard: {
    marginBottom: hp(2),
  },
  editLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  editInput: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    lineHeight: hp(2.2),
    minHeight: hp(6),
    textAlignVertical: 'top',
  },
  editHelperText: {
    marginTop: hp(0.8),
    fontSize: hp(1.2),
    color: theme.colors.textSecondary,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    gap: hp(1.5),
  },
  avatarPreview: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: hp(1),
    gap: wp(2),
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: hp(1.6),
    fontWeight: '600',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    backgroundColor: theme.colors.bondedPurple + '15',
    borderRadius: hp(0.8),
  },
  addPhotosButtonText: {
    color: theme.colors.bondedPurple,
    fontSize: hp(1.5),
    fontWeight: '600',
  },
  photoGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1.5),
  },
  galleryPhotoItem: {
    width: (wp(92) - wp(8) - wp(4)) / 3,
    aspectRatio: 1,
    borderRadius: hp(1),
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
    position: 'relative',
  },
  galleryPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  yearbookPhotoBadge: {
    position: 'absolute',
    top: wp(1.5),
    left: wp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: hp(0.5),
  },
  yearbookPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: hp(1.1),
    fontWeight: '700',
  },
  galleryPhotoActions: {
    position: 'absolute',
    bottom: wp(1.5),
    left: wp(1.5),
    right: wp(1.5),
    flexDirection: 'row',
    gap: wp(1.5),
  },
  galleryActionButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: hp(0.7),
    borderRadius: hp(0.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  emptyGallery: {
    paddingVertical: hp(4),
    alignItems: 'center',
    gap: hp(1),
  },
  emptyGalleryText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyGallerySubtext: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
  },
  saveButton: {
    marginTop: hp(2),
  },
})
