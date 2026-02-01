import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    InteractionManager,
    Modal,
    Platform,
    TextInput,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'
import {
    useAcceptFriendRequest,
    useCancelFriendRequest,
    useFriendCount,
    useFriendshipStatus,
    useFriendsForProfile,
    useFriendsRealtime,
    useRemoveFriend,
    useSendFriendRequest,
} from '../../hooks/useFriends'
import { useMessageRequestStatus, useSendMessageRequest } from '../../hooks/useMessageRequests'
import { useCreateConversation } from '../../hooks/useMessages'
import { useSharedClasses } from '../../hooks/useClassMatching'
import { useCurrentUserProfile } from '../../hooks/useCurrentUserProfile'
import { useProfilePhotos, useUserOrganizations } from '../../hooks/useProfiles'
import { useUserPosts } from '../../hooks/useUserPosts'
import { useAuthStore } from '../../stores/authStore'
import { formatTimeAgo } from '../../utils/dateFormatters'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { useOrgModal } from '../../contexts/OrgModalContext'
import { getFriendlyErrorMessage } from '../../utils/userFacingErrors'
import { BoxSkeleton, CircleSkeleton, TextSkeleton } from '../SkeletonLoader'
import {
    ArrowLeft,
    Calendar,
    Check,
    Clock,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    School,
    UserPlus
} from '../Icons'
import { Ionicons } from '@expo/vector-icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

/**
 * Reusable content for the user profile modal
 * Displays hero carousel, bio, badges, interests, and recent posts
 */
