import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import BottomNav from '../components/BottomNav'
import AnonymousMessageButton from '../components/Forum/AnonymousMessageButton'
import CommentsModal from '../components/Forum/CommentsModal'
import ForumPostDetail from '../components/Forum/ForumPostDetail'
import PollRenderer from '../components/Forum/PollRenderer'
// import PostTags from '../components/Forum/PostTags' // Removed for V1 - add back later
// import RepostModal from '../components/Forum/RepostModal' // Removed for V1 - will add back later
import ForumSelectorModal from '../components/ForumSelectorModal'
import ForumSwitcher from '../components/ForumSwitcher'
import {
    Add,
    ArrowDownCircle,
    ArrowUpCircle,
    Check,
    ChevronDown,
    ImageIcon,
    MessageCircle,
    MoreHorizontal,
    Person,
    // Repeat, // Removed for V1
    Share2,
    // Video, // Removed for V1
    X
} from '../components/Icons'
import ShareModal from '../components/ShareModal'
import { ForumFeedSkeleton } from '../components/SkeletonLoader'
import StoryFlow from '../components/Stories/StoryFlow'
import StoryViewer from '../components/Stories/StoryViewer'
import { useClubsContext } from '../contexts/ClubsContext'
import { useOrgModal } from '../contexts/OrgModalContext'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { useStoriesContext } from '../contexts/StoriesContext'
import { useUnifiedForum } from '../contexts/UnifiedForumContext'
import { hp, wp } from '../helpers/common'
import { resolveMediaUrls, uploadImageToBondedMedia } from '../helpers/mediaStorage'
import { useComments } from '../hooks/useComments'
import { useCreatePost } from '../hooks/useCreatePost'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useNotificationCount } from '../hooks/useNotificationCount'
import { usePost, usePosts } from '../hooks/usePosts'
import { useUniversities } from '../hooks/useUniversities'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isSuperAdminEmail } from '../utils/admin'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'
import { useAppTheme } from './theme'


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const DISMISS_THRESHOLD = 150

// Redundant ProfileModalWrapper removed

