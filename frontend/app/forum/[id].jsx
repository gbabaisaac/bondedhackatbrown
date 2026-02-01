/**
 * SharedPostScreen - Full page view for shared post links
 * This is shown when someone shares a post[id] link
 * Shows post + comments on one page (NOT a modal)
 */

import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeft, MoreHorizontal, Share2 } from '../../components/Icons'
import ShareModal from '../../components/ShareModal'
import { useOrgModal } from '../../contexts/OrgModalContext'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp, wp } from '../../helpers/common'
import { resolveMediaUrls } from '../../helpers/mediaStorage'
import { useComments } from '../../hooks/useComments'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useAppTheme } from '../theme'

// Avatar component
const PostAvatar = ({ post, size = hp(4.5), theme, onPress }) => {
    const content = () => {
        if (post.isAnon) {
            return (
                <LinearGradient
                    colors={['#A855F7', '#9333EA']}
                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
                >
                    <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>?</Text>
                </LinearGradient>
            )
        }

        if (post.authorAvatar) {
            return (
                <Image
                    source={{ uri: post.authorAvatar }}
                    style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
                />
            )
        }

        return (
            <LinearGradient
                colors={['#6B7280', '#4B5563']}
                style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
            >
                <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
                    {post.author?.charAt(0)?.toUpperCase() || '?'}
                </Text>
            </LinearGradient>
        )
    }

    const isClickable = onPress && !post.isAnon && (post.isOrgPost ? post.orgId : post.userId)

    if (isClickable) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content()}
            </TouchableOpacity>
        )
    }

    return content()
}

// Horizontal vote component
const HorizontalVote = ({ score, userVote, onUpvote, onDownvote, theme, size = 'normal' }) => {
    const iconSize = size === 'small' ? hp(2) : hp(2.4)
    const fontSize = size === 'small' ? hp(1.4) : hp(1.5)
    const isUpvoted = userVote === 'upvote' || userVote === 'up'
    const isDownvoted = userVote === 'downvote' || userVote === 'down'

    return (
        <View style={styles.horizontalVote}>
            <TouchableOpacity onPress={onUpvote} style={styles.voteButton} activeOpacity={0.7}>
                <ArrowUpCircle
                    size={iconSize}
                    color={isUpvoted ? '#2ecc71' : theme.colors.textSecondary}
                    strokeWidth={2}
                    fill={isUpvoted ? '#2ecc71' : 'none'}
                />
            </TouchableOpacity>
            <Text style={[
                styles.voteCount,
                { fontSize },
                isUpvoted && { color: '#2ecc71' },
                isDownvoted && { color: '#e74c3c' },
                !userVote && { color: theme.colors.textSecondary }
            ]}>
                {score}
            </Text>
            <TouchableOpacity onPress={onDownvote} style={styles.voteButton} activeOpacity={0.7}>
                <ArrowDownCircle
                    size={iconSize}
                    color={isDownvoted ? '#e74c3c' : theme.colors.textSecondary}
                    strokeWidth={2}
                    fill={isDownvoted ? '#e74c3c' : 'none'}
                />
            </TouchableOpacity>
        </View>
    )
}

// Comment item
const CommentItem = ({ comment, userVote, onVote, theme, onReply, depth = 0, parentComment = null }) => {
    const { openProfile } = useProfileModal()
    const score = (comment.upvotes || 0) - (comment.downvotes || 0)
    const isReply = depth > 0

    return (
        <View style={[
            styles.commentItem,
            {
                borderBottomColor: theme.colors.border,
                marginLeft: isReply ? wp(8) : 0,
                paddingLeft: isReply ? wp(3) : wp(4),
                borderLeftWidth: isReply ? 2 : 0,
                borderLeftColor: isReply ? theme.colors.border : 'transparent',
            }
        ]}>
            <PostAvatar
                post={{
                    isAnon: comment.isAnon,
                    author: comment.author,
                    authorAvatar: comment.authorAvatar,
                    userId: comment.userId,
                }}
                size={hp(3.5)}
                theme={theme}
                onPress={() => {
                    if (!comment.isAnon && comment.userId) {
                        openProfile(comment.userId)
                    }
                }}
            />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>
                        {comment.isAnon ? 'Anonymous' : comment.author}
                    </Text>
                    <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>
                        {comment.timeAgo}
                    </Text>
                </View>
                {isReply && parentComment && (
                    <Text style={[styles.replyingTo, { color: theme.colors.bondedPurple }]}>
                        Replying to {parentComment.isAnon ? 'Anonymous' : parentComment.author}
                    </Text>
                )}
                <Text style={[styles.commentBody, { color: theme.colors.textPrimary }]}>
                    {comment.body}
                </Text>
                <View style={styles.commentActions}>
                    <HorizontalVote
                        score={score}
                        userVote={userVote}
                        onUpvote={() => onVote(comment.id, 'up')}
                        onDownvote={() => onVote(comment.id, 'down')}
                        theme={theme}
                        size="small"
                    />
                    <TouchableOpacity
                        style={styles.replyButton}
                        onPress={() => onReply?.(comment)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.replyButtonText, { color: theme.colors.textSecondary }]}>
                            Reply
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

// Helper to format time
const getTimeAgo = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
}

