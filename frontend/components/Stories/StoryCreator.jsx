import React, { useState, useRef, useEffect } from 'react'
import { View, Modal, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

export default function StoryCreator({ visible, forumId, forumName, onClose, onCaptured }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [facing, setFacing] = useState('back')
  const [flash, setFlash] = useState('off')
  const [permission, requestPermission] = useCameraPermissions()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const cameraRef = useRef(null)
  const recordingTimerRef = useRef(null)

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission()
    }
  }, [visible])

  const takePicture = async () => {
    if (!cameraRef.current) return

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      })

      onCaptured({
        uri: photo.uri,
        type: 'image',
        source: 'camera',
      })
    } catch (error) {
      console.log('Camera error:', error)
      Alert.alert('Error', 'Failed to take picture')
    }
  }

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'all', // Use string format for compatibility
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 15, // 15 seconds max for stories
      })

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        onCaptured({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          source: 'gallery',
          duration: asset.duration,
        })
      }
    } catch (error) {
      console.log('Gallery error:', error)
      Alert.alert('Error', 'Failed to pick media')
    }
  }

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return

    try {
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 15) {
            // Auto-stop at 15 seconds
            stopRecording()
            return 15
          }
          return prev + 0.1
        })
      }, 100)

      const video = await cameraRef.current.recordAsync({
        maxDuration: 15,
        quality: '720p',
      })

      onCaptured({
        uri: video.uri,
        type: 'video',
        source: 'camera',
        duration: recordingTime,
      })
    } catch (error) {
      console.log('Recording error:', error)
      Alert.alert('Error', 'Failed to record video')
    } finally {
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return

    try {
      cameraRef.current.stopRecording()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    } catch (error) {
      console.log('Stop recording error:', error)
    }
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'))
  }

  const toggleFlash = () => {
    setFlash((current) => {
      if (current === 'off') return 'on'
      if (current === 'on') return 'auto'
      return 'off'
    })
  }

  if (!visible) return null

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to let you create stories
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionButtonSecondary} onPress={onClose}>
            <Text style={styles.permissionButtonSecondaryText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={hp(3.5)} color={theme.colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Create Story</Text>
            <Text style={styles.headerSubtitle}>
              {typeof forumName === 'string' ? forumName : forumName?.name || 'Forum'}
            </Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        {/* Camera View */}
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash} />

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity onPress={toggleFlash} style={styles.topButton}>
            <Ionicons
              name={
                flash === 'off'
                  ? 'flash-off'
                  : flash === 'on'
                  ? 'flash'
                  : 'flash-outline'
              }
              size={hp(3)}
              color={theme.colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Gallery Button */}
          <TouchableOpacity onPress={pickFromGallery} style={styles.galleryButton}>
            <Ionicons name="images-outline" size={hp(3.5)} color={theme.colors.white} />
          </TouchableOpacity>

          {/* Capture Button */}
          <View style={styles.captureContainer}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  {Math.floor(recordingTime)}s
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={takePicture}
              onLongPress={startRecording}
              onPressOut={stopRecording}
              style={[
                styles.captureButtonOuter,
                isRecording && styles.captureButtonRecording,
              ]}
              disabled={isRecording}
            >
              <View
                style={[
                  styles.captureButtonInner,
                  isRecording && styles.captureButtonInnerRecording,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Flip Camera Button */}
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
            <Ionicons name="camera-reverse-outline" size={hp(3.5)} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerButton: {
    width: hp(3.5),
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    opacity: theme.ui.metaOpacity,
    marginTop: theme.spacing.xs,
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: hp(10),
    right: wp(4),
    gap: hp(2),
  },
  topButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxxl,
  },
  galleryButton: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  captureButtonOuter: {
    width: hp(9),
    height: hp(9),
    borderRadius: hp(4.5),
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: hp(7.5),
    height: hp(7.5),
    borderRadius: hp(3.75),
    backgroundColor: theme.colors.white,
  },
  flipButton: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  captureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -hp(6),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.pill,
    gap: wp(2),
  },
  recordingDot: {
    width: hp(1),
    height: hp(1),
    borderRadius: hp(0.5),
    backgroundColor: theme.colors.white,
  },
  recordingTime: {
    fontSize: hp(1.4),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  captureButtonRecording: {
    borderColor: theme.colors.error,
  },
  captureButtonInnerRecording: {
    backgroundColor: theme.colors.error,
    borderRadius: hp(1),
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
    backgroundColor: theme.colors.background,
  },
  permissionTitle: {
    fontSize: hp(2.4),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    marginBottom: hp(1),
  },
  permissionText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: hp(3),
  },
  permissionButton: {
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    marginBottom: hp(1.5),
  },
  permissionButtonText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  permissionButtonSecondary: {
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
  },
  permissionButtonSecondaryText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
  },
})

