/**
 * ForumPostDetail - Full-screen post detail view
 * Features:
 * - Full-screen layout (not a bottom sheet)
 * - Post content at top with horizontal vote buttons (matching forum)
 * - Vote count between upvote/downvote buttons
 * - Image display if post has media
 * - Comments section with horizontal voting UI
 * - Input bar at bottom with anonymous toggle
 */

import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOrgModal } from '../../contexts/OrgModalContext'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp, wp } from '../../helpers/common'
import { ArrowDownCircle, ArrowUpCircle } from '../Icons'
import ShareModal from '../ShareModal'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const DISMISS_THRESHOLD = 150

// Avatar component matching forum post design - clickable to view profile
const PostAvatar = ({ post, size = hp(4.5), theme, onPress }) => {
    const avatarContent = () => {
        if (post.isAnon) {
            return (
                <LinearGradient
                    colors={['#A855F7', '#9333EA']}
                    style={[styles.postAvatar, { width: size, height: size, borderRadius: size / 2 }]}
                >
                    <Text style={[styles.postAvatarText, { fontSize: size * 0.4 }]}>?</Text>
                </LinearGradient>
            )
        }

        if (post.authorAvatar) {
            return (
                <Image
                    source={{ uri: post.authorAvatar }}
                    style={[styles.postAvatarImage, { width: size, height: size, borderRadius: size / 2 }]}
                />
            )
        }

        return (
            <LinearGradient
                colors={['#6B7280', '#4B5563']}
                style={[styles.postAvatar, { width: size, height: size, borderRadius: size / 2 }]}
            >
                <Text style={[styles.postAvatarText, { fontSize: size * 0.4 }]}>
                    {post.author?.charAt(0)?.toUpperCase() || '?'}
                </Text>
            </LinearGradient>
        )
    }

    // Always wrap in TouchableOpacity if onPress is provided and not anonymous
    // This ensures consistent clickability
    // For org posts, check orgId; for user posts, check userId
    const isClickable = onPress && !post.isAnon && (post.isOrgPost ? post.orgId : post.userId)

    if (isClickable) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ zIndex: 10 }}
            >
                {avatarContent()}
            </TouchableOpacity>
        )
    }

    return avatarContent()
}

// Horizontal vote component matching forum post design
const HorizontalVote = ({
    score,
    userVote,
    onUpvote,
    onDownvote,
    theme,
    size = 'normal' // 'normal' | 'small'
}) => {
    const iconSize = size === 'small' ? hp(2.4) : hp(2.4)
    const fontSize = size === 'small' ? hp(1.5) : hp(1.5)
    const isUpvoted = userVote === 'upvote'
    const isDownvoted = userVote === 'downvote'

    return (
        <View style={styles.horizontalVote}>
            <TouchableOpacity
                onPress={onUpvote}
                style={styles.voteButton}
                activeOpacity={0.7}
            >
                <ArrowUpCircle
                    size={iconSize}
                    color={isUpvoted ? theme.statusColors?.success || '#2ecc71' : theme.colors.textSecondary}
                    strokeWidth={2}
                    fill={isUpvoted ? '#2ecc71' : 'none'}
                />
            </TouchableOpacity>
            <Text style={[
                styles.voteCount,
                { fontSize },
                isUpvoted && { color: theme.colors?.success || '#2ecc71' },
                isDownvoted && { color: theme.colors?.error || '#e74c3c' },
                !userVote && { color: theme.colors.textSecondary }
            ]}>
                {score}
            </Text>
            <TouchableOpacity
                onPress={onDownvote}
                style={styles.voteButton}
                activeOpacity={0.7}
            >
                <ArrowDownCircle
                    size={iconSize}
                    color={isDownvoted ? theme.statusColors?.error || '#e74c3c' : theme.colors.textSecondary}
                    strokeWidth={2}
                    fill={isDownvoted ? '#e74c3c' : 'none'}
                />
            </TouchableOpacity>
        </View>
    )
}