// Instagram-style Comments Bottom Sheet
const CommentsSheet = ({ post, onClose, theme, comments, commentSort, setCommentSort, handleCommentVote, userVotes, handleAddComment }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const [isVisible, setIsVisible] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const insets = useSafeAreaInsets()
  const onCloseRef = useRef(onClose)

  // Keep onClose ref updated
  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (post) {
      setIsVisible(true)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    }
  }, [post])

  const handleClose = useCallback(() => {
    Keyboard.dismiss()
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false)
      if (onCloseRef.current) onCloseRef.current()
    })
  }, [translateY])

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        const isDownward = gestureState.dy > 5
        return isVertical && isDownward
      },
      onPanResponderGrant: () => {
        // Prepare for gesture
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          Keyboard.dismiss()
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false)
            if (onCloseRef.current) onCloseRef.current()
          })
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start()
        }
      },
    })
    , [translateY])

  const submitComment = async () => {
    if (!newComment.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const success = await handleAddComment(post.id, newComment.trim(), isAnon)
      if (success) {
        setNewComment('')
      }
    } catch (e) {
      Logger.error(e, 'Failed to submit comment');
    }
    setIsSubmitting(false)
  }

  if (!post && !isVisible) return null

  const postComments = comments[post?.id] || []
  let sortedComments = [...postComments]
  if (commentSort === 'new') {
    sortedComments.sort((a, b) => b.timeAgo?.localeCompare(a.timeAgo) || 0)
  } else {
    sortedComments.sort((a, b) => {
      const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
      const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
      return scoreB - scoreA
    })
  }

  const sheetStyles = createCommentsSheetStyles(theme)

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0.3, 0],
    extrapolate: 'clamp',
  })

  const postPreviewOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT / 2, SCREEN_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  })

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={sheetStyles.container}>
        {/* Post preview in background */}
        {post && (
          <Animated.View
            style={[
              sheetStyles.postPreview,
              { opacity: postPreviewOpacity }
            ]}
          >
            <View style={sheetStyles.postPreviewContent}>
              <View style={sheetStyles.postPreviewHeader}>
                <View style={sheetStyles.postPreviewAvatar}>
                  <Text style={sheetStyles.postPreviewAvatarText}>
                    {post.isAnon ? '?' : post.author?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={sheetStyles.postPreviewAuthorInfo}>
                  <Text style={sheetStyles.postPreviewAuthorName}>
                    {post.isAnon ? 'Anonymous' : post.author}
                  </Text>
                  <Text style={sheetStyles.postPreviewMeta}>
                    {post.forum} • {post.timeAgo}
                  </Text>
                </View>
              </View>
              {post.title && (
                <Text style={sheetStyles.postPreviewTitle} numberOfLines={2}>
                  {post.title}
                </Text>
              )}
              <Text style={sheetStyles.postPreviewBody} numberOfLines={3}>
                {post.body}
              </Text>
              {post.media && post.media.length > 0 && (
                <Image
                  source={{ uri: post.media[0].uri }}
                  style={sheetStyles.postPreviewImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </Animated.View>
        )}

        {/* Tap to dismiss backdrop */}
        <Animated.View
          style={[
            sheetStyles.backdrop,
            { opacity: backdropOpacity }
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Comments sheet */}
        <Animated.View
          style={[
            sheetStyles.sheet,
            { transform: [{ translateY }] }
          ]}
        >
          {/* Drag handle */}
          <View style={sheetStyles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={sheetStyles.dragHandle} />
          </View>

          {/* Header */}
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={handleClose} style={sheetStyles.sendButton}>
              <Ionicons name="paper-plane-outline" size={hp(2.4)} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            data={sortedComments}
            keyExtractor={(item) => item.id}
            style={sheetStyles.commentsList}
            contentContainerStyle={sheetStyles.commentsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={sheetStyles.emptyState}>
                <Text style={sheetStyles.emptyText}>No comments yet</Text>
                <Text style={sheetStyles.emptySubtext}>Be the first to comment!</Text>
              </View>
            }
            renderItem={({ item: comment }) => (
              <View style={sheetStyles.commentItem}>
                <View style={sheetStyles.commentAvatar}>
                  <Text style={sheetStyles.commentAvatarText}>
                    {comment.isAnon ? '?' : comment.author?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={sheetStyles.commentContent}>
                  <View style={sheetStyles.commentHeader}>
                    <Text style={sheetStyles.commentAuthor}>
                      {comment.isAnon ? 'Anonymous' : comment.author}
                    </Text>
                    <Text style={sheetStyles.commentTime}>{comment.timeAgo}</Text>
                  </View>
                  <Text style={sheetStyles.commentText}>{comment.body}</Text>
                  <View style={sheetStyles.commentActions}>
                    <TouchableOpacity
                      style={sheetStyles.likeButton}
                      onPress={() => handleCommentVote(comment.id, null, 'up')}
                    >
                      {userVotes[comment.id] === 'up' ? (
                        <Ionicons name="heart" size={hp(1.8)} color={theme.colors.error} />
                      ) : (
                        <Ionicons name="heart-outline" size={hp(1.8)} color={theme.colors.textSecondary} />
                      )}
                      {(comment.upvotes - (comment.downvotes || 0)) > 0 && (
                        <Text style={[
                          sheetStyles.likeCount,
                          userVotes[comment.id] === 'up' && { color: theme.colors.error }
                        ]}>
                          {comment.upvotes - (comment.downvotes || 0)}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={sheetStyles.replyButton}>
                      <Text style={sheetStyles.replyText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Emoji bar */}
          <View style={sheetStyles.emojiBar}>
            {['😭', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji, idx) => (
              <TouchableOpacity
                key={idx}
                style={sheetStyles.emojiButton}
                onPress={() => setNewComment(prev => prev + emoji)}
              >
                <Text style={sheetStyles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <View style={[sheetStyles.inputContainer, { paddingBottom: insets.bottom || hp(2) }]}>
              <View style={sheetStyles.inputAvatar}>
                <Ionicons name="person" size={hp(2)} color={theme.colors.textSecondary} />
              </View>
              <TextInput
                style={sheetStyles.input}
                placeholder={`Add a comment${post?.author ? ` for ${post.isAnon ? 'Anonymous' : post.author}` : ''}...`}
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={sheetStyles.gifButton}
                onPress={() => setIsAnon(!isAnon)}
              >
                <Text style={[sheetStyles.gifText, isAnon && { color: theme.colors.bondedPurple }]}>
                  {isAnon ? 'ANON' : 'GIF'}
                </Text>
              </TouchableOpacity>
              {newComment.trim().length > 0 && (
                <TouchableOpacity
                  style={sheetStyles.postButton}
                  onPress={submitComment}
                  disabled={isSubmitting}
                >
                  <Text style={sheetStyles.postButtonText}>
                    {isSubmitting ? '...' : 'Post'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const createCommentsSheetStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: hp(2),
    borderTopRightRadius: hp(2),
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
  },
  dragHandle: {
    width: wp(10),
    height: hp(0.5),
    backgroundColor: theme.colors.border,
    borderRadius: hp(0.25),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: hp(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  sendButton: {
    position: 'absolute',
    right: wp(5),
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(6),
  },
  emptyText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  emptySubtext: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.5),
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: hp(1.2),
  },
  commentAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  commentAvatarText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.3),
  },
  commentAuthor: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    marginRight: wp(2),
  },
  commentTime: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  commentText: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.1),
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.8),
    gap: wp(4),
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  likeCount: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  replyButton: {},
  replyText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  emojiButton: {
    padding: wp(1),
  },
  emoji: {
    fontSize: hp(2.6),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  inputAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  input: {
    flex: 1,
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    maxHeight: hp(10),
    paddingVertical: hp(1),
  },
  gifButton: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: hp(0.5),
    marginLeft: wp(2),
  },
  gifText: {
    fontSize: hp(1.4),
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  postButton: {
    marginLeft: wp(2),
  },
  postButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
  },
  postPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  postPreviewContent: {
    backgroundColor: theme.colors.background,
    borderRadius: hp(2),
    padding: wp(4),
    maxWidth: wp(90),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  postPreviewAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  postPreviewAvatarText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  postPreviewAuthorInfo: {
    flex: 1,
  },
  postPreviewAuthorName: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  postPreviewMeta: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.2),
  },
  postPreviewTitle: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  postPreviewBody: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.2),
    marginBottom: hp(1.5),
  },
  postPreviewImage: {
    width: '100%',
    height: hp(20),
    borderRadius: hp(1),
    marginTop: hp(1),
  },
})

// All mock data removed - using real Supabase data
// Comments: Loaded from Supabase forum_comments table (TODO: create useComments hook)
// Posts: usePosts hook
// Forums: useForums hook
// Stories: useStories hook

export default function Forum() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const log = (...args) => {
    if (__DEV__) console.log(...args)
  }
  const { data: notificationCount = 0 } = useNotificationCount()
  const notificationLabel = notificationCount > 99 ? '99+' : `${notificationCount}`
  const router = useRouter()
  const params = useLocalSearchParams()
  const requestedForumId = Array.isArray(params.forumId) ? params.forumId[0] : params.forumId
  const requestedPostId = Array.isArray(params.postId) ? params.postId[0] : params.postId
  const requestedCreatePost = Array.isArray(params.createPost) ? params.createPost[0] : params.createPost
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  // Posts are now fetched from usePosts hook
  const [activePost, setActivePost] = useState(null)
  const { openProfile } = useProfileModal()
  const { openOrg } = useOrgModal()
  const [activeAuthorPost, setActiveAuthorPost] = useState(null)
  const [postOptionsPost, setPostOptionsPost] = useState(null)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isRepostModalVisible, setIsRepostModalVisible] = useState(false)
  const [repostPost, setRepostPost] = useState(null)
  const [isCampusSelectorVisible, setIsCampusSelectorVisible] = useState(false)
  const [draftPoll, setDraftPoll] = useState(null)
  const [showPollBuilder, setShowPollBuilder] = useState(false)
  const [currentSchool, setCurrentSchool] = useState(params.schoolName || 'University of Rhode Island')
  const [tagFilter, setTagFilter] = useState(null) // Filter by specific tag
  const [isForumSelectorVisible, setIsForumSelectorVisible] = useState(false)
  const [commentSort, setCommentSort] = useState('best') // 'best', 'new', 'old'
  const [polls, setPolls] = useState({}) // { postId: poll }
  const [pollVotes, setPollVotes] = useState({}) // { pollId: { userId: optionIndex } }
  const [pollResults, setPollResults] = useState({}) // { pollId: { totalVotes, voteCounts } }

  // Create post draft state
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftIsAnon, setDraftIsAnon] = useState(true)
  const [draftMedia, setDraftMedia] = useState([])
  const [showPostAsModal, setShowPostAsModal] = useState(false)

  // Story state
  const [isStoryFlowVisible, setIsStoryFlowVisible] = useState(false)
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0)
  const [viewerStories, setViewerStories] = useState([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareContent, setShareContent] = useState(null)
  const [commentsModalPost, setCommentsModalPost] = useState(null) // For Instagram-style comments modal
  const openedPostRef = useRef(null) // Track which post was opened via deep link to avoid re-opening
  const openedCreateRef = useRef(false)
  const [selectedUniversityId, setSelectedUniversityId] = useState(null)

  const { getForumStories } = useStoriesContext()
  const { user } = useAuthStore()
  const { isUserAdmin } = useClubsContext()
  const isSuperAdmin = isSuperAdminEmail(user?.email)

  // Define isAdmin for the "Post As" logic
  const isAdmin = useMemo(() => {
    if (isSuperAdmin) return true
    if (currentForum?.type === 'org' && currentForum?.org_id) {
      return isUserAdmin(currentForum.org_id)
    }
    return false
  }, [isSuperAdmin, currentForum, isUserAdmin])
  const { data: userProfile } = useCurrentUserProfile() // For onboarding check
  const currentUserInterests = useMemo(() => new Set(userProfile?.interests || []), [userProfile])
  const headerAvatarUrl = userProfile?.avatarUrl || userProfile?.avatar_url || null
  const headerAvatarInitial = (userProfile?.full_name || userProfile?.name || user?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  // Fetch universities (forums are now handled by useUnifiedForum)
  const { data: universities = [], isLoading: universitiesLoading } = useUniversities()
  const { forums, currentForum, switchToForum, loading: forumsLoading } = useUnifiedForum()

  const selectedUniversity = useMemo(
    () => universities.find((u) => u.id === selectedUniversityId) || null,
    [universities, selectedUniversityId]
  )

  const visibleForums = useMemo(() => {
    if (!isSuperAdmin || !selectedUniversityId) return forums
    return forums.filter((forum) => forum.university_id === selectedUniversityId)
  }, [forums, isSuperAdmin, selectedUniversityId])

  // Handle forum selection from URL params
  React.useEffect(() => {
    if (requestedForumId && forums.length > 0) {
      const forum = forums.find(f => f.id === requestedForumId)
      if (forum && (!currentForum || currentForum.id !== requestedForumId)) {
        switchToForum(requestedForumId)
      }
    }
  }, [requestedForumId, forums, currentForum, switchToForum])

  React.useEffect(() => {
    const shouldOpenCreate = requestedCreatePost === '1' || requestedCreatePost === 'true'
    if (!shouldOpenCreate || openedCreateRef.current) return
    if (requestedForumId && forums.length === 0) return
    if (requestedForumId && currentForum?.id !== requestedForumId) return

    openedCreateRef.current = true
    setIsCreateModalVisible(true)
  }, [requestedCreatePost, requestedForumId, forums.length, currentForum?.id])

  // Also ensure forum is set if it becomes null (safety check)
  // Use ref to avoid infinite loop
  const currentForumRef = React.useRef(currentForum)
  currentForumRef.current = currentForum

  React.useEffect(() => {
    if (visibleForums.length > 0 && currentForumRef.current === null) {
      const mainForum = visibleForums.find(f => f.type === 'campus') || visibleForums[0]
      if (mainForum) {
        log('Re-setting forum (was null):', mainForum.name, mainForum.id)
        switchToForum(mainForum.id)
      }
    }
  }, [visibleForums])

  React.useEffect(() => {
    if (!isSuperAdmin || universities.length === 0 || selectedUniversityId) return
    const fallbackUniversityId = currentForumRef.current?.universityId || universities[0]?.id || null
    if (fallbackUniversityId) {
      setSelectedUniversityId(fallbackUniversityId)
    }
  }, [isSuperAdmin, universities, selectedUniversityId])

  React.useEffect(() => {
    if (!isSuperAdmin) return
    if (!selectedUniversityId) return
    const mainForum = visibleForums.find(f => f.type === 'campus') || visibleForums[0] || null
    const currentId = currentForumRef.current?.id
    if (mainForum && mainForum.id !== currentId) {
      switchToForum(mainForum.id)
    }
    // Note: We can't set forum to null with switchToForum, so we skip that logic
  }, [isSuperAdmin, selectedUniversityId, visibleForums])

  // Fetch posts for current forum with pagination
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePosts(currentForum?.id, { tag: null }) // Tag filtering disabled for V1

  const { data: requestedPostRaw } = usePost(requestedPostId)

  const {
    data: activePostComments = [],
    refetch: refetchComments,
  } = useComments(activePost?.id)

  // Comments for the Instagram-style modal
  const {
    data: modalPostComments = [],
    refetch: refetchModalComments,
  } = useComments(commentsModalPost?.id)

  // Flatten paginated data into a single array
  const posts = useMemo(() => {
    if (!postsData?.pages) return []
    return postsData.pages.flatMap((page) => page.posts || [])
  }, [postsData])

  const fetchPostUserVotes = useCallback(async (postIds) => {
    if (!user?.id) return
    if (!postIds?.length) {
      setPostUserVotes({})
      return
    }

    const { data, error } = await supabase
      .from('post_reactions')
      .select('post_id, reaction_type')
      .in('post_id', postIds)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching post votes:', error)
      return
    }

    const nextVotes = {}
    data?.forEach((row) => {
      nextVotes[row.post_id] = row.reaction_type
    })
    setPostUserVotes(nextVotes)
  }, [user?.id])

  React.useEffect(() => {
    const postIds = [...new Set([
      ...posts.map((post) => post.id).filter(Boolean),
      activePost?.id,
    ].filter(Boolean))]
    fetchPostUserVotes(postIds)
  }, [posts, activePost?.id, fetchPostUserVotes])

  const loadMorePosts = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  React.useEffect(() => {
    if (!requestedPostId) return
    if (openedPostRef.current === requestedPostId) return
    const match = posts.find((post) => post.id === requestedPostId)
    if (match) {
      setActivePost(match)
      openedPostRef.current = requestedPostId
      return
    }
    if (!requestedPostRaw) return
    let cancelled = false
    const hydratePost = async () => {
      const resolvedMedia = await resolveMediaUrls(requestedPostRaw.media_urls || [])

      // Determine author info (org takes precedence over user)
      const isOrgPost = !!requestedPostRaw.org_id && !!requestedPostRaw.organization
      const authorLabel = isOrgPost
        ? requestedPostRaw.organization.name
        : requestedPostRaw.is_anonymous
          ? 'Anon'
          : (requestedPostRaw.author?.username?.trim()
              ? requestedPostRaw.author.username
              : (requestedPostRaw.author?.email ? requestedPostRaw.author.email.split('@')[0] : 'Anonymous'))
      const authorAvatar = isOrgPost
        ? requestedPostRaw.organization.logo_url
        : requestedPostRaw.author?.avatar_url || null

      const mapped = {
        id: requestedPostRaw.id,
        author: authorLabel,
        isAnon: requestedPostRaw.is_anonymous || false,
        isOrgPost,
        orgId: requestedPostRaw.org_id || null,
        title: requestedPostRaw.title,
        body: requestedPostRaw.body,
        forum: requestedPostRaw.forum?.name || 'Unknown',
        forumId: requestedPostRaw.forum_id,
        upvotes: requestedPostRaw.upvotes_count || 0,
        downvotes: requestedPostRaw.downvotes_count || 0,
        score: (requestedPostRaw.upvotes_count || 0) - (requestedPostRaw.downvotes_count || 0),
        commentsCount: requestedPostRaw.comments_count || 0,
        repostsCount: requestedPostRaw.reposts_count || 0,
        timeAgo: getTimeAgo(requestedPostRaw.created_at),
        tags: Array.isArray(requestedPostRaw.tags) ? requestedPostRaw.tags : [],
        media: resolvedMedia.map((url) => ({ uri: url, type: 'image' })),
        createdAt: requestedPostRaw.created_at,
        userId: requestedPostRaw.user_id,
        authorAvatar,
        poll: requestedPostRaw.poll || null,
      }
      if (!cancelled) {
        setActivePost(mapped)
        openedPostRef.current = requestedPostId
      }
    }
    hydratePost()
    return () => {
      cancelled = true
    }
  }, [requestedPostId, posts, requestedPostRaw])

  // Create post mutation
  const createPostMutation = useCreatePost()

  const currentForumId = currentForum?.id || null



  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      if (!user?.id) {
        throw new Error('You must be logged in to delete posts')
      }

      log('🗑️ Attempting to delete post:', postId, 'by user:', user.id)

      // Try soft delete first (set deleted_at timestamp)
      const { data: softDeleteData, error: softDeleteError } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', user.id) // Ensure user owns the post
        .select('id, deleted_at')

      if (softDeleteError) {
        console.error('❌ Soft delete error:', softDeleteError)
        console.error('Error details:', {
          code: softDeleteError.code,
          message: softDeleteError.message,
          details: softDeleteError.details,
          hint: softDeleteError.hint,
        })
      }

      // Check if update succeeded (data exists and no error)
      if (softDeleteData && softDeleteData.length > 0 && !softDeleteError) {
        log('✅ Post soft deleted successfully:', postId, softDeleteData[0])
        return { id: postId, deleted: true }
      }

      // If no data returned and no error, RLS likely blocked it
      if (!softDeleteData && !softDeleteError) {
        console.warn('⚠️ Soft delete returned no data (RLS may have blocked it)')
      }

      // If soft delete failed, try hard delete as fallback
      log('⚠️ Soft delete failed, attempting hard delete...')
      const { data: hardDeleteData, error: hardDeleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()

      if (hardDeleteError) {
        console.error('❌ Hard delete error:', hardDeleteError)
        console.error('Error details:', {
          code: hardDeleteError.code,
          message: hardDeleteError.message,
          details: hardDeleteError.details,
          hint: hardDeleteError.hint,
        })

        // Provide more helpful error message
        let errorMessage = 'Failed to delete post. '
        if (hardDeleteError.code === '42501') {
          errorMessage += 'You do not have permission to delete this post.'
        } else if (hardDeleteError.code === 'PGRST301') {
          errorMessage += 'Post not found or you are not the owner.'
        } else {
          errorMessage += hardDeleteError.message || 'Please try again.'
        }
        throw new Error(errorMessage)
      }

      if (hardDeleteData || !hardDeleteError) {
        log('✅ Post hard deleted successfully:', postId)
        return { id: postId, deleted: true }
      }

      // If we get here, both methods failed
      throw new Error('Failed to delete post. Please check your permissions.')
    },
    onSuccess: (data) => {
      log('✅ Delete mutation succeeded:', data)
      // Invalidate posts queries to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['posts', currentForumId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['userPosts'] })
      setPostOptionsPost(null)
      Alert.alert('Success', 'Post deleted successfully')
    },
    onError: (error) => {
      console.error('❌ Delete mutation error:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to delete post. Please try again.'))
    }
  })

  const handleDeletePost = (post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePostMutation.mutate(post.id)
        }
      ]
    )
  }

  // Mock current user - replace with real auth
  const currentUser = {
    id: user?.id || 'user-123',
    name: user?.email?.split('@')[0] || 'User',
    avatar: null,
  }

  // Posts are already filtered by forum and tag in the query
  // Just apply sorting if needed
  const allPosts = useMemo(() => {
    if (posts.length === 0) return []

    // Posts are already sorted by created_at DESC from query
    // Tag filtering is done in the query
    return posts.map((post) => ({
      ...post,
      type: 'post',
    }))
  }, [posts])

  // Update school if params change
  React.useEffect(() => {
    if (params.schoolName) {
      setCurrentSchool(params.schoolName)
    }
  }, [params.schoolName])
  const [isFavorited, setIsFavorited] = useState(false)
  const [comments, setComments] = useState({}) // Comments loaded from Supabase via usePosts hook
  const [newCommentText, setNewCommentText] = useState('')
  const [newCommentIsAnon, setNewCommentIsAnon] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyIsAnon, setReplyIsAnon] = useState(true)
  const [postUserVotes, setPostUserVotes] = useState({}) // { postId: 'upvote' | 'downvote' | null }
  const [userVotes, setUserVotes] = useState({}) // { commentId: 'up' | 'down' | null }
  const [focusCommentInput, setFocusCommentInput] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const lastScrollY = useRef(0)
  const headerTranslateY = useRef(new Animated.Value(0)).current
  const isAnimating = useRef(false)
  const pendingCommentIds = useRef({}) // Track pending optimistic comments by post ID
  const commentInputRef = useRef(null)

  // Fix infinite loop by checking if data actually changed
  React.useEffect(() => {
    if (!activePost?.id) return
    const currentComments = comments[activePost.id] || []
    if (JSON.stringify(currentComments) !== JSON.stringify(activePostComments)) {
      setComments((prev) => ({
        ...prev,
        [activePost.id]: activePostComments,
      }))
    }
  }, [activePost?.id, activePostComments])

  // Sync comments for modal post
  React.useEffect(() => {
    if (!commentsModalPost?.id) return
    const currentComments = comments[commentsModalPost.id] || []
    if (JSON.stringify(currentComments) !== JSON.stringify(modalPostComments)) {
      setComments((prev) => ({
        ...prev,
        [commentsModalPost.id]: modalPostComments,
      }))
    }
  }, [commentsModalPost?.id, modalPostComments])

  const collectCommentIds = useCallback((postComments) => {
    const ids = []
      ; (postComments || []).forEach((comment) => {
        if (comment?.id) ids.push(comment.id)
        if (comment?.replies?.length) {
          comment.replies.forEach((reply) => {
            if (reply?.id) ids.push(reply.id)
          })
        }
      })
    return ids
  }, [])

  React.useEffect(() => {
    if (!activePost?.id || !user?.id) {
      setUserVotes({})
      return
    }
    const postComments = comments[activePost.id] || []
    const commentIds = collectCommentIds(postComments)
    if (!commentIds.length) {
      setUserVotes({})
      return
    }

    const fetchCommentVotes = async () => {
      const { data, error } = await supabase
        .from('forum_comment_reactions')
        .select('comment_id, reaction_type')
        .in('comment_id', commentIds)
        .eq('user_id', user.id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('forum_comment_reactions table missing - run migration to enable comment votes.')
          return
        }
        console.error('Error fetching comment votes:', error)
        return
      }

      const nextVotes = {}
      data?.forEach((row) => {
        nextVotes[row.comment_id] = row.reaction_type === 'upvote' ? 'up' : 'down'
      })
      setUserVotes(nextVotes)
    }

    fetchCommentVotes()
  }, [activePost?.id, comments, collectCommentIds, user?.id])

  // Sync activePost with posts data - only depend on activePost.id to avoid infinite loop
  const activePostId = activePost?.id
  React.useEffect(() => {
    if (!activePostId) return
    const updated = posts.find((post) => post.id === activePostId)
    if (updated) {
      setActivePost((prev) => {
        if (!prev) return prev
        // Only update if commentsCount actually changed to prevent unnecessary re-renders
        if (prev.commentsCount === updated.commentsCount &&
          prev.score === updated.score) {
          return prev
        }
        return { ...prev, ...updated }
      })
    }
  }, [posts, activePostId])

  React.useEffect(() => {
    if (!activePost || !focusCommentInput) return
    const timeoutId = setTimeout(() => {
      commentInputRef.current?.focus()
    }, 200)
    setFocusCommentInput(false)
    return () => clearTimeout(timeoutId)
  }, [activePost, focusCommentInput])

  const syncPostCommentCount = async (postId) => {
    if (!postId) return
    const { count, error } = await supabase
      .from('forum_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('deleted_at', null)

    if (error) {
      console.error('Error counting comments:', error)
      return
    }

    if (typeof count === 'number') {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ comments_count: count })
        .eq('id', postId)

      if (updateError) {
        console.error('Error syncing comment count:', updateError)
      }
    }
  }

  const syncPostVoteCounts = async (postId) => {
    if (!postId) return
    const { count: upvotes, error: upvoteError } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('reaction_type', 'upvote')

    if (upvoteError) {
      console.error('Error counting upvotes:', upvoteError)
      return
    }

    const { count: downvotes, error: downvoteError } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('reaction_type', 'downvote')

    if (downvoteError) {
      console.error('Error counting downvotes:', downvoteError)
      return
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({
        upvotes_count: upvotes || 0,
        downvotes_count: downvotes || 0,
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Error syncing vote counts:', updateError)
    }
  }

  const syncCommentVoteCounts = async (commentId) => {
    if (!commentId) return

    const { count: upvotes, error: upvoteError } = await supabase
      .from('forum_comment_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('reaction_type', 'upvote')

    if (upvoteError) {
      if (isTableNotFoundError(upvoteError)) return
      console.error('Error counting comment upvotes:', upvoteError)
      return
    }

    const { count: downvotes, error: downvoteError } = await supabase
      .from('forum_comment_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('reaction_type', 'downvote')

    if (downvoteError) {
      if (isTableNotFoundError(downvoteError)) return
      console.error('Error counting comment downvotes:', downvoteError)
      return
    }

    const { error: updateError } = await supabase
      .from('forum_comments')
      .update({
        upvotes_count: upvotes || 0,
        downvotes_count: downvotes || 0,
      })
      .eq('id', commentId)

    if (updateError) {
      console.error('Error syncing comment vote counts:', updateError)
    }
  }

  const isTableNotFoundError = (error) => {
    return error?.code === 'PGRST205' ||
      error?.code === '42P01' ||
      error?.message?.includes('Could not find the table') ||
      (error?.message?.includes('relation') && error?.message?.includes('does not exist'))
  }

  const updatePostCache = (postId, updater) => {
    queryClient.setQueriesData({ queryKey: ['posts'] }, (old) => {
      if (!old?.pages) return old
      const pages = old.pages.map((page) => ({
        ...page,
        posts: (page.posts || []).map((post) => (
          post.id === postId ? updater(post) : post
        )),
      }))
      return { ...old, pages }
    })
  }

  const createNotification = async ({
    userId,
    actorId,
    type,
    entityType,
    entityId,
    data = {},
  }) => {
    if (!userId || !actorId || userId === actorId) return
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: actorId,
        type,
        entity_type: entityType,
        entity_id: entityId,
        data,
      })
    } catch (error) {
      console.warn('Notification insert failed:', error)
    }
  }

  const getCommentOwnerId = (commentId, parentId = null) => {
    const targetPostId = activePost?.id || commentsModalPost?.id
    if (!targetPostId) return null
    const postComments = comments[targetPostId] || []
    if (!parentId) {
      const match = postComments.find((comment) => comment.id === commentId)
      return match?.userId || null
    }
    const parent = postComments.find((comment) => comment.id === parentId)
    const reply = parent?.replies?.find((item) => item.id === commentId)
    return reply?.userId || null
  }

  const handlePostReaction = async (postId, reactionType) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to vote on posts.')
      return
    }

    const { data: existing, error } = await supabase
      .from('post_reactions')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading reaction:', error)
      Alert.alert('Error', 'Failed to update vote. Please try again.')
      return
    }

    const currentPost = posts.find((post) => post.id === postId) || (activePost?.id === postId ? activePost : null)
    const currentUpvotes = currentPost?.upvotes || 0
    const currentDownvotes = currentPost?.downvotes || 0
    const isSameVote = existing?.reaction_type === reactionType
    const nextVoteState = isSameVote ? null : reactionType
    const shouldNotifyUpvote = reactionType === 'upvote' && (!existing || existing.reaction_type !== 'upvote')

    let nextUpvotes = currentUpvotes
    let nextDownvotes = currentDownvotes

    if (isSameVote) {
      if (reactionType === 'upvote') {
        nextUpvotes = Math.max(0, currentUpvotes - 1)
      } else {
        nextDownvotes = Math.max(0, currentDownvotes - 1)
      }
    } else if (existing) {
      if (reactionType === 'upvote') {
        nextUpvotes = currentUpvotes + 1
        nextDownvotes = Math.max(0, currentDownvotes - 1)
      } else {
        nextDownvotes = currentDownvotes + 1
        nextUpvotes = Math.max(0, currentUpvotes - 1)
      }
    } else {
      if (reactionType === 'upvote') {
        nextUpvotes = currentUpvotes + 1
      } else {
        nextDownvotes = currentDownvotes + 1
      }
    }

    updatePostCache(postId, (post) => ({
      ...post,
      upvotes: nextUpvotes,
      downvotes: nextDownvotes,
      score: nextUpvotes - nextDownvotes,
    }))
    setPostUserVotes((prev) => {
      const next = { ...prev }
      if (nextVoteState) {
        next[postId] = nextVoteState
      } else {
        delete next[postId]
      }
      return next
    })
    setActivePost((prev) => (
      prev && prev.id === postId
        ? { ...prev, upvotes: nextUpvotes, downvotes: nextDownvotes, score: nextUpvotes - nextDownvotes }
        : prev
    ))

    if (isSameVote) {
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        console.error('Error removing reaction:', deleteError)
        Alert.alert('Error', 'Failed to update vote. Please try again.')
        return
      }
    } else if (existing) {
      const { error: updateError } = await supabase
        .from('post_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating reaction:', updateError)
        Alert.alert('Error', 'Failed to update vote. Please try again.')
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setPostUserVotes((prev) => ({ ...prev, [postId]: reactionType }))
        } else {
          console.error('Error inserting reaction:', insertError)
          Alert.alert('Error', 'Failed to update vote. Please try again.')
          return
        }
      }
    }

    if (shouldNotifyUpvote) {
      const postOwnerId = currentPost?.userId
      await createNotification({
        userId: postOwnerId,
        actorId: user.id,
        type: 'post_like',
        entityType: 'post',
        entityId: postId,
        data: { post_id: postId },
      })
    }

    await syncPostVoteCounts(postId)
    await refetchPosts()
  }

  const getCommentCounts = (commentId, parentId = null) => {
    const targetPostId = activePost?.id || commentsModalPost?.id
    if (!targetPostId) {
      return { upvotes: 0, downvotes: 0 }
    }
    const postComments = comments[targetPostId] || []
    if (!parentId) {
      const match = postComments.find((comment) => comment.id === commentId)
      return {
        upvotes: match?.upvotes || 0,
        downvotes: match?.downvotes || 0,
      }
    }
    const parent = postComments.find((comment) => comment.id === parentId)
    const reply = parent?.replies?.find((item) => item.id === commentId)
    return {
      upvotes: reply?.upvotes || 0,
      downvotes: reply?.downvotes || 0,
    }
  }

  const handleCommentVote = async (commentId, parentId = null, direction = 'up') => {
    // Support both activePost (full detail) and commentsModalPost (modal)
    const targetPostId = activePost?.id || commentsModalPost?.id
    if (!user?.id || !targetPostId) {
      Alert.alert('Sign in required', 'Please sign in to like comments.')
      return
    }

    const voteKey = commentId
    const currentVote = userVotes[voteKey]
    const newVote = currentVote === direction ? null : direction
    const currentCounts = getCommentCounts(commentId, parentId)
    let nextUpvotes = currentCounts.upvotes
    let nextDownvotes = currentCounts.downvotes

    if (currentVote === direction) {
      if (direction === 'up') {
        nextUpvotes = Math.max(0, currentCounts.upvotes - 1)
      } else {
        nextDownvotes = Math.max(0, currentCounts.downvotes - 1)
      }
    } else if (currentVote) {
      if (direction === 'up') {
        nextUpvotes = currentCounts.upvotes + 1
        nextDownvotes = Math.max(0, currentCounts.downvotes - 1)
      } else {
        nextDownvotes = currentCounts.downvotes + 1
        nextUpvotes = Math.max(0, currentCounts.upvotes - 1)
      }
    } else {
      if (direction === 'up') {
        nextUpvotes = currentCounts.upvotes + 1
      } else {
        nextDownvotes = currentCounts.downvotes + 1
      }
    }

    setUserVotes((prev) => {
      const next = { ...prev }
      if (newVote) {
        next[voteKey] = newVote
      } else {
        delete next[voteKey]
      }
      return next
    })
    setComments((prev) => ({
      ...prev,
      [targetPostId]: (prev[targetPostId] || []).map((comment) => {
        if (parentId && comment.id === parentId) {
          return {
            ...comment,
            replies: (comment.replies || []).map((reply) => (
              reply.id === commentId
                ? { ...reply, upvotes: nextUpvotes, downvotes: nextDownvotes }
                : reply
            )),
          }
        }
        if (!parentId && comment.id === commentId) {
          return { ...comment, upvotes: nextUpvotes, downvotes: nextDownvotes }
        }
        return comment
      }),
    }))

    const reactionType = direction === 'up' ? 'upvote' : 'downvote'
    const { data: existing, error } = await supabase
      .from('forum_comment_reactions')
      .select('id, reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      if (isTableNotFoundError(error)) {
        Alert.alert('Update required', 'Comment votes require a database update.')
        return
      }
      console.error('Error loading comment vote:', error)
      Alert.alert('Error', 'Failed to update vote. Please try again.')
      await refetchComments()
      return
    }

    const isSameVote = existing?.reaction_type === reactionType

    if (isSameVote) {
      const { error: deleteError } = await supabase
        .from('forum_comment_reactions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        console.error('Error removing comment vote:', deleteError)
        Alert.alert('Error', 'Failed to update vote. Please try again.')
        await refetchComments()
        return
      }
    } else if (existing) {
      const { error: updateError } = await supabase
        .from('forum_comment_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating comment vote:', updateError)
        Alert.alert('Error', 'Failed to update vote. Please try again.')
        await refetchComments()
        return
      }
    } else if (newVote) {
      const { error: insertError } = await supabase
        .from('forum_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        })

      if (insertError) {
        if (insertError.code !== '23505') {
          console.error('Error inserting comment vote:', insertError)
          Alert.alert('Error', 'Failed to update vote. Please try again.')
          await refetchComments()
          return
        }
      }
    }

    await syncCommentVoteCounts(commentId)
    await refetchComments()

    if (direction === 'up' && newVote === 'up') {
      const commentOwnerId = getCommentOwnerId(commentId, parentId)
      await createNotification({
        userId: commentOwnerId,
        actorId: user.id,
        type: 'comment_like',
        entityType: 'comment',
        entityId: commentId,
        data: { post_id: targetPostId, comment_id: commentId },
      })
    }
  }

  const submitComment = async ({ postId, parentId = null, body, isAnonymous, tempId = null }) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to comment.')
      return false
    }

    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_id: parentId,
        body,
        is_anonymous: isAnonymous,
      })
      .select(`
        id,
        post_id,
        user_id,
        parent_id,
        body,
        is_anonymous,
        upvotes_count,
        downvotes_count,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error posting comment:', error)
      Alert.alert('Error', 'Failed to post comment. Please try again.')
      await refetchComments()
      return false
    }

    if (data?.id) {
      const authorLabel = isAnonymous ? 'Anonymous' : currentUser.name
      const savedComment = {
        id: data.id,
        userId: data.user_id,
        author: authorLabel,
        isAnon: isAnonymous,
        body: data.body,
        upvotes: data.upvotes_count || 0,
        downvotes: data.downvotes_count || 0,
        timeAgo: getTimeAgo(data.created_at),
        replies: [],
      }

      setComments((prev) => {
        const postComments = prev[postId] || []
        const filtered = tempId
          ? postComments.filter((comment) => comment.id !== tempId)
          : postComments
        return {
          ...prev,
          [postId]: parentId
            ? filtered.map((comment) => (
              comment.id === parentId
                ? { ...comment, replies: [...(comment.replies || []), savedComment] }
                : comment
            ))
            : [...filtered, savedComment],
        }
      })
    }

    if (tempId) {
      pendingCommentIds.current[postId] = (
        pendingCommentIds.current[postId] || []
      ).filter((item) => item.id !== tempId)
    }

    await syncPostCommentCount(postId)
    await refetchComments()
    await refetchPosts()

    const postOwnerId = activePost?.userId
    if (!parentId) {
      await createNotification({
        userId: postOwnerId,
        actorId: user.id,
        type: 'post_comment',
        entityType: 'post',
        entityId: postId,
        data: { post_id: postId, comment_id: data?.id },
      })
    } else {
      const parentOwnerId = getCommentOwnerId(parentId, null)
      await createNotification({
        userId: parentOwnerId,
        actorId: user.id,
        type: 'comment_reply',
        entityType: 'comment',
        entityId: parentId,
        data: { post_id: postId, comment_id: data?.id, parent_id: parentId },
      })
      if (postOwnerId && postOwnerId !== parentOwnerId) {
        await createNotification({
          userId: postOwnerId,
          actorId: user.id,
          type: 'post_comment',
          entityType: 'post',
          entityId: postId,
          data: { post_id: postId, comment_id: data?.id, parent_id: parentId },
        })
      }
    }

    return true
  }

  // Wrapper for CommentsModal to add comments
  const handleAddComment = async (postId, body, isAnonymous, parentId = null) => {
    const success = await submitComment({
      postId,
      parentId,
      body,
      isAnonymous,
    })
    if (success) {
      // Refetch comments for modal if that's where the comment was added
      if (commentsModalPost?.id === postId) {
        await refetchModalComments()
      }
    }
    return success
  }

  const handlePickMedia = async (kind) => {
    try {
      log(`Picking ${kind}...`)
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        log('Permission not granted')
        Alert.alert('Permission Required', 'Please grant access to your media library to select images or videos.')
        return
      }

      const mediaType = kind === 'image'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType,
        allowsEditing: false,
        quality: 0.7,
        allowsMultipleSelection: false,
      })

      if (result.canceled) {
        log('User canceled media picker')
        return
      }

      const asset = result.assets?.[0]
      if (!asset) {
        log('No asset selected')
        return
      }

      log('Media selected:', asset.uri)
      setDraftMedia((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: kind,
        },
      ])
    } catch (error) {
      console.error('Media pick error:', error)
      Alert.alert('Error', 'Failed to pick media. Please try again.')
    }
  }

  const uploadPostMedia = async (postId) => {
    if (!postId || draftMedia.length === 0 || !user?.id) return []

    // TODO: Add video support once bonded-media allows videos.
    // TODO: Align post media ownership with public.media schema (post linkage).
    const imageMedia = draftMedia.filter((media) => media.type === 'image')
    if (imageMedia.length === 0) return []

    const uploads = await Promise.all(
      imageMedia.map(async (media) => {
        const result = await uploadImageToBondedMedia({
          fileUri: media.uri,
          mediaType: 'post',
          ownerType: 'user',
          ownerId: user.id,
          userId: user.id,
          postId,
        })
        return result?.path || null
      })
    )

    return uploads.filter(Boolean)
  }

  const handleCreateStory = () => {
    setIsStoryFlowVisible(true)
  }

  const handleViewStory = (storyGroup) => {
    // Get all story groups for this forum
    const rawStories = getForumStories(currentForumId)
    const groupedStories = {}
    rawStories.forEach((story) => {
      if (!groupedStories[story.userId]) {
        groupedStories[story.userId] = {
          id: story.userId,
          userId: story.userId,
          name: story.userName,
          thumbnail: story.userAvatar,
          forumId: currentForumId,
          segments: [],
        }
      }
      groupedStories[story.userId].segments.push(story)
    })
    const stories = Object.values(groupedStories)
    const index = stories.findIndex((s) => s.id === storyGroup.id)

    setViewerStories(stories)
    setSelectedStoryIndex(index >= 0 ? index : 0)
    setIsStoryViewerVisible(true)
  }

  const renderStory = (story, isFirst) => {
    if (isFirst) {
      return (
        <TouchableOpacity
          key="add-story"
          style={styles.storyItem}
          activeOpacity={0.8}
        >
          <View style={[styles.storyAvatar, styles.storyAddAvatar]}>
            <Add
              size={hp(3)}
              color={theme.colors.textSecondary}
              strokeWidth={2.5}
            />
          </View>
          <Text style={styles.storyLabel}>New</Text>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity
        key={story.id}
        style={styles.storyItem}
        activeOpacity={0.8}
      >
        <View style={styles.storyAvatar}>
          <Text style={styles.storyAvatarText}>
            {story.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.storyLabel}>
          {story.name}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderPost = ({ item }) => {
    // Render event post differently
    if (item.type === 'event' && item.event) {
      return <EventPost event={item.event} forumId={currentForumId} />
    }

    // Regular post
    const voteState = postUserVotes[item.id]
    const isUpvoted = voteState === 'upvote'
    const isDownvoted = voteState === 'downvote'

    return (
      <View style={styles.postCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setActivePost(item)}
        >
          {/* Header */}
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.postAuthorRow}
              activeOpacity={0.8}
              onPress={() => {
                if (item.isAnon) {
                  setActiveAuthorPost(item)
                  return
                }
                if (item.isOrgPost && item.orgId) {
                  openOrg(item.orgId)
                  return
                }
                openProfile(item.userId)
              }}
            >
              {item.isAnon ? (
                <LinearGradient
                  colors={['#A855F7', '#9333EA']}
                  style={styles.postAvatar}
                >
                  <Text style={styles.postAvatarText}>?</Text>
                </LinearGradient>
              ) : item.authorAvatar ? (
                <Image
                  source={{ uri: item.authorAvatar }}
                  style={styles.postAvatarImage}
                />
              ) : (
                <LinearGradient
                  colors={['#6B7280', '#4B5563']}
                  style={styles.postAvatar}
                >
                  <Text style={styles.postAvatarText}>
                    {item.author?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthorName}>
                  {item.isAnon ? 'Anonymous' : item.author}
                </Text>
                <Text style={styles.postMetaText}>
                  {item.forum} • {item.timeAgo}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation()
                setPostOptionsPost(item)
              }}
            >
              <MoreHorizontal
                size={hp(2.2)}
                color={theme.colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.postBody}>
            {item.title && (
              <Text style={styles.postTitle}>{item.title}</Text>
            )}
            <Text numberOfLines={3} style={styles.postBodyText}>
              {item.body}
            </Text>

            {/* Tags - Removed for V1, will add back later */}

            {/* Poll */}
            {polls[item.id] && (
              <View style={styles.postPollContainer}>
                <PollRenderer
                  poll={polls[item.id]}
                  userVote={pollVotes[polls[item.id].poll_id]?.[currentUser.id]}
                  onVote={(optionIndex) => {
                    const pollId = polls[item.id].poll_id
                    setPollVotes((prev) => ({
                      ...prev,
                      [pollId]: {
                        ...(prev[pollId] || {}),
                        [currentUser.id]: optionIndex,
                      },
                    }))
                    // Update results
                    setPollResults((prev) => {
                      const current = prev[pollId] || { totalVotes: 0, voteCounts: [] }
                      const newCounts = [...(current.voteCounts || [])]
                      newCounts[optionIndex] = (newCounts[optionIndex] || 0) + 1
                      return {
                        ...prev,
                        [pollId]: {
                          totalVotes: current.totalVotes + 1,
                          voteCounts: newCounts,
                        },
                      }
                    })
                  }}
                  totalVotes={pollResults[polls[item.id].poll_id]?.totalVotes || 0}
                  voteCounts={pollResults[polls[item.id].poll_id]?.voteCounts || []}
                />
              </View>
            )}

            {item.media && item.media.length > 0 && (
              <View style={styles.postMediaPreview}>
                {item.media[0].type === 'image' ? (
                  <Image
                    source={{ uri: item.media[0].uri }}
                    style={styles.postMediaImage}
                  />
                ) : (
                  <View style={styles.postMediaVideo}>
                    <Video
                      size={hp(3.5)}
                      color={theme.colors.white}
                      strokeWidth={2}
                      fill={theme.colors.white}
                    />
                    <Text style={styles.postMediaVideoText}>Video</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Actions - Compact Row */}
        <View style={styles.postActionsRow}>
          <View style={styles.postVotesRow}>
            <TouchableOpacity
              style={styles.voteButton}
              activeOpacity={0.7}
              onPress={async () => {
                await handlePostReaction(item.id, 'upvote')
              }}
            >
              <ArrowUpCircle
                size={hp(2.6)}
                color={isUpvoted ? theme.statusColors.success : theme.colors.textSecondary}
                strokeWidth={2}
                fill={isUpvoted ? '#2ecc71' : 'none'}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.postVoteCount,
                isUpvoted && styles.postVotePositive,
                isDownvoted && styles.postVoteNegative,
              ]}
            >
              {item.score}
            </Text>
            <TouchableOpacity
              style={styles.voteButton}
              activeOpacity={0.7}
              onPress={async () => {
                await handlePostReaction(item.id, 'downvote')
              }}
            >
              <ArrowDownCircle
                size={hp(2.6)}
                color={isDownvoted ? theme.statusColors.error : theme.colors.textSecondary}
                strokeWidth={2}
                fill={isDownvoted ? '#e74c3c' : 'none'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.postActionButton}
            activeOpacity={0.7}
            onPress={() => {
              // Instagram-style: open comments modal instead of full post detail
              setCommentsModalPost(item)
            }}
          >
            <MessageCircle
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              strokeWidth={2}
            />
            <Text style={styles.postActionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>

          {/* Repost button removed for V1 - will add back later */}

          <TouchableOpacity
            style={styles.postActionButton}
            activeOpacity={0.7}
            onPress={() => {
              setShareContent({
                type: 'post',
                data: item,
              })
              setShowShareModal(true)
            }}
          >
            <Share2
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Forum Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/profile')}
          activeOpacity={0.6}
        >
          {headerAvatarUrl ? (
            <Image source={{ uri: headerAvatarUrl }} style={styles.headerAvatarImage} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarFallbackText}>{headerAvatarInitial}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <ForumSwitcher
            currentForum={currentForum}
            onPress={() => setIsForumSelectorVisible(true)}
            unreadCount={visibleForums.reduce((sum, f) => sum + (f.unreadCount || 0), 0)}
          />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={hp(2.4)} color={theme.colors.textPrimary} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.campusSelectorButton}
              onPress={() => setIsCampusSelectorVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.campusSelectorText} numberOfLines={1}>
                {selectedUniversity?.name || 'Select Campus'}
              </Text>
              <ChevronDown size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Stories */}
      <View style={styles.storiesWrapper}>
        <LinearGradient
          colors={['rgba(168, 85, 247, 0.08)', 'transparent']}
          style={styles.storiesGradient}
        >
          <View style={styles.storiesPlaceholder}>
            <Text style={styles.storiesPlaceholderTitle}>Stories</Text>
            <Text style={styles.storiesPlaceholderSubtitle}>Coming soon</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {(!currentForumId && !forumsLoading) ? (
          <View style={styles.emptyForumState}>
            <Text style={styles.emptyForumStateTitle}>No forums yet for this campus</Text>
            <Text style={styles.emptyForumStateText}>
              This campus needs a default forum before posts can appear.
            </Text>
          </View>
        ) : (forumsLoading || postsLoading) ? (
          <ForumFeedSkeleton numPosts={6} />
        ) : postsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load posts. Please try again.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetchPosts()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <AnimatedFlatList
            data={allPosts}
            keyExtractor={(item) => item.id || item.event?.id}
            contentContainerStyle={styles.postsList}
            showsVerticalScrollIndicator={false}
            renderItem={renderPost}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={renderListHeader}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.colors.textPrimary }]}>
                  {'No posts yet. Be the first to post!'}
                </Text>
                {(
                  <TouchableOpacity
                    style={[styles.createFirstPostButton, { backgroundColor: theme.colors.accent }]}
                    onPress={() => setIsCreateModalVisible(true)}
                  >
                    <Text style={styles.createFirstPostButtonText}>Create Post</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ padding: hp(2), alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Loading more posts...</Text>
                </View>
              ) : null
            }
          />
        )}


        {/* Forum Post Detail Screen */}
        <Modal
          visible={!!activePost}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setActivePost(null)
            setActiveProfileId(null) // Clear profile when closing post detail
          }}
          presentationStyle="fullScreen"
        >
          <ForumPostDetail
            post={activePost}
            comments={comments[activePost?.id] || []}
            userVotes={userVotes}
            postUserVote={postUserVotes[activePost?.id]}
            commentSort={commentSort}
            onClose={() => {
              setActivePost(null)
            }}
            onPostVote={handlePostReaction}
            onCommentVote={handleCommentVote}
            onAddComment={async (postId, body, isAnon, parentId) => {
              const success = await submitComment({
                postId,
                body,
                isAnonymous: isAnon,
                parentId: parentId ?? null  // Use nullish coalescing to preserve 0/false values
              })
              return success
            }}
            onChangeSort={setCommentSort}
            onShare={() => {
              setShareContent({ type: 'post', data: activePost })
              setShowShareModal(true)
            }}
            onRepost={() => {
              setRepostPost(activePost)
              setIsRepostModalVisible(true)
            }}
            onPressProfile={(userId, isAnon) => {
              if (isAnon) {
                // Handle anonymous profile view if needed
                return
              }
              openProfile(userId)
            }}
            theme={theme}
            router={router}
          />
        </Modal>

        {/* Yearbook Profile Modal with swipe-to-dismiss - only show when ForumPostDetail is not open */}


        {/* Author Profile Modal */}
        <Modal
          visible={!!activeAuthorPost}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveAuthorPost(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveAuthorPost(null)}
          >
            <Pressable
              style={styles.profileModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              {activeAuthorPost && (
                <>
                  <View style={styles.profileModalHeader}>
                    <View style={styles.profileModalHeaderText}>
                      <Text style={styles.profileName}>
                        {activeAuthorPost.isAnon
                          ? 'Anonymous'
                          : activeAuthorPost.author}
                      </Text>
                      <Text style={styles.profileSubText}>
                        {activeAuthorPost.forum} • {activeAuthorPost.timeAgo}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setActiveAuthorPost(null)}
                      style={styles.modalCloseButton}
                    >
                      <X
                        size={hp(2.6)}
                        color={theme.colors.textPrimary}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.profileBody}>
                    <View style={styles.profileAvatarLarge}>
                      <Text style={styles.profileAvatarLargeText}>
                        {activeAuthorPost.isAnon
                          ? '?'
                          : activeAuthorPost.author.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.profileMetaRow}>
                      <View style={styles.profileMetaPill}>
                        <MessageCircle
                          size={hp(1.8)}
                          color={theme.colors.info}
                          strokeWidth={2}
                          style={{ marginRight: wp(1) }}
                        />
                        <Text style={styles.profileMetaPillText}>
                          {activeAuthorPost.score ?? ((activeAuthorPost.upvotes || 0) - (activeAuthorPost.downvotes || 0))} karma
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionLabel}>Recent post</Text>
                      <Text style={styles.profileQuote}>
                        {activeAuthorPost.title}
                      </Text>
                    </View>

                    <View style={styles.profileActions}>
                      {activeAuthorPost.isAnon && (
                        <AnonymousMessageButton
                          userId={activeAuthorPost.userId || 'user-123'}
                          userName="Anonymous"
                          onSendMessage={async (messageData) => {
                            // TODO: Implement actual anonymous message sending
                            log('Sending anonymous message:', messageData)
                          }}
                        />
                      )}
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Post Options Modal - Bottom Sheet Style */}
        <Modal
          visible={!!postOptionsPost}
          transparent
          animationType="slide"
          onRequestClose={() => setPostOptionsPost(null)}
        >
          <Pressable
            style={styles.postOptionsOverlay}
            onPress={() => setPostOptionsPost(null)}
          >
            <Pressable
              style={styles.postOptionsBottomSheet}
              onPress={(e) => e.stopPropagation()}
            >
              {postOptionsPost && (
                <>
                  {/* Drag Handle */}
                  <View style={styles.postOptionsHandle} />

                  {/* Options List */}
                  <View style={styles.postOptionsList}>
                    {postOptionsPost.userId === currentUser.id && (
                      <TouchableOpacity
                        style={styles.postOptionItem}
                        onPress={() => {
                          setPostOptionsPost(null)
                          handleDeletePost(postOptionsPost)
                        }}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.postOptionTextDanger}>
                          Delete Post
                        </Text>
                      </TouchableOpacity>
                    )}
                    {postOptionsPost.userId !== currentUser.id && (
                      <TouchableOpacity
                        style={styles.postOptionItem}
                        onPress={() => {
                          setPostOptionsPost(null)
                          // TODO: Implement report functionality
                          Alert.alert('Report', 'Report functionality coming soon')
                        }}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.postOptionText}>
                          Report Post
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={styles.postOptionsCancel}
                    onPress={() => setPostOptionsPost(null)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.postOptionsCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* New Post Modal - Fizz Style */}
        <Modal
          visible={isCreateModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCreateModalVisible(false)}
          presentationStyle="overFullScreen"
        >
          <View style={styles.fizzModalWrapper}>
            <SafeAreaView style={styles.fizzModalSafeArea} edges={['top', 'bottom', 'left', 'right']}>
              <KeyboardAvoidingView
                style={styles.fizzModalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
              >
                {/* Header */}
                <View style={[styles.fizzModalHeader, { paddingTop: Math.max(insets.top, hp(2)) }]}>
                  <TouchableOpacity
                    onPress={() => setIsCreateModalVisible(false)}
                    activeOpacity={0.8}
                    style={styles.fizzHeaderButton}
                  >
                    <X size={hp(2.5)} color={theme.colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss()
                      setShowPostAsModal(true)
                    }}
                    activeOpacity={0.8}
                    style={styles.fizzHeaderCenter}
                  >
                    {/* Show current forum name */}
                    {currentForum && (
                      <Text style={[styles.fizzModalTitle, { fontSize: hp(1.4), color: theme.colors.textSecondary, marginBottom: hp(0.3) }]} numberOfLines={1}>
                        {currentForum.name}
                      </Text>
                    )}
                    <View style={styles.fizzAnonymousRow}>
                      <View style={styles.fizzAnonymousIcon}>
                        <Person size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                      </View>
                      <Text style={styles.fizzAnonymousText}>
                        {draftIsAnon ? 'Anonymous' : 'Your Name'}
                      </Text>
                      <ChevronDown size={hp(1.8)} color={theme.colors.textPrimary} strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={!draftBody.trim() || createPostMutation.isPending}
                    onPress={async () => {
                      log('Post button pressed')
                      log('draftBody:', draftBody)
                      log('currentForum:', currentForum)
                      log('currentForumId:', currentForum?.id)
                      log('forums available:', visibleForums.length)

                      if (!draftBody.trim()) {
                        Alert.alert('Required', 'Please enter a post body')
                        setIsCreateModalVisible(false)
                        return
                      }

                      // Use the currently viewed forum - this should always be set
                      let forumToUse = currentForum
                      let forumIdToUse = currentForum?.id

                      // If somehow currentForum is still null, try to get it from forums
                      if (!forumToUse && visibleForums.length > 0) {
                        // Auto-select default forum if none selected
                        forumToUse = visibleForums.find(f => f.type === 'campus') || visibleForums[0]
                        if (forumToUse) {
                          log('Auto-selecting forum:', forumToUse.name, forumToUse.id)
                          setCurrentForum(forumToUse)
                          forumIdToUse = forumToUse.id
                        }
                      }

                      if (!forumIdToUse) {
                        console.error('No forum selected and no forums available')
                        Alert.alert('Error', 'Please select a forum first')
                        return
                      }

                      log('Using forum for post:', forumToUse.name, forumIdToUse)

                      try {
                        log('Creating post with data:', {
                          forumId: forumIdToUse,
                          body: draftBody.trim(),
                          isAnonymous: draftIsAnon,
                        })

                        // Extract media URLs from draftMedia
                        const mediaUrls = []

                        // Create the post
                        const result = await createPostMutation.mutateAsync({
                          forumId: forumIdToUse,
                          title: draftTitle.trim() || null,
                          body: draftBody.trim(),
                          tags: [],
                          mediaUrls,
                          isAnonymous: draftIsAnon,
                          poll: draftPoll || null,
                        })

                        log('Post created successfully:', result)

                        // Extract post and any poll error from result
                        const createdPost = result?.post || result
                        const pollError = result?.pollError

                        // Show warning if poll creation failed
                        if (pollError) {
                          Alert.alert(
                            'Poll Creation Issue',
                            'Your post was created but the poll failed to attach. You can try creating a new post with the poll.',
                            [{ text: 'OK' }]
                          )
                        }

                        if (createdPost?.id && draftMedia.length > 0) {
                          try {
                            log('📸 Uploading media for post:', createdPost.id)
                            const mediaPaths = await uploadPostMedia(createdPost.id)
                            log('📸 Media paths:', mediaPaths)

                            if (mediaPaths.length > 0) {
                              const { error: updateError } = await supabase
                                .from('posts')
                                .update({ media_urls: mediaPaths })
                                .eq('id', createdPost.id)

                              if (updateError) {
                                console.error('Failed to update post with media:', updateError)
                              } else {
                                log('✅ Post updated with media successfully')
                                // Invalidate queries to show updated post with images
                                // Invalidate all posts queries for the current forum
                                queryClient.invalidateQueries({ queryKey: ['posts', currentForumId] })
                                // Also invalidate any posts queries without filters
                                queryClient.invalidateQueries({ queryKey: ['posts'] })
                              }
                            }
                          } catch (mediaError) {
                            console.error('Post media upload failed:', mediaError)
                            Alert.alert(
                              'Media Upload Failed',
                              'Your post was created but the images failed to upload. You can try editing the post to add them again.'
                            )
                          }
                        }

                        // Reset form
                        setDraftTitle('')
                        setDraftBody('')
                        setDraftIsAnon(true)
                        setDraftMedia([])
                        setDraftPoll(null)
                        setIsCreateModalVisible(false)
                      } catch (error) {
                        console.error('Error creating post:', error)
                        console.error('Error details:', JSON.stringify(error, null, 2))
                        console.error('Error code:', error.code)
                        console.error('Error message:', error.message)
                        console.error('Error details:', error.details)

                        const errorMessage = getFriendlyErrorMessage(error, 'Failed to create post. Please try again.')
                        Alert.alert('Error Creating Post', errorMessage)
                      }
                    }}
                    style={[
                      styles.fizzPostButton,
                      (!draftBody.trim() || createPostMutation.isPending) && styles.fizzPostButtonDisabled,
                    ]}
                  >
                    <Text style={styles.fizzPostButtonText}>
                      {createPostMutation.isPending ? 'Posting...' : 'Post'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content Area */}
                <View style={styles.fizzContentArea}>
                  {/* Optional Title Input */}
                  <TextInput
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                    placeholder="Add a title (optional)"
                    placeholderTextColor={theme.colors.textSecondary}
                    style={styles.fizzTitleInput}
                    maxLength={100}
                  />

                  {/* Body Input */}
                  <TextInput
                    value={draftBody}
                    onChangeText={setDraftBody}
                    placeholder="Share what's really on your mind..."
                    placeholderTextColor={theme.colors.textSecondary}
                    style={styles.fizzTextInput}
                    multiline
                    textAlignVertical="top"
                  />

                  {/* Draft Media Preview - Industry Standard Design */}
                  {draftMedia.length > 0 && (
                    <View style={styles.draftMediaPreview}>
                      {draftMedia.length === 1 ? (
                        // Single image - full width, Instagram-style
                        <View style={styles.draftMediaSingle}>
                          <Image
                            source={{ uri: draftMedia[0].uri }}
                            style={styles.draftMediaSingleImage}
                          />
                          <TouchableOpacity
                            style={styles.draftMediaRemoveSingle}
                            onPress={() => setDraftMedia([])}
                            activeOpacity={0.7}
                          >
                            <View style={styles.draftMediaRemoveSingleButton}>
                              <X size={hp(2.2)} color={theme.colors.white} strokeWidth={2.5} />
                            </View>
                          </TouchableOpacity>
                        </View>
                      ) : draftMedia.length === 2 ? (
                        // Two images - side by side with gap
                        <View style={styles.draftMediaTwoGrid}>
                          {draftMedia.map((media, index) => (
                            <View key={index} style={styles.draftMediaTwoItem}>
                              <Image
                                source={{ uri: media.uri }}
                                style={styles.draftMediaTwoImage}
                              />
                              <TouchableOpacity
                                style={styles.draftMediaRemoveTwo}
                                onPress={() => {
                                  setDraftMedia((prev) => prev.filter((_, i) => i !== index))
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.draftMediaRemoveTwoButton}>
                                  <X size={hp(1.9)} color={theme.colors.white} strokeWidth={2.5} />
                                </View>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        // Three or more - clean grid layout
                        <View style={styles.draftMediaGrid}>
                          {draftMedia.slice(0, 4).map((media, index) => (
                            <View key={index} style={styles.draftMediaGridItem}>
                              <Image
                                source={{ uri: media.uri }}
                                style={styles.draftMediaGridImage}
                              />
                              {index === 3 && draftMedia.length > 4 && (
                                <View style={styles.draftMediaMoreOverlay}>
                                  <Text style={styles.draftMediaMoreText}>+{draftMedia.length - 4}</Text>
                                </View>
                              )}
                              <TouchableOpacity
                                style={styles.draftMediaRemoveGrid}
                                onPress={() => {
                                  setDraftMedia((prev) => prev.filter((_, i) => i !== index))
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.draftMediaRemoveGridButton}>
                                  <X size={hp(1.7)} color={theme.colors.white} strokeWidth={2.5} />
                                </View>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Action Bar - Above Keyboard */}
                <View style={styles.fizzActionBar}>
                  <View style={styles.fizzMediaIconsRow}>
                    <TouchableOpacity
                      style={styles.fizzMediaIcon}
                      onPress={() => handlePickMedia('image')}
                      activeOpacity={0.7}
                    >
                      <ImageIcon size={hp(2.8)} color={theme.colors.textPrimary} strokeWidth={2} />
                    </TouchableOpacity>
                    {/* Video picker removed for V1 - will add back with proper video support later */}
                  </View>
                </View>
                {/* Post As Overlay - Inside create post modal */}
                {showPostAsModal && (
                  <View style={styles.postAsOverlay}>
                    <Pressable
                      style={styles.postAsOverlayBackdrop}
                      onPress={() => setShowPostAsModal(false)}
                    >
                      <View style={styles.postAsOverlayContent}>
                        <View style={styles.postAsModalHandle} />
                        <Text style={styles.postAsModalTitle}>Post as</Text>

                        {/* Anonymous Option */}
                        <TouchableOpacity
                          style={styles.postAsOption}
                          activeOpacity={0.8}
                          onPress={() => {
                            setDraftIsAnon(true)
                            setShowPostAsModal(false)
                          }}
                        >
                          <View style={styles.postAsIcon}>
                            <Person size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                          </View>
                          <View style={styles.postAsOptionText}>
                            <Text style={styles.postAsOptionTitle}>Anonymous</Text>
                            <Text style={styles.postAsOptionSubtitle}>Post without revealing your identity</Text>
                          </View>
                          {draftIsAnon && (
                            <View style={styles.postAsCheck}>
                              <Check size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Your Name Option */}
                        <TouchableOpacity
                          style={styles.postAsOption}
                          activeOpacity={0.8}
                          onPress={() => {
                            setDraftIsAnon(false)
                            setShowPostAsModal(false)
                          }}
                        >
                          <View style={styles.postAsIcon}>
                            <Person size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                          </View>
                          <View style={styles.postAsOptionText}>
                            <Text style={styles.postAsOptionTitle}>Your Name</Text>
                            <Text style={styles.postAsOptionSubtitle}>Post with your name visible</Text>
                          </View>
                          {!draftIsAnon && (
                            <View style={styles.postAsCheck}>
                              <Check size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Org Page Option (for admins) */}
                        {isAdmin && (
                          <TouchableOpacity
                            style={styles.postAsOption}
                            activeOpacity={0.8}
                            onPress={() => {
                              // TODO: Set posting as org
                              setShowPostAsModal(false)
                            }}
                          >
                            <View style={styles.postAsIcon}>
                              <Add size={hp(2)} color={theme.colors.white} strokeWidth={2.5} />
                            </View>
                            <View style={styles.postAsOptionText}>
                              <Text style={styles.postAsOptionTitle}>Organization Page</Text>
                              <Text style={styles.postAsOptionSubtitle}>Post as your organization</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Pressable>
                  </View>
                )}
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </Modal>


        {/* Story Flow (Create/Edit/Preview) */}
        <StoryFlow
          visible={isStoryFlowVisible}
          forumId={currentForumId}
          forumName={currentForum}
          userId={currentUser.id}
          userName={currentUser.name}
          userAvatar={currentUser.avatar}
          onClose={() => setIsStoryFlowVisible(false)}
        />

        {/* Story Viewer */}
        <StoryViewer
          visible={isStoryViewerVisible}
          stories={viewerStories}
          initialIndex={selectedStoryIndex}
          currentUserId={currentUser.id}
          onClose={() => setIsStoryViewerVisible(false)}
        />

        {/* Share Modal */}
        <ShareModal
          visible={showShareModal}
          content={shareContent}
          onClose={() => {
            setShowShareModal(false)
            setShareContent(null)
          }}
        />

        {/* Comments Modal - Instagram/LinkedIn style */}
        <CommentsModal
          visible={!!commentsModalPost}
          post={commentsModalPost}
          comments={comments[commentsModalPost?.id] || []}
          userVotes={userVotes}
          commentSort={commentSort}
          onClose={() => setCommentsModalPost(null)}
          onCommentVote={handleCommentVote}
          onAddComment={handleAddComment}
          onChangeSort={setCommentSort}
          theme={theme}
        />

        {/* Floating Create Post FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            // All users can create posts - no onboarding gate

            // Ensure we have a forum selected before opening modal
            if (!currentForum && visibleForums.length > 0) {
              const mainForum = visibleForums.find(f => f.type === 'campus') || visibleForums[0]
              if (mainForum) {
                log('Setting forum before opening modal:', mainForum.name, mainForum.id)
                switchToForum(mainForum.id)
              }
            }
            setIsCreateModalVisible(true)
          }}
          activeOpacity={0.8}
        >
          <Add size={hp(3.5)} color={theme.colors.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <BottomNav scrollY={scrollY} />

        {/* Campus Selector Modal (Super Admin) */}
        <Modal
          visible={isCampusSelectorVisible}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          onRequestClose={() => setIsCampusSelectorVisible(false)}
        >
          <Pressable
            style={styles.campusModalOverlay}
            onPress={() => setIsCampusSelectorVisible(false)}
          >
            <Pressable
              style={styles.campusModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.campusModalHeader}>
                <Text style={styles.campusModalTitle}>Select Campus</Text>
                <TouchableOpacity
                  onPress={() => setIsCampusSelectorVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={hp(2.4)} color={theme.colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {universitiesLoading ? (
                <View style={styles.campusModalEmpty}>
                  <Text style={styles.campusModalEmptyText}>Loading campuses...</Text>
                </View>
              ) : universities.length === 0 ? (
                <View style={styles.campusModalEmpty}>
                  <Text style={styles.campusModalEmptyText}>No campuses found</Text>
                </View>
              ) : (
                <FlatList
                  data={universities}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.campusModalList}
                  renderItem={({ item }) => {
                    const isSelected = item.id === selectedUniversityId
                    return (
                      <TouchableOpacity
                        style={[
                          styles.campusModalItem,
                          isSelected && styles.campusModalItemActive,
                        ]}
                        onPress={() => {
                          setSelectedUniversityId(item.id)
                          setIsCampusSelectorVisible(false)
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.campusModalItemText,
                            isSelected && styles.campusModalItemTextActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {!!item.domain && (
                          <Text style={styles.campusModalItemSubtext}>
                            {item.domain}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  }}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Forum Selector Modal */}
        <ForumSelectorModal
          visible={isForumSelectorVisible}
          forums={visibleForums}
          currentForumId={currentForumId}
          onSelectForum={(forum) => {
            switchToForum(forum.id)
            // Filter posts by forum if needed
          }}
          onClose={() => setIsForumSelectorVisible(false)}
        />

        {/* Repost Modal removed for V1 - will add back later */}
      </View>
    </SafeAreaView>
  )
}

function getTimeAgo(dateString) {
  if (!dateString) return 'Just now'

  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks}w`

  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo`
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  forumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(0.5),
  },
  forumTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.3,
  },
  favoriteButton: {
    padding: hp(0.8),
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
  },
  headerButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
  },
  headerAvatarFallback: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
    backgroundColor: theme.colors.bondedPurple + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarFallbackText: {
    color: theme.colors.bondedPurple,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  notificationButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: hp(0.3),
    right: wp(0.6),
    minWidth: hp(1.8),
    height: hp(1.8),
    borderRadius: hp(0.9),
    paddingHorizontal: wp(0.6),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  notificationBadgeText: {
    fontSize: hp(1.1),
    color: theme.colors.white,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.body,
    includeFontPadding: false,
  },
  searchContainer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.5),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    gap: wp(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: wp(2),
  },
  clearButtonText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  createPostIconButton: {
    padding: hp(0.5),
  },
  createPostRowContainer: {
    paddingTop: hp(1.5), // Spacing between header and buttons
  },
  createPostRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingBottom: hp(0.5),
  },
  createButton: {
    flex: 1,
  },
  createPostButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.pill,
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(4),
  },
  createPostText: {
    fontSize: hp(1.6),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  createEventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(4),
  },
  createEventText: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingBottom: hp(0.5),
    paddingHorizontal: wp(4),
  },
  filterChip: {
    flex: 1,
  },
  filterButton: {
    flex: 1,
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.pill,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  storiesWrapper: {
    marginBottom: hp(1.5),
    position: 'relative',
  },
  storiesGradient: {
    paddingVertical: hp(0.8),
    borderRadius: hp(1),
  },
  storiesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.4),
  },
  storiesPlaceholderTitle: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  storiesPlaceholderSubtitle: {
    marginTop: hp(0.3),
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  storiesRow: {
    marginBottom: hp(0.5),
  },
  storyItem: {
    width: wp(16),
    alignItems: 'center',
  },
  storyAvatar: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    backgroundColor: theme.colors.background,
    borderWidth: 2.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.8),
    ...Platform.select({
      ios: {
        shadowColor: theme.mode === 'dark' ? '#000' : '#718096',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  storyAddAvatar: {
    borderStyle: 'dashed',
  },
  storyAvatarText: {
    fontSize: hp(2.2),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  storyLabel: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  listHeader: {
    paddingTop: hp(0.5),
    paddingBottom: hp(1.5),
  },
  postsList: {
    paddingBottom: hp(10),
    paddingHorizontal: 0,
  },
  postCard: {
    marginHorizontal: wp(3),
    marginBottom: hp(2),
    paddingVertical: hp(1.5),
    paddingHorizontal: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.2),
    paddingHorizontal: wp(4),
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: wp(2),
  },
  postAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  postAvatarImage: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    marginRight: wp(3),
  },
  postAvatarText: {
    fontSize: hp(2),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
  },
  postMetaText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.1),
    fontWeight: '400',
  },
  postBody: {
    marginBottom: hp(1),
    paddingHorizontal: wp(4),
  },
  postTitle: {
    fontSize: hp(2.1),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.6),
    lineHeight: hp(2.7),
  },
  postBodyText: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.3),
    marginTop: hp(0.2),
  },
  postTagsContainer: {
    marginTop: hp(0.8),
  },
  postPollContainer: {
    marginTop: hp(1),
  },
  postMediaPreview: {
    marginTop: hp(1.5),
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
    marginHorizontal: wp(4),
  },
  postMediaImage: {
    width: '100%',
    aspectRatio: 4 / 5,
    maxHeight: hp(45),
    resizeMode: 'cover',
  },
  postMediaVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: hp(25),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.charcoal,
  },
  postMediaVideoText: {
    marginTop: hp(0.5),
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(1),
    paddingTop: hp(1),
    paddingHorizontal: wp(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  postVotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  voteButton: {
    padding: hp(0.5),
    borderRadius: theme.radius.full,
  },
  postVoteCount: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    minWidth: wp(5),
    textAlign: 'center',
  },
  postVotePositive: {
    color: theme.colors.success,
  },
  postVoteNegative: {
    color: theme.colors.error,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    padding: hp(0.5),
    borderRadius: theme.radius.full,
  },
  postActionText: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  postModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(2),
    maxHeight: '92%',
    minHeight: hp(55),
    flex: 1,
    flexDirection: 'column',
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
  createModalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.xl,
    gap: wp(1.5),
  },
  createPostButtonText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  fizzModalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fizzModalWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fizzModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fizzModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1.5),
    minHeight: hp(7),
  },
  fizzHeaderButton: {
    width: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fizzHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: wp(4),
  },
  fizzAnonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  fizzAnonymousIcon: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fizzAnonymousText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  fizzPostButton: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bondedPurple,
  },
  fizzPostButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  fizzPostButtonText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  fizzContentArea: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
  },
  fizzTitleInput: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    paddingBottom: hp(1),
    marginBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fizzTextInput: {
    flex: 1,
    fontSize: hp(1.9),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    minHeight: hp(15),
    maxHeight: hp(40),
  },
  fizzActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    minHeight: hp(6),
    backgroundColor: theme.colors.background,
  },
  fizzMediaIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
  },
  fizzMediaIcon: {
    width: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fizzSelectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5.5),
    paddingVertical: hp(1.6),
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(0.5),
    borderRadius: theme.radius.xl,
    minHeight: hp(4.6),
    gap: wp(2),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fizzSelectedTagText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.3,
    flex: 1,
  },
  fizzSelectedTagClose: {
    padding: hp(0.3),
  },
  tagSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  tagSelectorOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagSelectorOverlayContent: {
    width: wp(90),
    maxHeight: hp(75),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  tagModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  tagModalContent: {
    width: wp(85),
    maxHeight: hp(70),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: wp(5),
    zIndex: 10000,
    elevation: 10000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 10000,
      },
    }),
  },
  tagModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tagModalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  tagModalCloseButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tagList: {
    maxHeight: hp(55),
  },
  tagListContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  fizzTagPill: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fizzTagPillSelected: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    transform: [{ scale: 1.02 }],
  },
  fizzTagGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(4.5),
  },
  fizzTagPillText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.white,
    letterSpacing: 0.2,
  },
  postAsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  postAsOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  postAsOverlayContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: hp(4),
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
  postAsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  postAsModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: hp(4),
    zIndex: 10000,
    elevation: 10000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 10000,
      },
    }),
  },
  postAsModalHandle: {
    width: wp(12),
    height: hp(0.5),
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    alignSelf: 'center',
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  postAsModalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  postAsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    gap: wp(3),
  },
  postAsIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAsOptionText: {
    flex: 1,
  },
  postAsOptionTitle: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  postAsOptionSubtitle: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.3),
  },
  postAsCheck: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  postModalHeaderTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mediaIconsRow: {
    flexDirection: 'row',
    gap: wp(3),
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  mediaIconButton: {
    padding: hp(1),
  },
  tagPollToggleRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  tagPollToggleButton: {
    width: hp(4),
    height: hp(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPollToggleButtonActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.border,
  },
  tagsSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1.5),
  },
  pollSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  composeFooter: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.offWhite,
    backgroundColor: theme.colors.background,
  },
  postFooterButton: {
    width: '100%',
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postFooterButtonDisabled: {
    opacity: 0.5,
  },
  postFooterButtonText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  postModalTitle: {
    flex: 1,
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginRight: wp(2),
  },
  postModalMeta: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
    marginBottom: hp(1),
  },
  postDetailActions: {
    marginBottom: hp(1.8),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: hp(1.2),
  },
  postDetailVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  postDetailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  postDetailActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  postDetailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  postModalBody: {
    flex: 1,
  },
  postModalBodyContent: {
    paddingBottom: hp(2),
    flexGrow: 1,
  },
  postModalBodyText: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.6),
    marginBottom: hp(2),
  },
  commentsSection: {
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  commentsTitle: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  commentsCount: {
    fontSize: hp(1.6),
    fontWeight: '400',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  commentsList: {
    gap: hp(2),
  },
  commentCard: {
    flexDirection: 'row',
    paddingVertical: hp(1),
    paddingRight: wp(4),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  commentAvatarText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    marginRight: wp(1.5),
  },
  commentMetaText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.1),
  },
  commentBody: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.3),
    marginBottom: hp(0.5),
    marginLeft: wp(14), // Align with text after avatar
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.3),
    marginLeft: wp(14), // Align with text after avatar
    gap: wp(3),
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
  },
  commentLikeText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  commentLikeTextActive: {
    color: theme.colors.info,
  },
  commentLikeLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  commentLikeLabelActive: {
    color: theme.colors.info,
  },
  commentReplyButton: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
  },
  commentReplyText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: hp(1),
    marginLeft: wp(14), // Align with main comment content
    paddingLeft: wp(2),
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    gap: hp(0.5),
  },
  replyCard: {
    flexDirection: 'row',
    paddingVertical: hp(0.8),
    paddingRight: wp(2),
  },
  replyHeader: {
    marginBottom: hp(0.3),
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAvatar: {
    width: hp(3.2),
    height: hp(3.2),
    borderRadius: hp(1.6),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(1.5),
  },
  replyAvatarText: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  replyAuthorInfo: {
    flex: 1,
  },
  replyAuthorName: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    marginRight: wp(1.5),
  },
  replyMetaText: {
    fontSize: hp(1.2),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.1),
  },
  replyBody: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.2),
    marginBottom: hp(0.3),
    marginLeft: wp(10.5), // Align with text after avatar
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(10.5), // Align with text after avatar
    gap: wp(3),
  },
  replyInputContainer: {
    marginTop: hp(1),
    padding: wp(3),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.offWhite,
  },
  replyInput: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(6),
    maxHeight: hp(12),
    marginBottom: hp(1),
  },
  replyInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyInputButtons: {
    flexDirection: 'row',
    gap: wp(2),
  },
  replyCancelButton: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
  },
  replyCancelText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  replySubmitButton: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.pill,
  },
  replySubmitButtonDisabled: {
    opacity: 0.5,
  },
  replySubmitText: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  newCommentContainer: {
    padding: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(1.5),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  newCommentInput: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    minHeight: hp(5),
    maxHeight: hp(10),
    marginBottom: hp(1),
    textAlignVertical: 'center',
  },
  newCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentSubmitButton: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(5),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: theme.mode === 'dark' ? '#000' : '#718096',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  commentSubmitButtonDisabled: {
    opacity: 0.5,
  },
  commentSubmitText: {
    fontSize: hp(1.6),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  anonPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(2.5),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  anonPillActiveSmall: {
    backgroundColor: theme.colors.bondedPurple,
    borderWidth: 0,
  },
  anonPillTextSmall: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  emptyCommentsBox: {
    paddingVertical: hp(3),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(164, 92, 255, 0.08)',
    borderStyle: 'dashed',
  },
  emptyCommentsText: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
    textAlign: 'center',
  },
  profileModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: wp(6),
    paddingTop: hp(2),
    paddingBottom: hp(3),
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  profileModalHeaderText: {
    flex: 1,
    marginRight: wp(4),
  },
  profileName: {
    fontSize: hp(2.4),
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  profileSubText: {
    marginTop: hp(0.5),
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
  },
  profileBody: {
    marginTop: hp(1),
  },
  profileAvatarLarge: {
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.8),
  },
  profileAvatarLargeText: {
    fontSize: hp(3),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  profileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(1.8),
  },
  profileMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },
  profileMetaPillText: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  profileSection: {
    marginBottom: hp(1.8),
  },
  profileSectionLabel: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.6),
  },
  profileQuote: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.6),
  },
  profileActions: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(2),
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.4),
    borderRadius: theme.radius.lg,
  },
  profileSecondaryButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  profilePrimaryButton: {
    backgroundColor: theme.colors.bondedPurple,
  },
  profileSecondaryText: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  profilePrimaryText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: hp(1.8),
  },
  inputLabel: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
  },
  inputHint: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    opacity: 0.8,
    fontFamily: theme.typography.fontFamily.body,
  },
  textInput: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.offWhite,
    backgroundColor: theme.colors.background,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  textArea: {
    minHeight: hp(12),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  mediaRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3.4),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  mediaButtonText: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  composeBody: {
    flex: 1,
    maxHeight: hp(50),
  },
  optionalFeaturesRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.5),
    marginBottom: hp(1),
  },
  optionalFeatureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: wp(1.5),
  },
  optionalFeatureButtonActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.border,
  },
  optionalFeatureButtonText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  optionalFeatureButtonTextActive: {
    color: theme.colors.white,
  },
  collapsibleSection: {
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  composeTitleInput: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(1.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  composeInput: {
    flex: 1,
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.4),
    paddingHorizontal: wp(4),
    minHeight: hp(15),
  },
  composeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composeCancelText: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  composePostButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.9),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bondedPurple,
  },
  composePostButtonText: {
    fontSize: hp(1.7),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  anonPill: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  anonPillActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderWidth: 0,
  },
  mediaAttachedRow: {
    marginTop: hp(1.2),
  },
  mediaAttachedText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
  },
  draftMediaPreview: {
    marginTop: hp(2),
    paddingHorizontal: wp(4),
  },
  // Single image - full width, large preview
  // Single image - full width, Instagram/Twitter style
  draftMediaSingle: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: hp(1.2),
    overflow: 'hidden',
    backgroundColor: theme.colors.border || '#E5E5E5',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || '#E5E5E5',
  },
  draftMediaSingleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  draftMediaRemoveSingle: {
    position: 'absolute',
    top: hp(1.2),
    right: hp(1.2),
    zIndex: 10,
  },
  draftMediaRemoveSingleButton: {
    width: hp(3.2),
    height: hp(3.2),
    borderRadius: hp(1.6),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  // Two images - side by side with gap
  draftMediaTwoGrid: {
    flexDirection: 'row',
    gap: wp(1.5),
  },
  draftMediaTwoItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: hp(1.2),
    overflow: 'hidden',
    backgroundColor: theme.colors.border || '#E5E5E5',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || '#E5E5E5',
  },
  draftMediaTwoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  draftMediaRemoveTwo: {
    position: 'absolute',
    top: hp(1),
    right: hp(1),
    zIndex: 10,
  },
  draftMediaRemoveTwoButton: {
    width: hp(2.8),
    height: hp(2.8),
    borderRadius: hp(1.4),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  // Grid layout for 3+ images
  draftMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  draftMediaGridItem: {
    width: (wp(100) - wp(8) - wp(1.5)) / 2, // Screen width - padding - gap, divided by 2
    aspectRatio: 1,
    borderRadius: hp(1.2),
    overflow: 'hidden',
    backgroundColor: theme.colors.border || '#E5E5E5',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || '#E5E5E5',
  },
  draftMediaGridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  draftMediaMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftMediaMoreText: {
    fontSize: hp(2.8),
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  draftMediaRemoveGrid: {
    position: 'absolute',
    top: hp(0.8),
    right: hp(0.8),
    zIndex: 10,
  },
  draftMediaRemoveGridButton: {
    width: hp(2.6),
    height: hp(2.6),
    borderRadius: hp(1.3),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
  },
  loadingText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error || '#ef4444',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary || theme.colors.bondedPurple,
    borderRadius: theme.radius.md,
  },
  retryButtonText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  createFirstPostButton: {
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.2),
    borderRadius: hp(1.5),
    marginTop: hp(1),
  },
  createFirstPostButtonText: {
    fontSize: hp(1.6),
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
  },
  draftMediaPreview: {
    marginTop: hp(1.5),
    paddingHorizontal: wp(4),
  },
  draftMediaScroll: {
    flexDirection: 'row',
  },
  draftMediaRemove: {
    position: 'absolute',
    top: -hp(0.8),
    right: -hp(0.8),
  },
  draftMediaRemoveButton: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  tagFilterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  tagFilterChip: {
    marginRight: wp(2),
  },
  pollSection: {
    marginTop: hp(1),
  },
  addPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    gap: wp(1.5),
  },
  addPollText: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  commentsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  sortSegmented: {
    marginLeft: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: hp(12),
    right: wp(5),
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 100,
  },
  campusSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.6),
    borderRadius: hp(1.8),
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  campusSelectorText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    maxWidth: wp(28),
  },
  campusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  campusModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: hp(2),
    borderTopRightRadius: hp(2),
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(3),
    maxHeight: hp(60),
  },
  campusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  campusModalTitle: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  campusModalList: {
    paddingBottom: hp(2),
  },
  campusModalItem: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: hp(1.6),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  campusModalItemActive: {
    borderColor: theme.colors.bondedPurple,
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
  },
  campusModalItemText: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  campusModalItemTextActive: {
    color: theme.colors.bondedPurple,
  },
  campusModalItemSubtext: {
    marginTop: hp(0.4),
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  campusModalEmpty: {
    paddingVertical: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  campusModalEmptyText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  emptyForumState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(10),
  },
  emptyForumStateTitle: {
    fontSize: hp(2.2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  emptyForumStateText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  emptyForumStateButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.1),
    borderRadius: hp(2.4),
    backgroundColor: theme.colors.bondedPurple,
  },
  emptyForumStateButtonText: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
  },
  postOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  postOptionsBottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: hp(2.5),
    borderTopRightRadius: hp(2.5),
    paddingBottom: hp(2),
    paddingTop: hp(1),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  postOptionsHandle: {
    width: wp(12),
    height: hp(0.5),
    backgroundColor: theme.colors.border || 'rgba(0, 0, 0, 0.2)',
    borderRadius: hp(0.25),
    alignSelf: 'center',
    marginBottom: hp(1.5),
  },
  postOptionsList: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
  },
  postOptionItem: {
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    borderRadius: hp(1),
    marginBottom: hp(0.5),
    backgroundColor: theme.colors.backgroundSecondary || 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postOptionText: {
    fontSize: hp(1.9),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
  },
  postOptionTextDanger: {
    fontSize: hp(1.9),
    color: theme.colors.error || '#FF3B30',
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  postOptionsCancel: {
    marginTop: hp(1),
    marginHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderRadius: hp(1),
    backgroundColor: theme.colors.backgroundSecondary || 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postOptionsCancelText: {
    fontSize: hp(1.9),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
})
