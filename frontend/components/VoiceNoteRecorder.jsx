import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../app/theme'
import { hp } from '../helpers/common'

export const VoiceNoteRecorder = ({ onRecordingComplete, onCancel }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [recording, setRecording] = useState(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const durationIntervalRef = useRef(null)
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Request audio permissions
    Audio.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted')
    })

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      stopRecording()
    }
  }, [])

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const { status } = await Audio.requestPermissionsAsync()
        if (status !== 'granted') {
          return
        }
        setHasPermission(true)
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      setRecording(newRecording)
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      setIsRecording(false)
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      Animated.loop().stop()

      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()

      if (onRecordingComplete && uri) {
        onRecordingComplete({
          uri,
          duration: recordingDuration,
        })
      }

      setRecording(null)
      setRecordingDuration(0)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const cancelRecording = () => {
    stopRecording()
    if (onCancel) onCancel()
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Microphone permission required</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.recordingContainer}>
        {isRecording ? (
          <>
            <Animated.View style={[styles.recordButton, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="mic" size={hp(3)} color={theme.colors.white} />
            </Animated.View>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Ionicons name="mic-outline" size={hp(3)} color={theme.colors.white} />
            </TouchableOpacity>
            <Text style={styles.instructionText}>Tap to record voice note</Text>
          </>
        )}
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  recordButton: {
    width: hp(8),
    height: hp(8),
    borderRadius: hp(4),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  durationText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  stopButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
  },
  instructionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  cancelButton: {
    paddingVertical: theme.spacing.sm,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
  },
  permissionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
})