// Comment item component
const CommentItem = ({
    comment,
    userVote,
    onVote,
    theme,
    anonNumber,
    onPressProfile,
    onReply,
    onShare,
    depth = 0,
    parentComment = null
}) => {
    const { openProfile } = useProfileModal()
    const score = (comment.upvotes || 0) - (comment.downvotes || 0)
    const isReply = depth > 0

    return (
        <View style={[
            styles.commentItem,
            {
                borderBottomColor: theme.colors.border,
                marginLeft: isReply ? wp(6) : 0, // Indent replies
                paddingLeft: isReply ? wp(3) : wp(4),
                paddingRight: wp(4),
                borderLeftWidth: isReply ? 2 : 0,
                borderLeftColor: isReply ? theme.colors.border : 'transparent',
            }
        ]}>
            <View style={styles.commentAvatarContainer}>
                <PostAvatar
                    post={{
                        isAnon: comment.isAnon,
                        author: comment.author,
                        authorAvatar: comment.authorAvatar,
                        userId: comment.userId
                    }}
                    size={hp(3.5)}
                    theme={theme}
                    onPress={() => {
                        if (!comment.isAnon && comment.userId) {
                            console.log('👤 Navigating to profile:', comment.userId)
                            router.push(`/profile/${comment.userId}`)
                        }
                    }}
                />
            </View>
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>
                        {comment.isAnon ? 'Anonymous' : comment.author}
                    </Text>
                    <Text style={[styles.commentMeta, { color: theme.colors.textSecondary }]}>
                        {comment.timeAgo}
                    </Text>
                </View>
                {isReply && parentComment && (
                    <View style={styles.replyingToIndicator}>
                        <Text style={[styles.replyingToText, { color: theme.colors.bondedPurple }]}>
                            Replying to {parentComment.isAnon ? 'Anonymous' : parentComment.author}
                        </Text>
                    </View>
                )}
                <Pressable onLongPress={() => onShare?.(comment)} delayLongPress={450}>
                    <Text style={[styles.commentBody, { color: theme.colors.textPrimary }]}>
                        {comment.body}
                    </Text>
                </Pressable>
                <View style={styles.commentActions}>
                    <TouchableOpacity
                        style={styles.commentAction}
                        onPress={() => onReply?.(comment)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>Reply</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.commentVoteContainer}>
                <HorizontalVote
                    score={score}
                    userVote={userVote}
                    onUpvote={() => onVote(comment.id, 'up')}
                    onDownvote={() => onVote(comment.id, 'down')}
                    theme={theme}
                    size="small"
                />
            </View>
        </View>
    )
}

