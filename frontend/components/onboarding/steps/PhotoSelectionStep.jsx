import { Ionicons } from '@expo/vector-icons'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'

const PhotoSelectionStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const isUpdatingFromFormData = useRef(false)
  const [yearbookPhoto, setYearbookPhoto] = useState(
    formData.photos?.find(p => p.isYearbookPhoto) || null
  )
  const [galleryPhotos, setGalleryPhotos] = useState(
    formData.photos?.filter(p => !p.isYearbookPhoto) || []
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [quote, setQuote] = useState(formData.yearbookQuote || '')

  // Sync photos from formData when component mounts or formData changes
  useEffect(() => {
    if (formData.photos && !isUpdatingFromFormData.current) {
      const newYearbookPhoto = formData.photos.find(p => p.isYearbookPhoto) || null
      const newGalleryPhotos = formData.photos.filter(p => !p.isYearbookPhoto) || []
      
      setYearbookPhoto(newYearbookPhoto)
      setGalleryPhotos(newGalleryPhotos)
    }
  }, [formData.photos])

  // Helper to update formData with current photos
  const syncPhotosToFormData = (newYearbookPhoto, newGalleryPhotos) => {
    isUpdatingFromFormData.current = true
    const allPhotos = []
    if (newYearbookPhoto) allPhotos.push(newYearbookPhoto)
    allPhotos.push(...newGalleryPhotos)
    updateFormData(ONBOARDING_STEPS.PHOTOS, { photos: allPhotos })
    
    // Reset flag after a short delay to allow formData to update
    setTimeout(() => {
      isUpdatingFromFormData.current = false
    }, 100)
  }

  // Request permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to set up your profile.',
        [{ text: 'OK' }]
      )
      return false
    }
    return true
  }

  // Process image - resize if needed but keep full image (no cropping)
  const processImage = async (uri) => {
    try {
      // Resize to max width 1200px while maintaining aspect ratio
      // This reduces file size without cropping the image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } }, // Resize to max width, height scales proportionally
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      )

      return manipResult.uri
    } catch (error) {
      console.error('Error processing image:', error)
      return uri // Return original if processing fails
    }
  }

  // Handle yearbook photo selection (single photo)
  const handleSelectYearbookPhoto = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    setIsProcessing(true)

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: false, // Allow full image selection without forced cropping
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0]
        const processedUri = await processImage(asset.uri)

        const photo = {
          uri: processedUri,
          localUri: processedUri,
          isYearbookPhoto: true,
          order: 0,
        }

        setYearbookPhoto(photo)
        syncPhotosToFormData(photo, galleryPhotos)
      }
    } catch (error) {
      console.error('Error selecting yearbook photo:', error)
      Alert.alert('Error', 'Failed to select photo. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle gallery photos selection (multiple photos)
  const handleSelectGalleryPhotos = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    setIsProcessing(true)

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets) {
        const newPhotos = await Promise.all(
          result.assets.map(async (asset, index) => {
          const processedUri = await processImage(asset.uri)
            return {
            uri: processedUri,
            localUri: processedUri,
              isYearbookPhoto: false,
              order: galleryPhotos.length + index + 1,
            }
          })
        )

        // Deduplicate photos by URI to prevent duplicates
        const existingUris = new Set(galleryPhotos.map(photo => photo.uri))
        const uniqueNewPhotos = newPhotos.filter(photo => !existingUris.has(photo.uri))

        const updatedGallery = [...galleryPhotos, ...uniqueNewPhotos]
        setGalleryPhotos(updatedGallery)
        syncPhotosToFormData(yearbookPhoto, updatedGallery)
      }
    } catch (error) {
      console.error('Error selecting gallery photos:', error)
      Alert.alert('Error', 'Failed to select photos. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Remove gallery photo
  const handleRemoveGalleryPhoto = (index) => {
    const newPhotos = galleryPhotos.filter((_, i) => i !== index)
    setGalleryPhotos(newPhotos)
    syncPhotosToFormData(yearbookPhoto, newPhotos)
  }

  // Handle quote change
  const handleQuoteChange = (text) => {
    setQuote(text)
    updateFormData(ONBOARDING_STEPS.PHOTOS, { yearbookQuote: text })
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator
      onScroll={onScroll}
      scrollEventThrottle={16}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      bounces={true}
      scrollIndicatorInsets={{ right: 2, bottom: hp(18) }}
    >
      <View style={styles.header}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Step 2 · Photos & Quote</Text>
        </View>
        <Text style={styles.title}>Add your yearbook photo</Text>
        <Text style={styles.subtitle}>
          This will be your main profile photo and yearbook picture across the app.
        </Text>
      </View>

      {/* Yearbook Photo preview */}
      <View style={styles.previewCard}>
        <View style={styles.previewImageWrapper}>
          {yearbookPhoto?.localUri ? (
            <Image source={{ uri: yearbookPhoto.localUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="person-circle-outline" size={hp(8)} color="#A45CFF" />
              <Text style={styles.previewPlaceholderText}>Your yearbook photo</Text>
              <Text style={styles.previewPlaceholderSubtext}>A generic avatar will be used if you skip</Text>
            </View>
          )}
        </View>
        <View style={styles.previewActions}>
          <Text style={styles.previewHint}>
            {!yearbookPhoto
              ? 'Choose a clear photo of yourself'
              : 'Looking good! You can change this anytime in settings.'
            }
          </Text>
          <TouchableOpacity
            style={styles.addPrimaryButton}
            onPress={handleSelectYearbookPhoto}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name={!yearbookPhoto ? "camera" : "image"} size={hp(2.4)} color="#FFFFFF" />
            <Text style={styles.addPrimaryText}>
              {!yearbookPhoto ? 'Choose yearbook photo' : 'Change yearbook photo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#A45CFF" />
          <Text style={styles.processingText}>Processing photo...</Text>
        </View>
      )}

      {/* Gallery Photos Section */}
      <View style={styles.gallerySection}>
        <View style={styles.gallerySectionHeader}>
          <View style={styles.gallerySectionHeaderLeft}>
            <Text style={styles.gallerySectionTitle}>Photo Album (Optional)</Text>
            <Text style={styles.gallerySectionSubtitle}>
              Add more photos to showcase your personality
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addGalleryButton}
            onPress={handleSelectGalleryPhotos}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={hp(3)} color="#A45CFF" />
            <Text style={styles.addGalleryText}>Add</Text>
          </TouchableOpacity>
        </View>

        {galleryPhotos.length > 0 ? (
          <View style={styles.photoGrid}>
            {galleryPhotos.map((photo, index) => (
          <View key={index} style={styles.photoCard}>
            <Image source={{ uri: photo.localUri }} style={styles.photoImage} />
            <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveGalleryPhoto(index)}
            >
              <Ionicons name="close-circle" size={hp(3)} color="#FFFFFF" />
            </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyGalleryState}>
            <Ionicons name="images-outline" size={hp(4)} color="#8E8E8E" />
            <Text style={styles.emptyGalleryText}>No photos yet</Text>
            <Text style={styles.emptyGallerySubtext}>
              Add multiple photos to create your album
            </Text>
          </View>
        )}
      </View>

      {/* Tips Section */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={hp(2.5)} color="#4CAF50" />
          <Text style={styles.tipText}>Use a clear, recent photo for your yearbook photo</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={hp(2.5)} color="#4CAF50" />
          <Text style={styles.tipText}>Make sure your face is visible and well-lit</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={hp(2.5)} color="#4CAF50" />
          <Text style={styles.tipText}>Add multiple photos to show different sides of you</Text>
        </View>
      </View>

      {/* Yearbook Quote Section */}
          <View style={styles.quoteContainer}>
        <Text style={styles.quoteLabel}>Yearbook Quote (Optional)</Text>
            <Text style={styles.quoteHint}>
          Add a memorable quote that represents you. This will appear on your profile.
            </Text>
            <TextInput
              style={styles.quoteInput}
              value={quote}
              onChangeText={handleQuoteChange}
          placeholder="Enter your yearbook quote..."
          placeholderTextColor="#8E8E8E"
              multiline
              maxLength={150}
            />
        <Text style={styles.characterCount}>{quote.length}/150</Text>
      </View>

      {/* Skip Option */}
      {!yearbookPhoto && (
        <View style={styles.skipContainer}>
          <Ionicons name="information-circle-outline" size={hp(2.5)} color="#8E8E8E" />
          <Text style={styles.skipText}>
            You can skip the yearbook photo and a generic avatar will be used. You can add photos later in settings.
            </Text>
          </View>
      )}
    </ScrollView>
  )
}

export default PhotoSelectionStep

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: hp(2.5),
    paddingBottom: hp(28), // Extra padding for fixed navigation buttons at bottom
    flexGrow: 1,
    gap: hp(1.5),
  },
  header: {
    paddingHorizontal: wp(4),
    gap: hp(1),
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: {
    fontSize: hp(1.5),
    color: '#6F42C1',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: hp(3.6),
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'System',
    marginBottom: hp(1),
    textAlign: 'left',
  },
  subtitle: {
    fontSize: hp(2.2),
    color: '#8E8E8E',
    fontFamily: 'System',
    marginBottom: hp(2),
    textAlign: 'left',
  },
  previewCard: {
    marginHorizontal: wp(4),
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    ...ONBOARDING_THEME.shadows?.sm,
  },
  previewImageWrapper: {
    width: '100%',
    aspectRatio: 1.4,
    backgroundColor: '#F5F0FF',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(1),
  },
  previewPlaceholderText: {
    color: '#2A2A2A',
    fontSize: hp(2),
    fontWeight: '600',
    marginTop: hp(1),
  },
  previewPlaceholderSubtext: {
    color: '#8E8E8E',
    fontSize: hp(1.6),
    marginTop: hp(0.5),
    textAlign: 'center',
    paddingHorizontal: wp(4),
  },
  previewBadge: {
    position: 'absolute',
    top: wp(3),
    left: wp(3),
    backgroundColor: '#A45CFF',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: 999,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: hp(1.4),
  },
  previewActions: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    gap: hp(1),
  },
  previewHint: {
    color: '#4B4B4B',
    fontSize: hp(1.9),
    lineHeight: hp(2.5),
  },
  addPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#A45CFF',
    borderRadius: 14,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    gap: wp(2),
  },
  addPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: hp(2),
    flex: 1,
  },
  addPrimaryCount: {
    color: '#F5E8FF',
    fontWeight: '600',
    fontSize: hp(1.8),
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  processingText: {
    marginTop: hp(2),
    fontSize: hp(2),
    color: '#8E8E8E',
    fontFamily: 'System',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
    rowGap: wp(2),
  },
  addPhotoButton: {
    width: (wp(100) - wp(8) - wp(2)) / 2, // Screen width - padding - gap, divided by 2
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#A45CFF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(1),
    paddingHorizontal: wp(3),
  },
  addPhotoText: {
    fontSize: hp(1.8),
    color: '#A45CFF',
    fontFamily: 'System',
    fontWeight: '600',
  },
  addPhotoSubtext: {
    fontSize: hp(1.5),
    color: '#7B61FF',
    opacity: 0.8,
  },
  photoCard: {
    width: (wp(100) - wp(8) - wp(2)) / 2, // Screen width - padding - gap, divided by 2
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  yearbookBadge: {
    position: 'absolute',
    top: wp(2),
    left: wp(2),
    backgroundColor: '#A45CFF',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: 9999,
  },
  yearbookBadgeText: {
    fontSize: hp(1.3),
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: wp(2),
    right: wp(2),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: hp(1.5),
    padding: hp(0.3),
    zIndex: 10,
  },
  removeButtonWithBadge: {
    top: wp(8), // Move down if yearbook badge is present
  },
  setYearbookButton: {
    position: 'absolute',
    bottom: wp(2),
    left: wp(2),
    right: wp(2),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: 12,
    alignItems: 'center',
  },
  setYearbookText: {
    fontSize: hp(1.6),
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '600',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: wp(4),
    borderRadius: 12,
    marginHorizontal: wp(4),
    marginTop: hp(2),
    gap: wp(3),
  },
  instructionsText: {
    flex: 1,
    fontSize: hp(1.8),
    color: '#8E8E8E',
    fontFamily: 'System',
    lineHeight: hp(2.5),
  },
  photoCount: {
    fontSize: hp(2),
    color: '#8E8E8E',
    fontFamily: 'System',
    textAlign: 'left',
    marginTop: hp(1),
    marginHorizontal: wp(4),
    opacity: 0.8,
  },
  quoteContainer: {
    marginTop: hp(2),
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
  },
  quoteLabel: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    marginBottom: hp(1),
  },
  quoteHint: {
    fontSize: hp(1.8),
    color: '#8E8E8E',
    fontFamily: 'System',
    marginBottom: hp(2),
    lineHeight: hp(2.5),
  },
  quoteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: wp(4),
    fontSize: hp(2),
    color: '#1A1A1A',
    fontFamily: 'System',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: hp(1.6),
    color: '#8E8E8E',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: hp(1),
    opacity: 0.7,
  },
  tipsContainer: {
    marginHorizontal: wp(4),
    marginTop: hp(2),
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 12,
    padding: wp(4),
    gap: hp(1.5),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  tipText: {
    flex: 1,
    fontSize: hp(1.8),
    color: '#2A2A2A',
    fontFamily: 'System',
    lineHeight: hp(2.4),
  },
  skipContainer: {
    marginHorizontal: wp(4),
    marginTop: hp(2),
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: wp(4),
    gap: wp(3),
  },
  skipText: {
    flex: 1,
    fontSize: hp(1.7),
    color: '#8E8E8E',
    fontFamily: 'System',
    lineHeight: hp(2.3),
  },
  gallerySection: {
    marginHorizontal: wp(4),
    marginTop: hp(3),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    padding: wp(4),
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
    gap: wp(3),
  },
  gallerySectionHeaderLeft: {
    flex: 1,
  },
  gallerySectionTitle: {
    fontSize: hp(2),
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    marginBottom: hp(0.5),
  },
  gallerySectionSubtitle: {
    fontSize: hp(1.5),
    color: '#8E8E8E',
    fontFamily: 'System',
    lineHeight: hp(2),
  },
  addGalleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(164, 92, 255, 0.1)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: hp(2),
    gap: wp(1.5),
    minWidth: wp(20),
  },
  addGalleryText: {
    fontSize: hp(1.6),
    color: '#A45CFF',
    fontFamily: 'System',
    fontWeight: '700',
  },
  emptyGalleryState: {
    paddingVertical: hp(4),
    alignItems: 'center',
    gap: hp(1),
  },
  emptyGalleryText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#2A2A2A',
    fontFamily: 'System',
  },
  emptyGallerySubtext: {
    fontSize: hp(1.5),
    color: '#8E8E8E',
    fontFamily: 'System',
    textAlign: 'center',
    paddingHorizontal: wp(4),
  },
})