const ProfileModalContent = ({
    activeProfile,
    setActiveProfile,
    scrollYRef,
    onClose,
    panResponder,
    isDragging,
}) => {
    const router = useRouter()
    const theme = useAppTheme()
    const scrollY = useRef(0)
    const scrollViewRef = useRef(null)
    
    // Deferred loading - wait for animation to complete before loading heavy data
    const [isReadyForHeavyLoad, setIsReadyForHeavyLoad] = useState(false)
    
    useEffect(() => {
        // Reset ready state when profile changes
        setIsReadyForHeavyLoad(false)
        
        // Defer heavy operations until after animations complete
        const task = InteractionManager.runAfterInteractions(() => {
            setIsReadyForHeavyLoad(true)
        })
        
        return () => task.cancel()
    }, [activeProfile?.id])

    const handleScroll = useCallback((event) => {
        const offsetY = event.nativeEvent.contentOffset.y
        scrollY.current = offsetY
        if (scrollYRef) {
            scrollYRef.current = offsetY
        }
    }, [scrollYRef])

    useEffect(() => {
        if (!activeProfile?.id) return
        scrollY.current = 0
        if (scrollYRef) {
            scrollYRef.current = 0
        }
        if (scrollViewRef.current?.scrollTo) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false })
        }
    }, [activeProfile?.id, scrollYRef])

    // Auth store - always needed
    const { user } = useAuthStore()
    const { openProfile } = useProfileModal()
    const { openOrg } = useOrgModal()
    
    // UI state
    const [showFriendsModal, setShowFriendsModal] = useState(false)
    const [friendsSearchQuery, setFriendsSearchQuery] = useState('')

    // DEFERRED HOOKS - only run after animation completes to prevent freeze
    const deferredProfileId = isReadyForHeavyLoad ? activeProfile?.id : null
    
    const { data: friendshipStatus, isLoading: statusLoading } = useFriendshipStatus(deferredProfileId)
    const { data: friendCount = 0, isLoading: friendCountLoading } = useFriendCount(deferredProfileId)
    const {
        data: friends = [],
        isLoading: friendsLoading,
        isError: friendsError,
        refetch: refetchFriends,
    } = useFriendsForProfile(deferredProfileId)
    useFriendsRealtime(deferredProfileId)
    const { data: messageRequestStatus } = useMessageRequestStatus(deferredProfileId)
    const sendMessageRequest = useSendMessageRequest()
    const sendRequest = useSendFriendRequest()
    const acceptRequest = useAcceptFriendRequest()
    const cancelRequest = useCancelFriendRequest()
    const removeFriend = useRemoveFriend()
    const createConversation = useCreateConversation()
    const { data: recentPosts = [], isLoading: recentPostsLoading } = useUserPosts(deferredProfileId, 3)
    const { data: currentUserProfile } = useCurrentUserProfile()
    const currentUserInterests = useMemo(() => new Set(currentUserProfile?.interests || []), [currentUserProfile])
    const {
        data: sharedClasses = [],
        isLoading: sharedClassesLoading,
        isError: sharedClassesError,
    } = useSharedClasses(deferredProfileId)
    const {
        data: userOrganizations = [],
        isLoading: organizationsLoading,
    } = useUserOrganizations(deferredProfileId)

    // Fetch profile photos - also deferred
    const { data: galleryPhotos = [] } = useProfilePhotos(deferredProfileId)

    // Combine avatar with gallery photos
    const profilePhotos = useMemo(() => {
        if (!activeProfile) return []
        const basePhotos = activeProfile.avatar_url ? [activeProfile.avatar_url] : (activeProfile.photoUrl ? [activeProfile.photoUrl] : [])
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
        return allPhotos.length > 0 ? allPhotos : basePhotos
    }, [activeProfile, galleryPhotos])

    if (!activeProfile) return null

    const handleClose = onClose || (() => setActiveProfile?.(null))

    const handleFriendAction = async () => {
        if (!user) return
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
                        {
                            text: 'Yes, Cancel', style: 'destructive', onPress: () => {
                                cancelRequest.mutate({ requestId: friendshipStatus.requestId })
                            }
                        },
                    ]
                )
                break
            case 'request_received':
                try {
                    await acceptRequest.mutateAsync({
                        requestId: friendshipStatus.requestId,
                        senderId: activeProfile.id,
                    })

                    // Open chat and prompt to wave
                    const conversationId = await createConversation.mutateAsync({
                        otherUserId: activeProfile.id,
                    })

                    handleClose()

                    // Wait for modal to close for smooth transition
                    await new Promise(resolve => setTimeout(resolve, 300))

                    router.push({
                        pathname: '/chat',
                        params: {
                            conversationId,
                            userId: activeProfile.id,
                            userName: activeProfile.full_name || activeProfile.name,
                            showWavePrompt: 'true',
                        },
                    })
                } catch (error) {
                    console.error('Failed to accept friend request:', error)
                    Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to accept friend request'))
                }
                break
            case 'friends':
                Alert.alert(
                    'Remove Friend?',
                    `Are you sure you want to remove ${activeProfile.full_name || activeProfile.name} as a friend?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Remove', style: 'destructive', onPress: () => {
                                removeFriend.mutate({ friendId: activeProfile.id })
                            }
                        },
                    ]
                )
                break
        }
    }

    const handleMessage = async () => {
        if (!user?.id) return

        // If not friends, check message request status
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
            handleClose()

            // Wait for modal to fully close
            await new Promise(resolve => setTimeout(resolve, 300))

            const conversationId = await createConversation.mutateAsync({
                otherUserId: activeProfile.id,
            })

            router.push({
                pathname: '/chat',
                params: {
                    conversationId,
                    userId: activeProfile.id,
                    userName: activeProfile.full_name || activeProfile.name,
                },
            })
        } catch (error) {
            console.error('Error creating conversation:', error)
            Alert.alert('Error', 'Failed to start conversation. Please try again.')
        }
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${activeProfile.full_name || activeProfile.name} on Bonded.`,
            })
        } catch (error) {
            console.warn('Share failed:', error)
        }
    }

    const openProfileActions = () => {
        const options = ['Share', 'Block', 'Cancel']
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 2,
                    destructiveButtonIndex: 1,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) handleShare()
                    if (buttonIndex === 1) Alert.alert('Blocked', 'Block is coming soon.')
                }
            )
            return
        }
        Alert.alert('Profile options', undefined, [
            { text: 'Share', onPress: handleShare },
            { text: 'Block', style: 'destructive', onPress: () => Alert.alert('Blocked', 'Block is coming soon.') },
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
        handleClose()
        router.push({
            pathname: '/forum',
            params: { forumId: post.forum_id, postId: post.id },
        })
    }

    useEffect(() => {
        if (showFriendsModal) {
            refetchFriends()
        }
    }, [refetchFriends, showFriendsModal])
    useEffect(() => {
        if (!showFriendsModal) {
            setFriendsSearchQuery('')
        }
    }, [showFriendsModal])

    const previewFriends = friends.slice(0, 20)
    const filteredFriends = useMemo(() => {
        const query = friendsSearchQuery.trim().toLowerCase()
        if (!query) return friends
        return friends.filter((friend) => {
            const name = `${friend.full_name || ''} ${friend.username || ''}`.toLowerCase()
            return name.includes(query)
        })
    }, [friends, friendsSearchQuery])
    const isOwnProfile = activeProfile?.id && user?.id && activeProfile.id === user.id
    const friendsVisibility = activeProfile?.friends_visibility || 'school'
    const viewerUniversityId = currentUserProfile?.university_id
    const targetUniversityId = activeProfile?.university_id
    const friendsEmptyMessage = useMemo(() => {
        if (isOwnProfile) return 'No friends to show'
        if (friendsVisibility === 'private') return 'Friends are private'
        if (friendsVisibility === 'school' && viewerUniversityId && targetUniversityId && viewerUniversityId !== targetUniversityId) {
            return 'Friends visible to same school only'
        }
        return 'No friends to show'
    }, [friendsVisibility, isOwnProfile, targetUniversityId, viewerUniversityId])

    return (
        <View style={styles.container} {...panResponder?.panHandlers}>
            <StatusBar barStyle="light-content" />

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
                ref={scrollViewRef}
                style={styles.fullScrollView}
                contentContainerStyle={styles.fullScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                scrollEnabled={!isDragging}
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
                            source={{ uri: profilePhotos[0] }}
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
                    <Text style={styles.name}>{activeProfile.full_name || activeProfile.name}</Text>
                    <Text style={styles.handle}>
                        @{activeProfile.username || (activeProfile.full_name || activeProfile.name).toLowerCase().replace(/\s+/g, '').slice(0, 8)}
                    </Text>
                    <Text style={styles.bio}>{activeProfile.yearbook_quote || activeProfile.quote || activeProfile.bio}</Text>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                buttonConfig.style === 'friends' && styles.actionButtonFriends,
                                buttonConfig.style === 'pending' && styles.actionButtonPending,
                                buttonConfig.style === 'accept' && styles.actionButtonAccept,
                                buttonConfig.style === 'secondary' && styles.actionButtonSecondary,
                            ]}
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
                            onPress={handleMessage}
                        >
                            <MessageCircle size={hp(2)} color={theme.colors.white} />
                            <Text style={styles.actionButtonPrimaryText}>Message</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metaRow}>
                        {activeProfile.major && (
                            <View style={styles.metaPill}>
                                <School size={hp(1.6)} color={theme.colors.textSecondary} />
                                <Text style={styles.metaPillText}>{activeProfile.major}</Text>
                            </View>
                        )}
                        {(activeProfile.year || activeProfile.graduation_year) && (
                            <View style={styles.metaPill}>
                                <Calendar size={hp(1.6)} color={theme.colors.textSecondary} />
                                <Text style={styles.metaPillText}>Class of {activeProfile.year || activeProfile.graduation_year}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.metaPill} onPress={() => setShowFriendsModal(true)}>
                            <UserPlus size={hp(1.6)} color={theme.colors.textSecondary} />
                            <Text style={styles.metaPillText}>
                                {friendCountLoading ? '...' : `${friendCount} friends`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.locationRow}>
                        <MapPin size={hp(1.8)} color={theme.colors.textSecondary} />
                        <Text style={styles.locationText}>
                            {activeProfile.location || activeProfile.university?.name || 'University of Rhode Island'}
                        </Text>
                    </View>

                    {activeProfile.interests && activeProfile.interests.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={styles.tagsTitle}>Interests</Text>
                            <View style={styles.tagsRow}>
                                {activeProfile.interests.slice(0, 8).map((interest, idx) => {
                                    const isShared = currentUserInterests.has(interest)
                                    return (
                                        <View key={idx} style={[styles.tag, isShared && styles.tagShared]}>
                                            {isShared && (
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={hp(1.4)}
                                                    color={theme.colors.bondedPurple}
                                                    style={{ marginRight: wp(1) }}
                                                />
                                            )}
                                            <Text style={[styles.tagText, isShared && styles.tagTextShared]}>{interest}</Text>
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
                            <View style={styles.tagsRow}>
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <BoxSkeleton
                                        key={`shared-class-skeleton-${index}`}
                                        width={wp(22)}
                                        height={hp(3)}
                                        radius={20}
                                        style={styles.tagSkeleton}
                                    />
                                ))}
                            </View>
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

                    {userOrganizations.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={styles.tagsTitle}>Organizations</Text>
                            {organizationsLoading ? (
                                <View style={styles.tagsRow}>
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <BoxSkeleton
                                            key={`org-skeleton-${index}`}
                                            width={wp(22)}
                                            height={hp(3)}
                                            radius={20}
                                            style={styles.tagSkeleton}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.tagsRow}>
                                    {userOrganizations.slice(0, 6).map((org) => (
                                        <TouchableOpacity
                                            key={org.id}
                                            style={styles.tag}
                                            onPress={() => {
                                                // Open org modal on top of profile modal (don't close profile)
                                                openOrg(org.id)
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tagText}>{org.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {friendsLoading ? (
                        <View style={styles.friendsSection}>
                            <View style={styles.friendsHeader}>
                                <Text style={styles.tagsTitle}>Friends</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsRowScroll}>
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <View key={`friend-skeleton-${index}`} style={styles.friendItem}>
                                        <CircleSkeleton size={hp(6)} />
                                        <TextSkeleton
                                            width={wp(14)}
                                            height={hp(1.2)}
                                            style={styles.friendNameSkeleton}
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    ) : friends.length > 0 ? (
                        <View style={styles.friendsSection}>
                            <View style={styles.friendsHeader}>
                                <Text style={styles.tagsTitle}>Friends</Text>
                                {friends.length > previewFriends.length && (
                                    <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                                        <Text style={styles.seeAllText}>See all</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsRowScroll}>
                                {previewFriends.map((friend) => {
                                    const name = friend.full_name || friend.username || 'User'
                                    return (
                                    <TouchableOpacity
                                        key={friend.id}
                                        style={styles.friendItem}
                                        onPress={() => {
                                            setShowFriendsModal(false)
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
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.friendsSection}>
                            <Text style={styles.sharedHint}>
                                {friendsError ? 'Unable to load friends' : friendsEmptyMessage}
                            </Text>
                        </View>
                    )}

                    <View style={styles.postsSection}>
                        <Text style={styles.postsTitle}>Recent forum posts</Text>
                        {recentPostsLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                        ) : recentPosts.length === 0 ? (
                            <Text style={styles.postsEmptyText}>No recent posts yet.</Text>
                        ) : (
                            recentPosts.map((post) => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={styles.postCard}
                                    onPress={() => handleOpenPost(post)}
                                >
                                    {post.media && post.media.length > 0 && (
                                        <Image
                                            source={{ uri: post.media[0] }}
                                            style={styles.postCardImage}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={styles.postCardContent}>
                                        <Text style={styles.postCardTitle} numberOfLines={2}>
                                            {post.title || post.body || 'Untitled post'}
                                        </Text>
                                        <Text style={styles.postCardMeta} numberOfLines={1}>
                                            {(post.forum?.name || 'Forum')} • {formatTimeAgo(post.created_at)}
                                        </Text>
                                    </View>
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
                        {friendsLoading ? (
                            <View style={styles.friendsModalLoading}>
                                <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                            </View>
                        ) : friends.length === 0 ? (
                            <View style={styles.friendsModalEmpty}>
                                <Text style={styles.sharedHint}>
                                    {friendsError ? 'Unable to load friends' : friendsEmptyMessage}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredFriends}
                                keyExtractor={(item) => item.id}
                                ListHeaderComponent={
                                    <View style={styles.friendsSearchWrapper}>
                                        <Ionicons
                                            name="search"
                                            size={hp(2)}
                                            color={theme.colors.textSecondary}
                                            style={styles.friendsSearchIcon}
                                        />
                                        <TextInput
                                            style={styles.friendsSearchInput}
                                            placeholder="Search friends"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={friendsSearchQuery}
                                            onChangeText={setFriendsSearchQuery}
                                        />
                                        {friendsSearchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => setFriendsSearchQuery('')}>
                                                <Ionicons name="close-circle" size={hp(2)} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                }
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
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

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
        ...StyleSheet.absoluteFillObject,
    },
    contentSection: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -hp(3),
        paddingHorizontal: wp(5),
        paddingTop: hp(3),
        paddingBottom: hp(10),
    },
    name: {
        fontSize: hp(3.2),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: hp(0.5),
    },
    handle: {
        fontSize: hp(1.8),
        color: theme.colors.textSecondary,
        marginBottom: hp(2),
    },
    bio: {
        fontSize: hp(1.7),
        color: theme.colors.textPrimary,
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
        borderRadius: 12,
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
        borderRadius: 12,
        backgroundColor: theme.colors.bondedPurple,
        gap: wp(2),
    },
    actionButtonPrimaryText: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.white,
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
        borderRadius: 20,
        gap: wp(1.5),
    },
    metaPillText: {
        fontSize: hp(1.4),
        color: theme.colors.textSecondary,
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
    },
    tagsSection: {
        marginBottom: hp(3),
    },
    tagsTitle: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: hp(1.5),
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(2),
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
    friendNameSkeleton: {
        marginTop: hp(0.6),
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
    friendsRowScroll: {
        paddingHorizontal: wp(1),
        gap: wp(3),
    },
    friendsSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginHorizontal: wp(4),
        marginBottom: hp(1),
        marginTop: hp(1.5),
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.1),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.colors.borderSecondary,
    },
    friendsSearchIcon: {
        marginRight: wp(1),
    },
    friendsSearchInput: {
        flex: 1,
        fontSize: hp(1.6),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
    },
    friendsModalLoading: {
        paddingVertical: hp(3),
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendsModalEmpty: {
        paddingVertical: hp(3),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp(4),
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
    tag: {
        backgroundColor: theme.colors.backgroundSecondary,
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.6),
        borderRadius: 20,
    },
    tagShared: {
        backgroundColor: theme.colors.bondedPurple + '15',
        borderWidth: 1,
        borderColor: theme.colors.bondedPurple + '60',
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagText: {
        fontSize: hp(1.4),
        color: theme.colors.textPrimary,
    },
    tagTextShared: {
        color: theme.colors.bondedPurple,
        fontWeight: '600',
    },
    tagSkeleton: {
        marginBottom: hp(0.6),
    },
    sharedHint: {
        marginTop: hp(1),
        fontSize: hp(1.3),
        color: theme.colors.textSecondary,
    },
    postsSection: {
        marginBottom: hp(3),
    },
    postsTitle: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: hp(1.5),
    },
    postCard: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: hp(1.2),
    },
    postCardImage: {
        width: '100%',
        height: hp(20),
        backgroundColor: theme.colors.border,
    },
    postCardContent: {
        padding: wp(3),
    },
    postCardTitle: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: hp(0.5),
    },
    postCardMeta: {
        fontSize: hp(1.3),
        color: theme.colors.textSecondary,
    },
    postsEmptyText: {
        fontSize: hp(1.5),
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: hp(2),
    },
})

export default ProfileModalContent
