import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { hp, wp } from '../helpers/common'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  School,
  User,
  UserPlus,
} from './Icons'
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useFriendCount,
  useFriendshipStatus,
  useFriendsForProfile,
  useFriendsRealtime,
  useRemoveFriend,
  useSendFriendRequest,
} from '../hooks/useFriends'
import { useCreateConversation } from '../hooks/useMessages'
import { useAuthStore } from '../stores/authStore'
import { useUserPosts } from '../hooks/useUserPosts'
import { useProfilePhotos } from '../hooks/useProfiles'
import { useMessageRequestStatus, useSendMessageRequest } from '../hooks/useMessageRequests'
import { formatTimeAgo } from '../utils/dateFormatters'
import { useSharedClasses } from '../hooks/useClassMatching'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const YearbookProfileModalContent = ({
  activeProfile,
  setActiveProfile,
  theme,
  router,
  currentUserInterests,
  scrollYRef,
  onClose,
  panResponder,
  onShareProfile,
  onBlockProfile,
}) => {
  const scrollY = useRef(0)

  // All hooks must be called unconditionally before any early returns
  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y
    scrollY.current = offsetY
    if (scrollYRef) {
      scrollYRef.current = offsetY
    }
  }, [scrollYRef])

  const { data: friendshipStatus, isLoading: statusLoading } = useFriendshipStatus(activeProfile?.id)
  const { data: friendCount = 0, isLoading: friendCountLoading } = useFriendCount(activeProfile?.id)
  const { data: friends = [] } = useFriendsForProfile(activeProfile?.id)
  useFriendsRealtime(activeProfile?.id)
  const { user } = useAuthStore()
  const { data: messageRequestStatus } = useMessageRequestStatus(activeProfile?.id)
  const sendMessageRequest = useSendMessageRequest()
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const cancelRequest = useCancelFriendRequest()
  const removeFriend = useRemoveFriend()
  const createConversation = useCreateConversation()
  const { data: recentPosts = [], isLoading: recentPostsLoading } = useUserPosts(activeProfile?.id, 3)
  const { openProfile } = useProfileModal()
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const {
    data: sharedClasses = [],
    isLoading: sharedClassesLoading,
    isError: sharedClassesError,
  } = useSharedClasses(activeProfile?.id)
  
  // Fetch profile photos
  const { data: galleryPhotos = [] } = useProfilePhotos(activeProfile?.id)
  
  // Combine avatar with gallery photos
  const profilePhotos = useMemo(() => {
    if (!activeProfile) return []
    const basePhotos = activeProfile.photoUrl ? [activeProfile.photoUrl] : []
    // Add gallery photos (excluding duplicates)
    const allPhotos = [...basePhotos]
    galleryPhotos.forEach(url => {
      if (url && !allPhotos.includes(url)) {
        allPhotos.push(url)
      }
    })
    // Also check if activeProfile has a photos array
    if (activeProfile.photos && Array.isArray(activeProfile.photos)) {
      activeProfile.photos.forEach(url => {
        if (url && !allPhotos.includes(url)) {
          allPhotos.push(url)
        }
      })
    }
    return allPhotos.length > 0 ? allPhotos : (activeProfile.photoUrl ? [activeProfile.photoUrl] : [])
  }, [activeProfile, galleryPhotos])

  // Early return AFTER all hooks have been called
  if (!activeProfile) return null
  
  // Use onClose if provided, otherwise fall back to setActiveProfile
  const handleClose = onClose || (() => setActiveProfile?.(null))

  const handleFriendAction = () => {
    switch (friendshipStatus?.status) {
      case 'none':
        sendRequest.mutate({ receiverId: activeProfile.id })
        break
      case 'request_sent':
        Alert.alert(
          'Cancel Request?',
          'Are you sure you want to cancel this friend request?',
          [
            { text: 'No', style: 'cancel' },
            { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
              cancelRequest.mutate({ requestId: friendshipStatus.requestId })
            } },
          ]
        )
        break
      case 'request_received':
        acceptRequest.mutate({
          requestId: friendshipStatus.requestId,
          senderId: activeProfile.id,
        })
        break
      case 'friends':
        Alert.alert(
          'Remove Friend?',
          `Are you sure you want to remove ${activeProfile.name} as a friend?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => {
              removeFriend.mutate({ friendId: activeProfile.id })
            } },
          ]
        )
        break
      default:
        break
    }
  }

  const handleMessage = async () => {
    if (!user?.id) return
    if (friendshipStatus?.status !== 'friends') {
      if (messageRequestStatus?.status === 'sent') {
        Alert.alert('Request Sent', 'Message request already sent.')
        return
      }
      if (messageRequestStatus?.status === 'received') {
        Alert.alert('Message Request', 'You have a pending message request. Accept it in Messages.')
        return
      }
      try {
        await sendMessageRequest.mutateAsync({ receiverId: activeProfile.id })
        Alert.alert('Request Sent', 'Your message request has been sent.')
      } catch (error) {
        console.error('Failed to send message request:', error)
        Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to send message request'))
      }
      return
    }

    try {
      // Close the modal first - call both onClose and setActiveProfile to ensure it closes
      if (onClose) {
        onClose()
      }
      if (setActiveProfile) {
        setActiveProfile(null)
      }
      
      // Wait longer for modal to fully close and unmount
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const conversationId = await createConversation.mutateAsync({
        otherUserId: activeProfile.id,
      })
      
      // Additional delay to ensure navigation happens after modal is gone
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Navigate to chat using replace to prevent back navigation to modal
      router.replace({
        pathname: '/chat',
        params: {
          conversationId,
          userId: activeProfile.id,
          userName: activeProfile.name,
        },
      })
    } catch (error) {
      console.error('Error creating conversation:', error)
      Alert.alert('Error', 'Failed to start conversation. Please try again.')
    }
  }

  const handleShare = async () => {
    if (!activeProfile) return
    const sharePayload = {
      id: activeProfile.id,
      name: activeProfile.name,
      majorLabel: activeProfile.major,
      year: activeProfile.year,
      avatar: activeProfile.photoUrl,
      grade: activeProfile.grade,
      quote: activeProfile.quote,
    }
    if (onShareProfile) {
      onShareProfile(sharePayload)
      return
    }
    try {
      await Share.share({
        message: `Check out ${activeProfile.name} on Bonded.`,
      })
    } catch (error) {
      console.warn('Share failed:', error)
    }
  }

  const confirmBlock = () => {
    if (!activeProfile) return
    if (onBlockProfile) {
      onBlockProfile(activeProfile)
      return
    }
    Alert.alert(
      'Block user?',
      `You won't see ${activeProfile.name} again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Blocked', 'Block is coming soon.')
          },
        },
      ]
    )
  }

  const openProfileActions = () => {
    if (!activeProfile) return
    const options = ['Share', 'Block', 'Cancel']
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
          userInterfaceStyle: 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleShare()
          if (buttonIndex === 1) confirmBlock()
        }
      )
      return
    }
    Alert.alert('Profile options', undefined, [
      { text: 'Share', onPress: handleShare },
      { text: 'Block', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const getFriendButtonConfig = () => {
    if (statusLoading) {
      return { icon: null, text: 'Loading...', loading: true, style: 'secondary' }
    }
    switch (friendshipStatus?.status) {
      case 'friends':
        return { icon: Check, text: 'Friends', style: 'friends' }
      case 'request_sent':
        return { icon: Clock, text: 'Pending', style: 'pending' }
      case 'request_received':
        return { icon: UserPlus, text: 'Accept', style: 'accept' }
      default:
        return { icon: UserPlus, text: 'Add friend', style: 'secondary' }
    }
  }

  const buttonConfig = getFriendButtonConfig()
  const isActionLoading = sendRequest.isPending || cancelRequest.isPending ||
    acceptRequest.isPending || removeFriend.isPending

  const styles = createProfileModalStyles(theme)
  const handleOpenPost = (post) => {
    setActiveProfile(null)
    router.push({
      pathname: '/forum',
      params: { forumId: post.forum_id, postId: post.id },
    })
  }

  const previewFriends = friends.slice(0, 8)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Swipe handle area at the very top - for swipe-to-dismiss */}
      {panResponder && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: wp(15),
            right: wp(15),
            height: hp(4),
            zIndex: 110,
          }}
          {...panResponder.panHandlers}
        />
      )}

      <View style={styles.dragIndicatorContainer} pointerEvents="none">
        <View style={styles.dragIndicator} />
      </View>

      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.7}
        onPress={handleClose}
      >
        <View style={styles.backButtonCircle}>
          <ArrowLeft size={hp(2)} color="#fff" strokeWidth={2} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.moreButton}
        activeOpacity={0.7}
        onPress={openProfileActions}
      >
        <View style={styles.moreButtonCircle}>
          <MoreHorizontal size={hp(2.2)} color="#fff" strokeWidth={2} />
        </View>
      </TouchableOpacity>

      <ScrollView
        style={styles.fullScrollView}
        contentContainerStyle={styles.fullScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <View style={styles.heroSection} pointerEvents="box-none">
          {profilePhotos.length > 1 ? (
            <FlatList
              data={profilePhotos}
              keyExtractor={(item, index) => `photo-${index}-${item}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
              nestedScrollEnabled={true}
              disableIntervalMomentum={true}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="start"
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <Image 
                  source={{ uri: item }} 
                  style={{ 
                    width: SCREEN_WIDTH, 
                    height: hp(50),
                    resizeMode: 'cover',
                  }} 
                />
              )}
            />
          ) : (
            <Image
              source={{ uri: activeProfile.photoUrl || profilePhotos[0] }}
              style={styles.heroImage}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.name}>{activeProfile.name}</Text>
          <Text style={styles.handle}>
            @{activeProfile.name.toLowerCase().replace(/\s+/g, '').slice(0, 8)}
          </Text>
          <Text style={styles.bio}>{activeProfile.quote}</Text>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                buttonConfig.style === 'friends' && styles.actionButtonFriends,
                buttonConfig.style === 'pending' && styles.actionButtonPending,
                buttonConfig.style === 'accept' && styles.actionButtonAccept,
                buttonConfig.style === 'secondary' && styles.actionButtonSecondary,
              ]}
              activeOpacity={0.7}
              onPress={handleFriendAction}
              disabled={isActionLoading || buttonConfig.loading}
            >
              {isActionLoading || buttonConfig.loading ? (
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              ) : (
                <>
                  {buttonConfig.icon && (
                    <buttonConfig.icon
                      size={hp(2)}
                      color={buttonConfig.style === 'accept' ? theme.colors.white : theme.colors.textPrimary}
                      strokeWidth={2}
                    />
                  )}
                  <Text style={[
                    styles.actionButtonText,
                    buttonConfig.style === 'accept' && styles.actionButtonTextAccept,
                  ]}>
                    {buttonConfig.text}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonPrimary}
              activeOpacity={0.7}
              onPress={handleMessage}
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <MessageCircle size={hp(2)} color={theme.colors.white} strokeWidth={2} />
                  <Text style={styles.actionButtonPrimaryText}>Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <School size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaPillText}>{activeProfile.major}</Text>
            </View>
            <View style={styles.metaPill}>
              <Calendar size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaPillText}>Class of {activeProfile.year}</Text>
            </View>
            <TouchableOpacity style={styles.metaPill} onPress={() => setShowFriendsModal(true)}>
              <UserPlus size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaPillText}>
                {friendCountLoading ? '...' : `${friendCount} friends`}
              </Text>
            </TouchableOpacity>
            {activeProfile.grade && (
              <View style={styles.metaPill}>
                <User size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaPillText}>{activeProfile.grade}</Text>
              </View>
            )}
          </View>

          <View style={styles.locationRow}>
            <MapPin size={hp(1.8)} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text style={styles.locationText}>
              {activeProfile.location || activeProfile.university || 'University of Rhode Island'}
            </Text>
          </View>

          {activeProfile.interests && activeProfile.interests.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>Interests</Text>
              <View style={styles.tagsRow}>
                {activeProfile.interests.slice(0, 8).map((interest, idx) => {
                  const isShared = currentUserInterests.has(interest)
                  return (
                    <View
                      key={idx}
                      style={[styles.tag, isShared && styles.tagShared]}
                    >
                      {isShared && (
                        <Ionicons
                          name="checkmark-circle"
                          size={hp(1.4)}
                          color={theme.colors.bondedPurple}
                          style={{ marginRight: wp(1) }}
                        />
                      )}
                      <Text style={[styles.tagText, isShared && styles.tagTextShared]}>
                        {interest}
                      </Text>
                    </View>
                  )
                })}
              </View>
              {currentUserInterests.size > 0 && (
                <Text style={styles.sharedHint}>Highlighted interests match yours</Text>
              )}
            </View>
          )}

          <View style={styles.tagsSection}>
            <Text style={styles.tagsTitle}>Shared classes</Text>
            {sharedClassesLoading ? (
              <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
            ) : sharedClasses.length > 0 ? (
              <View style={styles.tagsRow}>
                {sharedClasses.slice(0, 6).map((cls) => (
                  <View key={cls.id} style={styles.tag}>
                    <Text style={styles.tagText}>{cls.code || cls.name || 'Class'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sharedHint}>
                {sharedClassesError ? 'Unable to load shared classes' : 'No shared classes yet'}
              </Text>
            )}
          </View>

          {friends.length > 0 && (
            <View style={styles.friendsSection}>
              <View style={styles.friendsHeader}>
                <Text style={styles.tagsTitle}>Friends</Text>
                {friends.length > previewFriends.length && (
                  <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.friendsRow}>
                {previewFriends.map((friend) => {
                  const name = friend.full_name || friend.username || 'User'
                  return (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendItem}
                      onPress={() => {
                        openProfile(friend.id)
                      }}
                      activeOpacity={0.8}
                    >
                      {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                      ) : (
                        <View style={styles.friendAvatarFallback}>
                          <Text style={styles.friendAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          <View style={styles.postsSection}>
            <Text style={styles.postsTitle}>Recent forum posts</Text>
            {recentPostsLoading ? (
              <Text style={styles.postsEmptyText}>Loading posts...</Text>
            ) : recentPosts.length === 0 ? (
              <Text style={styles.postsEmptyText}>No recent posts yet.</Text>
            ) : (
              recentPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  activeOpacity={0.8}
                  onPress={() => handleOpenPost(post)}
                >
                  <Text style={styles.postCardTitle} numberOfLines={2}>
                    {post.title || post.body || 'Untitled post'}
                  </Text>
                  <Text style={styles.postCardMeta} numberOfLines={1}>
                    {(post.forum?.name || 'Forum')} • {formatTimeAgo(post.created_at)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showFriendsModal}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFriendsModal(false)}
        >
          <View style={styles.friendsModal}>
            <View style={styles.friendsModalHeader}>
              <Text style={styles.friendsModalTitle}>Friends</Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                <Text style={styles.seeAllText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const name = item.full_name || item.username || 'User'
                return (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => {
                      openProfile(item.id)
                    }}
                    activeOpacity={0.8}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.friendRowAvatar} />
                    ) : (
                      <View style={styles.friendRowAvatarFallback}>
                        <Text style={styles.friendAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.friendRowInfo}>
                      <Text style={styles.friendRowName}>{name}</Text>
                      {item.major && <Text style={styles.friendRowMeta}>{item.major}</Text>}
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export default YearbookProfileModalContent

const createProfileModalStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dragIndicatorContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(1.5) : hp(1),
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingVertical: hp(0.5),
  },
  dragIndicator: {
    width: wp(10),
    height: hp(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: hp(0.25),
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(6) : hp(4),
    left: wp(4),
    zIndex: 150,
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
    zIndex: 150,
  },
  moreButtonCircle: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScrollView: {
    flex: 1,
  },
  fullScrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    width: '100%',
    height: hp(55),
    position: 'relative',
    marginTop: -hp(5),
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  name: {
    fontSize: hp(3.2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
    letterSpacing: -0.3,
  },
  handle: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(2),
  },
  bio: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.5),
    marginBottom: hp(3),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2.5),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.3),
    borderRadius: theme.radius.lg,
    gap: wp(2),
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actionButtonFriends: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  actionButtonPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  actionButtonAccept: {
    backgroundColor: theme.colors.bondedPurple,
  },
  actionButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  actionButtonTextAccept: {
    color: theme.colors.white,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.3),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.bondedPurple,
    gap: wp(2),
  },
  actionButtonPrimaryText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(2),
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: theme.radius.full,
    gap: wp(1.5),
  },
  metaPillText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(3),
  },
  locationText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  tagsSection: {
    marginBottom: hp(3),
  },
  postsSection: {
    marginBottom: hp(3),
  },
  postsTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1.5),
  },
  postsEmptyText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  postCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.4),
    marginBottom: hp(1.2),
  },
  postCardTitle: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    marginBottom: hp(0.6),
  },
  postCardMeta: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  tagsTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1.5),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: theme.radius.full,
    marginBottom: hp(1),
  },
  tagShared: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  tagText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  tagTextShared: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  sharedHint: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(1),
  },
  friendsSection: {
    marginBottom: hp(3),
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  friendsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  friendItem: {
    alignItems: 'center',
    width: wp(20),
  },
  friendAvatar: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginBottom: hp(0.6),
  },
  friendAvatarFallback: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.6),
  },
  friendAvatarText: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  friendName: {
    fontSize: hp(1.3),
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  seeAllText: {
    fontSize: hp(1.4),
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  friendsModal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    maxHeight: hp(70),
    paddingVertical: hp(2),
  },
  friendsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingBottom: hp(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  friendsModalTitle: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSecondary,
  },
  friendRowAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    marginRight: wp(3),
  },
  friendRowAvatarFallback: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    marginRight: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendRowInfo: {
    flex: 1,
  },
  friendRowName: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  friendRowMeta: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
})