export default function SharedPostScreen() {
    const params = useLocalSearchParams()
    const router = useRouter()
    const theme = useAppTheme()
    const insets = useSafeAreaInsets()
    const { user } = useAuthStore()
    const { openProfile } = useProfileModal()
    const { openOrg } = useOrgModal()
    const commentInputRef = useRef(null)

    const postId = params.post || params.postId || params.id
    const forumId = params.forumId

    // State
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [newComment, setNewComment] = useState('')
    const [isAnon, setIsAnon] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const [commentSort, setCommentSort] = useState('best')
    const [userVotes, setUserVotes] = useState({})
    const [postUserVote, setPostUserVote] = useState(null)
    const [shareContent, setShareContent] = useState(null)
    const [showShareModal, setShowShareModal] = useState(false)

    // Fetch comments
    const {
        data: comments = [],
        refetch: refetchComments,
    } = useComments(postId)

    // Fetch the post directly
    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) {
                setError('Post not found')
                setLoading(false)
                return
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('posts')
                    .select(`
                        *,
                        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, email),
                        organization:organizations(id, name, logo_url),
                        forum:forums(id, name, type)
                    `)
                    .eq('id', postId)
                    .single()

                if (fetchError) {
                    console.error('Error fetching post:', fetchError)
                    setError('Post not found')
                    setLoading(false)
                    return
                }

                // Transform post data
                const resolvedMedia = await resolveMediaUrls(data.media_urls || [])
                const isOrgPost = !!data.org_id && !!data.organization
                const author = isOrgPost
                    ? data.organization.name
                    : data.is_anonymous
                        ? 'Anonymous'
                        : (data.author?.username || data.author?.full_name || data.author?.email?.split('@')[0] || 'User')
                const authorAvatar = isOrgPost
                    ? data.organization.logo_url
                    : data.author?.avatar_url || null

                setPost({
                    id: data.id,
                    author,
                    isAnon: data.is_anonymous || false,
                    isOrgPost,
                    orgId: data.org_id || null,
                    title: data.title,
                    body: data.body,
                    forum: data.forum?.name || 'Forum',
                    forumId: data.forum_id,
                    upvotes: data.upvotes_count || 0,
                    downvotes: data.downvotes_count || 0,
                    score: (data.upvotes_count || 0) - (data.downvotes_count || 0),
                    commentsCount: data.comments_count || 0,
                    repostsCount: data.reposts_count || 0,
                    timeAgo: getTimeAgo(data.created_at),
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    media: resolvedMedia.map((url) => ({ uri: url, type: 'image' })),
                    createdAt: data.created_at,
                    userId: data.user_id,
                    authorAvatar,
                })
                setLoading(false)
            } catch (err) {
                console.error('Error:', err)
                setError('Failed to load post')
                setLoading(false)
            }
        }

        fetchPost()
    }, [postId])

    // Sort comments
    const sortedComments = useMemo(() => {
        const rootComments = comments.filter(c => !c.parentId)
        
        if (commentSort === 'new') {
            return [...rootComments].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
                return dateB - dateA
            })
        }
        
        return [...rootComments].sort((a, b) => {
            const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
            const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
            return scoreB - scoreA
        })
    }, [comments, commentSort])

    // Flatten with replies
    const flattenedComments = useMemo(() => {
        const flat = []
        const processComment = (comment, depth = 0, parentComment = null) => {
            flat.push({ ...comment, depth, parentComment })
            if (comment.replies?.length > 0) {
                const sortedReplies = [...comment.replies].sort((a, b) => {
                    const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
                    const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
                    return scoreB - scoreA
                })
                sortedReplies.forEach(reply => processComment(reply, depth + 1, comment))
            }
        }
        sortedComments.forEach(comment => processComment(comment))
        return flat
    }, [sortedComments])

    const handleCommentVote = async (commentId, parentId, direction) => {
        if (!user?.id) {
            Alert.alert('Sign in required', 'Please sign in to vote.')
            return
        }
        const voteKey = commentId
        const currentVote = userVotes[voteKey]
        const newVote = currentVote === direction ? null : direction
        setUserVotes((prev) => ({ ...prev, [voteKey]: newVote }))
        // TODO: Implement actual vote API call
    }

    const handlePostVote = async (direction) => {
        if (!user?.id) {
            Alert.alert('Sign in required', 'Please sign in to vote.')
            return
        }
        const newVote = postUserVote === direction ? null : direction
        setPostUserVote(newVote)
        // TODO: Implement actual vote API call
    }

    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || isSubmitting || !user?.id) {
            if (!user?.id) {
                Alert.alert('Sign in required', 'Please sign in to comment.')
            }
            return
        }
        setIsSubmitting(true)
        try {
            const { error: insertError } = await supabase
                .from('forum_comments')
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    body: newComment.trim(),
                    is_anonymous: isAnon,
                    parent_id: replyingTo?.id || null,
                })

            if (insertError) throw insertError
            
            setNewComment('')
            setReplyingTo(null)
            await refetchComments()
        } catch (e) {
            console.error('Failed to submit comment:', e)
            Alert.alert('Error', 'Failed to post comment. Please try again.')
        }
        setIsSubmitting(false)
    }, [newComment, isAnon, isSubmitting, postId, user?.id, replyingTo, refetchComments])

    const handleReply = useCallback((comment) => {
        setReplyingTo(comment)
        setTimeout(() => commentInputRef.current?.focus(), 100)
    }, [])

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                        Loading post...
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    // Error state
    if (error || !post) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={hp(6)} color={theme.colors.textSecondary} />
                    <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
                        {error || 'Post not found'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: theme.colors.bondedPurple }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const postScore = post.upvotes - post.downvotes

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={hp(2.4)} color={theme.colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Post</Text>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                        setShareContent({ type: 'post', data: post })
                        setShowShareModal(true)
                    }}
                    activeOpacity={0.7}
                >
                    <Share2 size={hp(2.2)} color={theme.colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <FlatList
                data={flattenedComments}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={() => (
                    <>
                        {/* Post Card */}
                        <View style={[styles.postCard, {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                        }]}>
                            {/* Author Row */}
                            <View style={styles.postHeader}>
                                <PostAvatar
                                    post={post}
                                    size={hp(5)}
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
                                                openOrg(post.orgId)
                                            } else if (post.userId) {
                                                openProfile(post.userId)
                                            }
                                        }
                                    }}
                                    disabled={post.isAnon}
                                >
                                    <Text style={[styles.postAuthorName, { color: theme.colors.textPrimary }]}>
                                        {post.author}
                                    </Text>
                                    <Text style={[styles.postMeta, { color: theme.colors.textSecondary }]}>
                                        {post.forum} • {post.timeAgo}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Post Content */}
                            {post.title && (
                                <Text style={[styles.postTitle, { color: theme.colors.textPrimary }]}>
                                    {post.title}
                                </Text>
                            )}
                            <Text style={[styles.postBody, { color: theme.colors.textPrimary }]}>
                                {post.body}
                            </Text>

                            {/* Media */}
                            {post.media && post.media.length > 0 && (
                                <View style={[styles.mediaContainer, { borderRadius: theme.radius?.md || 12 }]}>
                                    <Image
                                        source={{ uri: post.media[0].uri }}
                                        style={styles.mediaImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            {/* Actions */}
                            <View style={[styles.postActions, { borderTopColor: theme.colors.border }]}>
                                <HorizontalVote
                                    score={postScore}
                                    userVote={postUserVote}
                                    onUpvote={() => handlePostVote('upvote')}
                                    onDownvote={() => handlePostVote('downvote')}
                                    theme={theme}
                                />
                                <View style={styles.actionButtons}>
                                    <View style={styles.actionItem}>
                                        <Ionicons name="chatbubble-outline" size={hp(2)} color={theme.colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
                                            {post.commentsCount || flattenedComments.length}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Comments Header */}
                        <View style={[styles.commentsHeader, { borderBottomColor: theme.colors.border }]}>
                            <Text style={[styles.commentsTitle, { color: theme.colors.textPrimary }]}>
                                Comments ({flattenedComments.length})
                            </Text>
                            <TouchableOpacity
                                style={styles.sortButton}
                                onPress={() => setCommentSort(commentSort === 'best' ? 'new' : 'best')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>
                                    {commentSort === 'best' ? 'Top' : 'New'}
                                </Text>
                                <Ionicons name="chevron-down" size={hp(1.6)} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                renderItem={({ item }) => (
                    <CommentItem
                        comment={item}
                        userVote={userVotes[item.id]}
                        onVote={(commentId, direction) => {
                            handleCommentVote(commentId, item.parentComment?.id || null, direction)
                        }}
                        theme={theme}
                        onReply={handleReply}
                        depth={item.depth || 0}
                        parentComment={item.parentComment}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-outline" size={hp(5)} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No comments yet. Be the first!
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Comment Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[styles.inputBar, {
                    borderTopColor: theme.colors.border,
                    paddingBottom: Math.max(insets.bottom, hp(1.5)),
                }]}>
                    {replyingTo && (
                        <View style={[styles.replyingToBanner, { backgroundColor: theme.colors.backgroundSecondary }]}>
                            <Text style={[styles.replyingToText, { color: theme.colors.textSecondary }]}>
                                Replying to {replyingTo.isAnon ? 'Anonymous' : replyingTo.author}
                            </Text>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close" size={hp(1.8)} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TextInput
                            ref={commentInputRef}
                            style={[styles.input, {
                                color: theme.colors.textPrimary,
                                backgroundColor: theme.colors.backgroundSecondary,
                            }]}
                            placeholder={replyingTo ? `Reply to ${replyingTo.isAnon ? 'Anonymous' : replyingTo.author}...` : "Add a comment..."}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                        />
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
                            }]}>
                                {isAnon ? 'ANON' : 'PUBLIC'}
                            </Text>
                        </TouchableOpacity>
                        {newComment.trim().length > 0 && (
                            <TouchableOpacity
                                style={[styles.sendButton, { backgroundColor: theme.colors.bondedPurple }]}
                                onPress={handleSubmitComment}
                                disabled={isSubmitting}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="send" size={hp(1.8)} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            <ShareModal
                visible={showShareModal}
                content={shareContent}
                presentationStyle="overFullScreen"
                onClose={() => {
                    setShowShareModal(false)
                    setShareContent(null)
                }}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: hp(2),
    },
    loadingText: {
        fontSize: hp(1.6),
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: wp(8),
        gap: hp(2),
    },
    errorText: {
        fontSize: hp(1.8),
        textAlign: 'center',
    },
    backButton: {
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(6),
        borderRadius: hp(2.5),
        marginTop: hp(2),
    },
    backButtonText: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        width: hp(4),
        height: hp(4),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: hp(2),
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: hp(2),
    },
    postCard: {
        marginHorizontal: wp(4),
        marginTop: hp(2),
        padding: wp(4),
        borderRadius: hp(1.5),
        borderWidth: StyleSheet.hairlineWidth,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(1.5),
        gap: wp(3),
    },
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {},
    avatarText: {
        color: '#fff',
        fontWeight: '700',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorName: {
        fontSize: hp(1.7),
        fontWeight: '600',
    },
    postMeta: {
        fontSize: hp(1.4),
        marginTop: hp(0.2),
    },
    postTitle: {
        fontSize: hp(2),
        fontWeight: '700',
        marginBottom: hp(0.8),
        lineHeight: hp(2.6),
    },
    postBody: {
        fontSize: hp(1.6),
        lineHeight: hp(2.3),
        marginBottom: hp(1.5),
    },
    mediaContainer: {
        marginBottom: hp(1.5),
        overflow: 'hidden',
    },
    mediaImage: {
        width: '100%',
        aspectRatio: 16 / 9,
        maxHeight: hp(30),
    },
    postActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: hp(1.5),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    horizontalVote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
    },
    voteButton: {
        padding: hp(0.4),
    },
    voteCount: {
        fontWeight: '600',
        minWidth: wp(5),
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(4),
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    actionText: {
        fontSize: hp(1.4),
    },
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        marginTop: hp(1),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentsTitle: {
        fontSize: hp(1.8),
        fontWeight: '700',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    sortText: {
        fontSize: hp(1.5),
        fontWeight: '500',
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: hp(1.5),
        paddingRight: wp(4),
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: wp(2.5),
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginBottom: hp(0.3),
    },
    commentAuthor: {
        fontSize: hp(1.5),
        fontWeight: '600',
    },
    commentTime: {
        fontSize: hp(1.3),
    },
    replyingTo: {
        fontSize: hp(1.3),
        marginBottom: hp(0.3),
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
    replyButton: {
        paddingVertical: hp(0.5),
    },
    replyButtonText: {
        fontSize: hp(1.4),
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: hp(6),
        gap: hp(2),
    },
    emptyText: {
        fontSize: hp(1.6),
        textAlign: 'center',
    },
    inputBar: {
        paddingHorizontal: wp(4),
        paddingTop: hp(1.5),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    replyingToBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        borderRadius: hp(1),
        marginBottom: hp(1),
    },
    replyingToText: {
        fontSize: hp(1.4),
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: wp(2),
    },
    input: {
        flex: 1,
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        borderRadius: hp(2),
        fontSize: hp(1.5),
        maxHeight: hp(10),
    },
    anonToggle: {
        paddingHorizontal: wp(2.5),
        paddingVertical: hp(0.6),
        borderRadius: hp(1.5),
        borderWidth: 1.5,
    },
    anonToggleText: {
        fontSize: hp(1.2),
        fontWeight: '700',
    },
    sendButton: {
        width: hp(3.5),
        height: hp(3.5),
        borderRadius: hp(1.75),
        alignItems: 'center',
        justifyContent: 'center',
    },
})
