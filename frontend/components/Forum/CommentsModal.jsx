/**
 * CommentsModal - Instagram/LinkedIn style comments bottom sheet
 * Used when clicking comments from the feed
 * Swipe down to dismiss, modal presentation
 */

import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp, wp } from '../../helpers/common'
import { ArrowDownCircle, ArrowUpCircle } from '../Icons'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75
const DISMISS_THRESHOLD = 100

// Avatar component
const CommentAvatar = ({ comment, size = hp(3.5), theme, onPress }) => {
    const content = () => {
        if (comment.isAnon) {
            return (
                <LinearGradient
                    colors={['#A855F7', '#9333EA']}
                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
                >
                    <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>?</Text>
                </LinearGradient>
            )
        }

        if (comment.authorAvatar) {
            return (
                <Image
                    source={{ uri: comment.authorAvatar }}
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
                    {comment.author?.charAt(0)?.toUpperCase() || '?'}
                </Text>
            </LinearGradient>
        )
    }

    const isClickable = onPress && !comment.isAnon && comment.userId

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
const HorizontalVote = ({ score, userVote, onUpvote, onDownvote, theme }) => {
    const iconSize = hp(2)
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
            <CommentAvatar
                comment={comment}
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

export default function CommentsModal({
    visible,
    post,
    comments = [],
    userVotes = {},
    commentSort = 'best',
    onClose,
    onCommentVote,
    onAddComment,
    onChangeSort,
    theme,
}) {
    const insets = useSafeAreaInsets()
    const [newComment, setNewComment] = useState('')
    const [isAnon, setIsAnon] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const commentInputRef = useRef(null)
    const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current

    // Pan responder for swipe to dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                translateY.setValue(gestureState.dy)
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
                Animated.timing(translateY, {
                    toValue: MODAL_HEIGHT,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => onClose?.())
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 12,
                }).start()
            }
        },
    }), [onClose])

    // Animate in when visible
    useEffect(() => {
        if (visible) {
            translateY.setValue(MODAL_HEIGHT)
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start()
        }
    }, [visible])

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

    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onAddComment?.(post?.id, newComment.trim(), isAnon, replyingTo?.id)
            setNewComment('')
            setReplyingTo(null)
        } catch (e) {
            console.error('Failed to submit comment:', e)
        }
        setIsSubmitting(false)
    }, [newComment, isAnon, isSubmitting, onAddComment, post?.id, replyingTo])

    const handleReply = useCallback((comment) => {
        setReplyingTo(comment)
        setTimeout(() => commentInputRef.current?.focus(), 100)
    }, [])

    const handleClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
        }).start(() => onClose?.())
    }, [onClose])

    if (!visible) return null

    const backdropOpacity = translateY.interpolate({
        inputRange: [0, MODAL_HEIGHT],
        outputRange: [0.5, 0],
        extrapolate: 'clamp',
    })

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Modal content */}
                <Animated.View
                    style={[
                        styles.modal,
                        {
                            backgroundColor: theme.colors.background,
                            transform: [{ translateY }],
                            height: MODAL_HEIGHT,
                            paddingBottom: insets.bottom,
                        }
                    ]}
                >
                    {/* Handle */}
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                            Comments
                        </Text>
                        <TouchableOpacity
                            style={styles.sortButton}
                            onPress={() => onChangeSort?.(commentSort === 'best' ? 'new' : 'best')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>
                                {commentSort === 'best' ? 'Top' : 'New'}
                            </Text>
                            <Ionicons name="chevron-down" size={hp(1.6)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Comments list */}
                    <FlatList
                        data={flattenedComments}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <CommentItem
                                comment={item}
                                userVote={userVotes[item.id]}
                                onVote={(commentId, direction) => {
                                    onCommentVote?.(commentId, item.parentComment?.id || null, direction)
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

                    {/* Input bar */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    >
                        <View style={[styles.inputBar, { borderTopColor: theme.colors.border }]}>
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
                </Animated.View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    modal: {
        borderTopLeftRadius: hp(2),
        borderTopRightRadius: hp(2),
        overflow: 'hidden',
    },
    handleArea: {
        alignItems: 'center',
        paddingVertical: hp(1.5),
    },
    handle: {
        width: wp(10),
        height: hp(0.5),
        borderRadius: hp(0.25),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingBottom: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: hp(2),
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
    listContent: {
        paddingBottom: hp(2),
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: hp(1.5),
        paddingRight: wp(4),
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: wp(2.5),
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
    horizontalVote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    voteButton: {
        padding: hp(0.3),
    },
    voteCount: {
        fontSize: hp(1.4),
        fontWeight: '600',
        minWidth: wp(4),
        textAlign: 'center',
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
        paddingVertical: hp(8),
        gap: hp(2),
    },
    emptyText: {
        fontSize: hp(1.6),
        textAlign: 'center',
    },
    inputBar: {
        paddingHorizontal: wp(4),
        paddingTop: hp(1.5),
        paddingBottom: hp(1),
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