export default function ForumPostDetail({
    post,
    comments = [],
    userVotes = {},
    postUserVote,
    commentSort = 'best',
    onClose,
    onPostVote,
    onCommentVote,
    onAddComment,
    onChangeSort,
    onShare,
    onRepost,
    onPressProfile,
    theme,
    router,
}) {
    const { openProfile } = useProfileModal()
    const { openOrg } = useOrgModal()
    const insets = useSafeAreaInsets()
    const [newComment, setNewComment] = useState('')
    const [isAnon, setIsAnon] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const commentInputRef = useRef(null)
    const [shareContent, setShareContent] = useState(null)
    const [showShareModal, setShowShareModal] = useState(false)


    const score = useMemo(() => {
        return (post?.upvotes || 0) - (post?.downvotes || 0)
    }, [post])

    // Sort only root comments (not replies), then flatten with proper threading
    const sortedRootComments = useMemo(() => {
        // Only get root comments (no parent_id)
        const rootComments = comments.filter(c => !c.parentId)

        if (commentSort === 'new') {
            return [...rootComments].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
                return dateB - dateA
            })
        } else {
            // Best: by score
            return [...rootComments].sort((a, b) => {
                const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
                const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
                return scoreB - scoreA
            })
        }
    }, [comments, commentSort])

    // Flatten comments maintaining thread structure
    const flattenedComments = useMemo(() => {
        const flat = []
        const processComment = (comment, depth = 0, parentComment = null) => {
            flat.push({
                ...comment,
                depth,
                parentComment, // Store parent for "replying to" display
            })
            // Sort replies by score or time, then add them
            if (comment.replies && comment.replies.length > 0) {
                const sortedReplies = [...comment.replies].sort((a, b) => {
                    if (commentSort === 'new') {
                        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
                        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
                        return dateB - dateA
                    } else {
                        const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
                        const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
                        return scoreB - scoreA
                    }
                })
                sortedReplies.forEach((reply) => {
                    processComment(reply, depth + 1, comment)
                })
            }
        }
        sortedRootComments.forEach((comment) => {
            processComment(comment)
        })
        return flat
    }, [sortedRootComments, commentSort])

    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onAddComment(post.id, newComment.trim(), isAnon, replyingTo?.id)
            setNewComment('')
            setReplyingTo(null)
        } catch (e) {
            console.error('Failed to submit comment:', e)
        }
        setIsSubmitting(false)
    }, [newComment, isAnon, isSubmitting, onAddComment, post?.id, replyingTo])

    const handleReply = useCallback((comment) => {
        setReplyingTo(comment)
        // Focus the input after a short delay to ensure UI is updated
        setTimeout(() => {
            commentInputRef.current?.focus()
        }, 100)
    }, [])

    if (!post) return null

    return (
        <View style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <FlatList
                    data={flattenedComments}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={() => (
                        <>
                            {/* Header - Scrolls with content */}
                            <View style={[styles.header, {
                                paddingTop: Math.max(insets.top, hp(1)),
                                paddingBottom: hp(1.5),
                            }]}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={[styles.backButton, {
                                        padding: hp(1),
                                        minWidth: hp(5),
                                        minHeight: hp(5),
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }]}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chevron-back" size={hp(2.8)} color={theme.colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            {/* Post Content - Matching forum post card design */}
                            <View style={[styles.postCard, {
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius?.lg || 12,
                                borderWidth: StyleSheet.hairlineWidth,
                                borderColor: theme.colors.border,
                                marginHorizontal: wp(4),
                                marginBottom: hp(2),
                                paddingVertical: hp(1.8),
                                paddingHorizontal: wp(4),
                            }]}>
                                {/* Header - matching forum post */}
                                <View style={styles.postHeader}>
                                    <View style={styles.postAuthorRow}>
                                        <PostAvatar
                                            post={post}
                                            size={hp(4.5)}
                                            theme={theme}
                                            onPress={() => {
                                                if (!post.isAnon) {
                                                    if (post.isOrgPost && post.orgId) {
                                                        openOrg(post.orgId)
                                                    } else if (post.userId) {
                                                        openProfile(post.userId)
                                                    }
                                                }
                                            }}
                                        />
                                        <TouchableOpacity
                                            style={styles.postAuthorInfo}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                if (!post.isAnon) {
                                                    if (post.isOrgPost && post.orgId) {
                                                        console.log('🏢 Opening org modal:', post.orgId)
                                                        openOrg(post.orgId)
                                                    } else if (post.userId) {
                                                        console.log('👤 Navigating to main post author profile:', post.userId)
                                                        router.push(`/profile/${post.userId}`)
                                                    }
                                                }
                                            }}
                                            disabled={post.isAnon}
                                        >
                                            <Text style={[styles.postAuthorName, {
                                                fontSize: hp(1.7),
                                                color: theme.colors.textPrimary,
                                                fontFamily: theme.typography?.fontFamily?.heading,
                                                fontWeight: '600',
                                            }]}>
                                                {post.isAnon ? 'Anonymous' : post.author}
                                            </Text>
                                            <Text style={[styles.postMetaText, {
                                                fontSize: hp(1.3),
                                                color: theme.colors.textSecondary,
                                                fontFamily: theme.typography?.fontFamily?.body,
                                                marginTop: hp(0.1),
                                                fontWeight: '400',
                                            }]}>
                                                {post.forum || post.location || ''} • {post.timeAgo}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Post body - matching forum post */}
                                <View style={styles.postBody}>
                                    {post.title && (
                                        <Text style={[styles.postTitle, {
                                            fontSize: hp(2),
                                            fontWeight: '700',
                                            color: theme.colors.textPrimary,
                                            fontFamily: theme.typography?.fontFamily?.heading,
                                            marginBottom: hp(0.6),
                                            lineHeight: hp(2.6),
                                        }]}>
                                            {post.title}
                                        </Text>
                                    )}
                                    <Text style={[styles.postBodyText, {
                                        fontSize: hp(1.6),
                                        color: theme.colors.textPrimary,
                                        fontFamily: theme.typography?.fontFamily?.body,
                                        lineHeight: hp(2.2),
                                        marginTop: hp(0.2),
                                    }]}>
                                        {post.body}
                                    </Text>

                                    {/* Post image if present - matching forum post */}
                                    {post.media && post.media.length > 0 && (
                                        <View style={[styles.postMediaPreview, {
                                            marginTop: hp(1),
                                            borderRadius: theme.radius?.md || 8,
                                            overflow: 'hidden',
                                            backgroundColor: theme.colors.border,
                                        }]}>
                                            <Image
                                                source={{ uri: post.media[0].uri || post.media[0] }}
                                                style={[styles.postMediaImage, {
                                                    width: '100%',
                                                    aspectRatio: 16 / 9,
                                                    maxHeight: hp(25),
                                                    resizeMode: 'cover',
                                                }]}
                                            />
                                        </View>
                                    )}
                                </View>

                            </View>

                            {/* Action bar - Horizontal voting like forum */}
                            <View style={[styles.actionBar, {
                                borderTopColor: theme.colors.border,
                                borderBottomColor: theme.colors.border,
                                marginTop: hp(1),
                                paddingTop: hp(1),
                            }]}>
                                <View style={styles.postVotesRow}>
                                    <HorizontalVote
                                        score={score}
                                        userVote={postUserVote}
                                        onUpvote={() => onPostVote(post.id, 'upvote')}
                                        onDownvote={() => onPostVote(post.id, 'downvote')}
                                        theme={theme}
                                    />
                                </View>

                                <View style={styles.actionButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            console.log('🔍 ForumPostDetail post object:', post)
                                            console.log('🔍 Setting shareContent:', { type: 'post', data: post })
                                            setShareContent({ type: 'post', data: post })
                                            setShowShareModal(true)
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="share-outline" size={hp(2)} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="chatbubble-outline" size={hp(2)} color={theme.colors.textSecondary} />
                                        {post.commentsCount > 0 && (
                                            <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                                                {post.commentsCount}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Comments header */}
                            <View style={[styles.commentsHeader, { borderBottomColor: theme.colors.border }]}>
                                <TouchableOpacity style={styles.sortSelector} onPress={() => onChangeSort?.(commentSort === 'best' ? 'new' : 'best')}>
                                    <Text style={[styles.sortText, { color: theme.colors.textPrimary }]}>
                                        {commentSort === 'best' ? 'Top comments' : 'New comments'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={hp(1.8)} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                    renderItem={({ item, index }) => {
                        // Find parent comment ID for voting
                        const findParentId = (commentId) => {
                            if (item.parentComment) {
                                return item.parentComment.id
                            }
                            return null
                        }

                        return (
                            <CommentItem
                                comment={item}
                                userVote={userVotes[item.id]}
                                onVote={(commentId, direction) => {
                                    const parentId = findParentId(commentId)
                                    onCommentVote(commentId, parentId, direction)
                                }}
                                theme={theme}
                                anonNumber={index + 1}
                                onPressProfile={onPressProfile}
                                onReply={handleReply}
                                onShare={(comment) => {
                                    setShareContent({
                                        type: 'comment',
                                        data: {
                                            id: comment.id,
                                            postId: post.id,
                                            forumId: post.forumId || post.forum_id,
                                            body: comment.body,
                                            postTitle: post.title || 'Forum Post',
                                        },
                                    })
                                    setShowShareModal(true)
                                }}
                                depth={item.depth || 0}
                                parentComment={item.parentComment || null}
                            />
                        )
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                No comments yet. Be the first to comment!
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.commentsList}
                    showsVerticalScrollIndicator={false}
                />

                {/* Input bar at bottom */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={[styles.inputBar, {
                        borderTopColor: theme.colors.border,
                        paddingBottom: Math.max(insets.bottom, hp(2)),
                        paddingTop: hp(1.5),
                    }]}>
                        {replyingTo && (
                            <View style={[styles.replyingToBanner, {
                                backgroundColor: theme.colors.backgroundSecondary,
                                marginBottom: hp(1),
                                paddingHorizontal: wp(4),
                                paddingVertical: hp(0.8),
                                borderRadius: hp(1),
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }]}>
                                <Text style={[styles.replyingToText, {
                                    color: theme.colors.textSecondary,
                                    fontSize: hp(1.4),
                                }]}>
                                    Replying to {replyingTo.isAnon ? 'Anonymous' : replyingTo.author}
                                </Text>
                                <TouchableOpacity onPress={() => setReplyingTo(null)} activeOpacity={0.7}>
                                    <Ionicons name="close" size={hp(2)} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.inputRow}>
                            <TextInput
                                ref={commentInputRef}
                                style={[styles.input, {
                                    color: theme.colors.textPrimary,
                                    backgroundColor: theme.colors.backgroundSecondary,
                                    paddingHorizontal: wp(4),
                                    paddingVertical: hp(1.2),
                                    borderRadius: hp(2.5),
                                    fontSize: hp(1.6),
                                    maxHeight: hp(12),
                                    flex: 1,
                                }]}
                                placeholder={replyingTo ? `Reply to ${replyingTo.isAnon ? 'Anonymous' : replyingTo.author}...` : "Add a comment..."}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                maxLength={500}
                            />
                            <View style={styles.inputActions}>
                                {/* Anonymous toggle */}
                                <TouchableOpacity
                                    style={[styles.anonToggle, {
                                        backgroundColor: isAnon ? theme.colors.bondedPurple + '20' : theme.colors.backgroundSecondary,
                                        borderColor: isAnon ? theme.colors.bondedPurple : theme.colors.border,
                                    }]}
                                    onPress={() => setIsAnon(!isAnon)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.anonToggleText, {
                                        color: isAnon ? theme.colors.bondedPurple : theme.colors.textSecondary,
                                        fontWeight: isAnon ? '700' : '600',
                                    }]}>
                                        {isAnon ? 'ANON' : 'PUBLIC'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.inputAction}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="image-outline" size={hp(2.4)} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {newComment.trim().length > 0 && (
                                <TouchableOpacity
                                    style={[styles.sendButton, {
                                        backgroundColor: theme.colors.bondedPurple,
                                        width: hp(4),
                                        height: hp(4),
                                        borderRadius: hp(2),
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginLeft: wp(2),
                                    }]}
                                    onPress={handleSubmitComment}
                                    disabled={isSubmitting}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="send" size={hp(2)} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <ShareModal
                visible={showShareModal}
                content={shareContent}
                presentationStyle="overFullScreen"
                onClose={() => {
                    setShowShareModal(false)
                    setShareContent(null)
                }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(4),
        backgroundColor: 'transparent',
    },
    backButton: {
        // Dynamic padding handled inline
    },
    postCard: {
        position: 'relative',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: hp(1.2),
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: wp(2),
    },
    postAvatar: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: wp(2.5),
    },
    postAvatarImage: {
        marginRight: wp(2.5),
    },
    postAvatarText: {
        color: '#fff',
        fontFamily: 'System',
        fontWeight: '700',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorName: {
        // Styled inline with theme
    },
    postMetaText: {
        // Styled inline with theme
    },
    postBody: {
        marginBottom: hp(1),
    },
    postTitle: {
        // Styled inline with theme
    },
    postBodyText: {
        // Styled inline with theme
    },
    postMediaPreview: {
        // Styled inline with theme
    },
    postMediaImage: {
        // Styled inline with theme
    },
    horizontalVote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
    },
    voteButton: {
        padding: hp(0.5),
        borderRadius: 9999,
    },
    voteCount: {
        fontSize: hp(1.5),
        fontWeight: '600',
        minWidth: wp(5),
        textAlign: 'center',
        fontFamily: 'System',
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginHorizontal: wp(4),
    },
    postVotesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(4),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        padding: hp(0.5),
        borderRadius: 9999,
    },
    actionCount: {
        fontSize: hp(1.4),
        fontWeight: '500',
        fontFamily: 'System',
    },
    commentsHeader: {
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sortSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    sortText: {
        fontSize: hp(1.6),
        fontWeight: '500',
    },
    commentsList: {
        paddingBottom: hp(10),
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'flex-start',
        gap: wp(2),
    },
    commentAvatarContainer: {
        marginRight: wp(2),
        // Don't block touch events
        pointerEvents: 'box-none',
    },
    commentContent: {
        flex: 1,
        minWidth: 0, // Allow flex to shrink below content size
    },
    commentVoteContainer: {
        marginLeft: wp(1),
        justifyContent: 'flex-start',
        paddingTop: hp(0.2), // Align with comment header
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: hp(0.3),
    },
    commentAuthor: {
        fontSize: hp(1.4),
        fontWeight: '600',
        marginRight: wp(2),
    },
    commentMeta: {
        fontSize: hp(1.3),
    },
    commentBody: {
        fontSize: hp(1.5),
        lineHeight: hp(2.1),
        marginBottom: hp(1),
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(4),
    },
    commentAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    commentActionText: {
        fontSize: hp(1.3),
        fontWeight: '500',
    },
    emptyComments: {
        padding: wp(8),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: hp(1.6),
        textAlign: 'center',
    },
    inputBar: {
        paddingHorizontal: wp(4),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: wp(2),
    },
    input: {
        flex: 1,
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.2),
        borderRadius: hp(2.5),
        fontSize: hp(1.6),
        maxHeight: hp(12),
    },
    inputActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    inputAction: {
        padding: wp(1),
    },
    anonToggle: {
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.6),
        borderRadius: hp(1.5),
        borderWidth: 1.5,
    },
    anonToggleText: {
        fontSize: hp(1.3),
        fontFamily: 'System',
    },
    sendButton: {
        // Styled inline
    },
})
