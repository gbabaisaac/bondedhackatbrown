import React, { useState, useEffect } from 'react'
import { View, Modal, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Video } from 'expo-video'
import * as Audio from 'expo-audio'
import { LinearGradient } from 'expo-linear-gradient'
import { Image as ExpoImage } from 'expo-image'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

export default function StoryPreview({
  visible,
  imageUri,
  type = 'image',
  textElements,
  stickerElements,
  forumName,
  onBack,
  onPost,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {})
  }, [])

  const handlePost = async () => {
    setIsPosting(true)
    try {
      await onPost()
    } catch (error) {
      console.log('Post error:', error)
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={hp(3)} color={theme.colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Preview</Text>
            <Text style={styles.headerSubtitle}>
              {typeof forumName === 'string' ? forumName : forumName?.name || 'Forum'}
            </Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        {/* Preview Canvas */}
        <View style={styles.preview}>
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
            style={styles.previewGradient}
            locations={[0, 0.5, 1]}
          />
          {type === 'video' ? (
            <Video
              style={styles.image}
              source={{ uri: imageUri }}
              resizeMode="cover"
              useNativeControls
              shouldPlay={false}
            />
          ) : (
            <ExpoImage
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              placeholder="|rF?hV%2WCj[ayj[ayayfQfQayayj[fQfQj[j[fQfQfQayayfQfQayayj[j[fQj[j["
              transition={300}
            />
          )}

          {/* Render text overlays */}
          {textElements.map((textEl) => (
            <View
              key={textEl.id}
              style={[
                styles.textElement,
                {
                  left: textEl.x - 50,
                  top: textEl.y - 20,
                },
              ]}
            >
              <View
                style={[
                  styles.textWrapper,
                  {
                    backgroundColor: textEl.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textElementText,
                    {
                      color: textEl.color,
                      fontSize: textEl.size,
                    },
                  ]}
                >
                  {textEl.text}
                </Text>
              </View>
            </View>
          ))}

          {/* Render sticker overlays */}
          {stickerElements.map((sticker) => (
            <View
              key={sticker.id}
              style={[
                styles.stickerElement,
                {
                  left: sticker.x - sticker.size / 2,
                  top: sticker.y - sticker.size / 2,
                },
              ]}
            >
              <Text style={{ fontSize: sticker.size }}>{sticker.emoji}</Text>
            </View>
          ))}
        </View>

        {/* Post Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.postButton, isPosting && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={isPosting}
            activeOpacity={0.8}
          >
            {isPosting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Ionicons
                  name="paper-plane"
                  size={hp(2.2)}
                  color={theme.colors.white}
                  style={{ marginRight: wp(2) }}
                />
                <Text style={styles.postButtonText}>
                  Post to {typeof forumName === 'string' ? forumName : forumName?.name || 'Forum'}
                </Text>
              </>
            )}
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: hp(3),
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: hp(1.9),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: hp(1.4),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
    marginTop: hp(0.2),
  },
  preview: {
    flex: 1,
    position: 'relative',
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  textElement: {
    position: 'absolute',
  },
  textWrapper: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.sm,
  },
  textElementText: {
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  stickerElement: {
    position: 'absolute',
  },
  footer: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    fontSize: hp(1.9),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
  },
  videoPlaceholder: {
    color: theme.colors.white,
    fontSize: hp(2),
    textAlign: 'center',
    opacity: 0.7,
  },
})

