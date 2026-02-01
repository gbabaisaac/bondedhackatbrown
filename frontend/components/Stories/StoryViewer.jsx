import { Ionicons } from '@expo/vector-icons'
import * as Audio from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Video } from 'expo-video'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../../app/theme'
import { useStoriesContext } from '../../contexts/StoriesContext'
import { hp, wp } from '../../helpers/common'

const STORY_DURATION = 5000 // 5 seconds per story segment
const BLURHASH_PLACEHOLDER =
  '|rF?hV%2WCj[ayj[ayayfQfQayayj[fQfQj[j[fQfQfQayayfQfQayayj[j[fQj[j['

export default function StoryViewer({
  visible,
  stories,
  initialIndex = 0,
  onClose,
  currentUserId,
}) {
  const router = useRouter()
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const [currentStoryGroupIndex, setCurrentStoryGroupIndex] = useState(initialIndex)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [messageText, setMessageText] = useState('')
  const [swipeUpProgress, setSwipeUpProgress] = useState(0)
  const [likedStories, setLikedStories] = useState(new Set())
  const progressAnims = useRef([]).current
  const pauseTimeRef = useRef(null)
  const remainingTimeRef = useRef(STORY_DURATION)
  const swipeUpAnim = useRef(new Animated.Value(0)).current
  const videoRef = useRef(null)
  const { markStoryAsViewed, deleteStory, addCommentToStory, getStoryComments } =
    useStoriesContext()

  const currentStoryGroup = stories[currentStoryGroupIndex]
  const currentSegment = currentStoryGroup?.segments?.[currentSegmentIndex]
  const totalSegments = currentStoryGroup?.segments?.length || 0
  const isOwnStory = currentStoryGroup?.userId === currentUserId
  const isPublic = currentStoryGroup?.isPublic !== false // Default to public
  const currentStoryId = currentSegment?.id
  const comments = currentStoryId ? getStoryComments(currentStoryId) : []

  // Initialize progress animations
  useEffect(() => {
    if (currentStoryGroup) {
      progressAnims.length = 0
      for (let i = 0; i < totalSegments; i++) {
        progressAnims.push(new Animated.Value(0))
      }
    }
  }, [currentStoryGroupIndex, totalSegments])

  // Ensure audio plays in silent mode for video stories
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (visible && currentSegment && !isPaused) {
      startProgress()
    }
    return () => {
      progressAnims.forEach((anim) => anim.stopAnimation())
    }
  }, [visible, currentStoryGroupIndex, currentSegmentIndex, isPaused])

  useEffect(() => {
    if (currentStoryGroup) {
      markStoryAsViewed(currentStoryGroup.id)
    }
  }, [currentStoryGroupIndex])

  // Prefetch the first segment of the next story to avoid flashes
  useEffect(() => {
    const nextGroup = stories[currentStoryGroupIndex + 1]
    const nextSegment = nextGroup?.segments?.[0]
    if (nextSegment?.imageUri) {
      ExpoImage.prefetch?.(nextSegment.imageUri).catch(() => {})
    }
  }, [currentStoryGroupIndex, stories])

  const startProgress = () => {
    // For video segments, progress is driven by playback status updates
    if (currentSegment?.type === 'video') {
      progressAnims[currentSegmentIndex]?.setValue(0)
      return
    }

    const duration = remainingTimeRef.current
    Animated.timing(progressAnims[currentSegmentIndex], {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        remainingTimeRef.current = STORY_DURATION
        handleNext()
      }
    })
  }

  const pauseProgress = () => {
    if (currentSegment?.type === 'video') {
      videoRef.current?.pauseAsync?.()
    }
    pauseTimeRef.current = Date.now()
    progressAnims[currentSegmentIndex].stopAnimation((value) => {
      remainingTimeRef.current = STORY_DURATION * (1 - value)
    })
    setIsPaused(true)
  }

  const resumeProgress = () => {
    if (currentSegment?.type === 'video') {
      videoRef.current?.playAsync?.()
    }
    setIsPaused(false)
  }

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {})
    if (currentSegmentIndex < totalSegments - 1) {
      progressAnims[currentSegmentIndex].setValue(1)
      setCurrentSegmentIndex((prev) => prev + 1)
      remainingTimeRef.current = STORY_DURATION
    } else if (currentStoryGroupIndex < stories.length - 1) {
      progressAnims.forEach((anim) => anim.setValue(0))
      setCurrentStoryGroupIndex((prev) => prev + 1)
      setCurrentSegmentIndex(0)
      remainingTimeRef.current = STORY_DURATION
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    Haptics.selectionAsync().catch(() => {})
    if (currentSegmentIndex > 0) {
      progressAnims[currentSegmentIndex].setValue(0)
      setCurrentSegmentIndex((prev) => prev - 1)
      remainingTimeRef.current = STORY_DURATION
    } else if (currentStoryGroupIndex > 0) {
      const prevStoryGroup = stories[currentStoryGroupIndex - 1]
      progressAnims.forEach((anim) => anim.setValue(0))
      setCurrentStoryGroupIndex((prev) => prev - 1)
      setCurrentSegmentIndex(prevStoryGroup.segments.length - 1)
      remainingTimeRef.current = STORY_DURATION
    }
  }

  const handleTap = (event) => {
    const { locationX } = event.nativeEvent
    const screenWidth = Dimensions.get('window').width
    if (locationX < screenWidth / 3) {
      handlePrevious()
    } else if (locationX > (screenWidth * 2) / 3) {
      handleNext()
    }
  }

  const handleLongPressIn = () => {
    pauseProgress()
  }

  const handleLongPressOut = () => {
    resumeProgress()
  }

  const handleDelete = () => {
    Alert.alert('Delete Story', 'Are you sure you want to delete this story?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteStory(currentStoryGroup.forumId, currentStoryGroup.id)
          if (stories.length > 1) {
            if (currentStoryGroupIndex < stories.length - 1) {
              setCurrentStoryGroupIndex(currentStoryGroupIndex)
            } else {
              setCurrentStoryGroupIndex(currentStoryGroupIndex - 1)
            }
          } else {
            onClose()
          }
        },
      },
    ])
  }

  const handleVideoStatusUpdate = (status) => {
    if (!status || !status.isLoaded) return
    const { positionMillis, durationMillis, didJustFinish } = status

    if (durationMillis && progressAnims[currentSegmentIndex]) {
      const progress = Math.min(positionMillis / durationMillis, 1)
      progressAnims[currentSegmentIndex].setValue(progress)
    }

    if (didJustFinish) {
      remainingTimeRef.current = STORY_DURATION
      handleNext()
    }
  }

  const handleSendComment = () => {
    if (!commentText.trim() || !currentStoryId) return

    addCommentToStory(currentStoryId, {
      userId: currentUserId,
      userName: 'You',
      userAvatar: null,
      text: commentText.trim(),
      isAnon: false,
    })

    setCommentText('')
  }

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    if (!currentStoryId) return
    setLikedStories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(currentStoryId)) {
        newSet.delete(currentStoryId)
      } else {
        newSet.add(currentStoryId)
      }
      return newSet
    })
  }

  const handleSendMessage = () => {
    if (!messageText.trim()) return
    
    // Navigate to messages with story content
    router.push({
      pathname: '/chat',
      params: {
        userId: currentStoryGroup.userId,
        userName: currentStoryGroup.name,
        initialMessage: messageText.trim(),
        share: JSON.stringify({
          type: 'story',
          data: {
            storyId: currentStoryId,
            userName: currentStoryGroup?.name || 'Unknown',
            imageUri: currentSegment?.imageUri || '',
          },
        }),
      },
    })
    setMessageText('')
    setShowMessageModal(false)
  }


  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.commentAvatarImage} />
        ) : (
          <Text style={styles.commentAvatarText}>
            {item.userName?.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.commentName}>{item.userName}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  )

  if (!visible || !currentStoryGroup || !currentSegment) return null

  const styles = createStyles(theme)

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Progress bars */}
          <View
            style={[
              styles.progressContainer,
              { paddingTop: hp(0.75) + (insets.top || 0) },
            ]}
          >
            {currentStoryGroup.segments.map((_, index) => {
              const width =
                progressAnims[index]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }) || '0%'
              return (
                <View key={index} style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width,
                        backgroundColor:
                          index <= currentSegmentIndex
                            ? theme.colors.white
                            : 'rgba(255,255,255,0.28)',
                      },
                    ]}
                  />
                </View>
              )
            })}
          </View>

          {/* Header */}
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'transparent']}
            style={[styles.headerGradient, { paddingTop: (insets.top || 0) + hp(0.5) }]}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  {currentStoryGroup.thumbnail ? (
                    <ExpoImage
                      source={{ uri: currentStoryGroup.thumbnail }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {currentStoryGroup.name?.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.name}>{currentStoryGroup.name}</Text>
                  <Text style={styles.time}>{currentSegment.timeAgo || '3h'}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {isOwnStory && (
                  <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                    <Ionicons name="trash-outline" size={hp(2.5)} color={theme.colors.white} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                  <Ionicons name="close" size={hp(2.8)} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Story content - Proper dimensions */}
          <View style={styles.content}>
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.5)']}
              style={styles.contentGradient}
              locations={[0, 0.5, 1]}
            />
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleTap}
              onLongPress={handleLongPressIn}
              onPressOut={handleLongPressOut}
            >
            {currentSegment.type === 'video' ? (
              <Video
                key={currentStoryId}
                ref={videoRef}
                style={styles.media}
                source={{ uri: currentSegment.videoUri || currentSegment.imageUri }}
                resizeMode="cover"
                shouldPlay={!isPaused}
                isLooping={false}
                useNativeControls={false}
                onPlaybackStatusUpdate={handleVideoStatusUpdate}
              />
            ) : (
              <ExpoImage
                source={{ uri: currentSegment.imageUri }}
                style={styles.media}
                contentFit="cover"
                placeholder={BLURHASH_PLACEHOLDER}
                transition={300}
              />
            )}

            {/* Render text overlays */}
            {currentSegment.textElements?.map((textEl) => (
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
            {currentSegment.stickerElements?.map((sticker) => (
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

            {isPaused && (
              <View style={styles.pausedIndicator}>
                <Ionicons name="pause" size={hp(6)} color={theme.colors.white} />
              </View>
            )}
            </Pressable>
          </View>

          {/* Bottom Action Bar */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.bottomGradient}
          >
            <View style={styles.bottomActions}>
              <View style={styles.bottomActionsLeft}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowComments(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={hp(2.6)} color={theme.colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    likedStories.has(currentStoryId) && styles.actionButtonActive,
                  ]}
                  onPress={handleLike}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={likedStories.has(currentStoryId) ? "heart" : "heart-outline"}
                    size={hp(2.6)}
                    color={likedStories.has(currentStoryId) ? "#FF3040" : theme.colors.white}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => setShowMessageModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="paper-plane-outline" size={hp(2.2)} color={theme.colors.white} />
                <Text style={styles.messageButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Message Modal */}
          {showMessageModal && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.messageModalOverlay}
            >
              <Pressable
                style={styles.messageModalBackdrop}
                onPress={() => setShowMessageModal(false)}
              >
                <Pressable
                  style={styles.messageModalContent}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.messageModalHeader}>
                    <Text style={styles.messageModalTitle}>Send Message</Text>
                    <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                      <Ionicons name="close" size={hp(2.5)} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.textSecondary}
                    style={styles.messageInput}
                    multiline
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    style={[
                      styles.messageSendButton,
                      !messageText.trim() && styles.messageSendButtonDisabled,
                    ]}
                    disabled={!messageText.trim()}
                  >
                    <Text style={styles.messageSendButtonText}>Send</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          )}

          {/* Comments Panel (Notes) */}
          {showComments && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.commentsContainer}
            >
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>
                  Notes ({comments.length})
                </Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={hp(2.5)} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
              />
              <View style={styles.commentInputContainer}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a note..."
                  placeholderTextColor={theme.colors.textSecondary}
                  style={styles.commentInput}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSendComment}
                  style={[
                    styles.sendButton,
                    !commentText.trim() && styles.sendButtonDisabled,
                  ]}
                  disabled={!commentText.trim()}
                >
                  <Ionicons
                    name="send"
                    size={hp(2.2)}
                    color={commentText.trim() ? theme.colors.bondedPurple : theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Keep dark for media contrast
    width: wp(100),
    height: hp(100),
    maxWidth: wp(100),
    maxHeight: hp(100),
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    maxWidth: wp(100),
    maxHeight: hp(100),
  },
  progressContainer: {
    flexDirection: 'row',
    gap: wp(1),
    paddingHorizontal: wp(3.5),
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.5),
    paddingBottom: hp(1),
    paddingTop: hp(0.5),
  },
  headerGradient: {
    paddingTop: hp(1),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerButton: {
    padding: hp(0.5),
  },
  avatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: hp(2),
    color: theme.colors.white,
    fontWeight: '700',
  },
  name: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  time: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.white,
    opacity: theme.typography.opacity.meta,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: wp(100),
    maxHeight: hp(100),
    overflow: 'hidden',
  },
  contentGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },
  media: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: wp(100),
    maxHeight: hp(100),
    zIndex: 0,
  },
  textElement: {
    position: 'absolute',
    zIndex: 2,
  },
  textWrapper: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: hp(0.5),
  },
  textElementText: {
    fontWeight: '700',
    color: theme.colors.white,
  },
  stickerElement: {
    position: 'absolute',
    zIndex: 2,
  },
  pausedIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -hp(3) }, { translateY: -hp(3) }],
    zIndex: 3,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: hp(1),
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    paddingTop: hp(1.5),
  },
  bottomActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  actionButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  messageButtonText: {
    fontSize: hp(1.6),
    color: theme.colors.white,
    fontWeight: '600',
  },
  messageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  messageModalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageModalContent: {
    width: wp(85),
    backgroundColor: theme.colors.background,
    borderRadius: hp(2),
    padding: wp(5),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  messageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  messageModalTitle: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
  },
  messageInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: hp(1.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(10),
    maxHeight: hp(20),
    marginBottom: hp(2),
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  messageSendButton: {
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: hp(1.5),
    paddingVertical: hp(1.5),
    alignItems: 'center',
  },
  messageSendButtonDisabled: {
    opacity: 0.5,
  },
  messageSendButtonText: {
    fontSize: hp(1.7),
    color: theme.colors.white,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.body,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: hp(2.5),
    borderTopRightRadius: hp(2.5),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  commentsTitle: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingVertical: hp(1),
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  commentAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentAvatarText: {
    fontSize: hp(1.6),
    color: theme.colors.white,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.3),
  },
  commentText: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.9,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: wp(2),
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: hp(1.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    maxHeight: hp(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})
