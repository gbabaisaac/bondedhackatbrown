/**
 * ForumPostDetail - Full-screen post detail view
 * Features:
 * - Full-screen layout (not a bottom sheet)
 * - Post content at top with vertical vote arrows on right
 * - Vote count in purple between arrows
 * - Image display if post has media
 * - Comments section with same voting UI
 * - Input bar at bottom with GIF/Image options
 */

import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useMemo, useState } from 'react'
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { hp, wp } from '../../helpers/common'

// Avatar component matching forum post design
const PostAvatar = ({ post, size = hp(4.5), theme }) => {
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

// Vertical vote component (up arrow, count, down arrow)
const VerticalVote = ({
    score,
    userVote,
    onUpvote,
    onDownvote,
    theme,
    size = 'normal' // 'normal' | 'small'
}) => {
    const iconSize = size === 'small' ? hp(2) : hp(2.8)
    const fontSize = size === 'small' ? hp(1.6) : hp(2)

    return (
        <View style={styles.verticalVote}>
            <TouchableOpacity onPress={onUpvote} style={styles.voteArrow}>
                <Ionicons
                    name={userVote === 'upvote' ? 'chevron-up' : 'chevron-up-outline'}
                    size={iconSize}
                    color={userVote === 'upvote' ? theme.colors.bondedPurple : theme.colors.textSecondary}
                />
            </TouchableOpacity>
            <Text style={[
                styles.voteCount,
                { fontSize },
                userVote === 'upvote' && { color: theme.colors.bondedPurple },
                userVote === 'downvote' && { color: theme.colors.error },
                !userVote && { color: theme.colors.textPrimary }
            ]}>
                {score}
            </Text>
            <TouchableOpacity onPress={onDownvote} style={styles.voteArrow}>
                <Ionicons
                    name={userVote === 'downvote' ? 'chevron-down' : 'chevron-down-outline'}
                    size={iconSize}
                    color={userVote === 'downvote' ? theme.colors.error : theme.colors.textSecondary}
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
    anonNumber
}) => {
    const score = (comment.upvotes || 0) - (comment.downvotes || 0)

    return (
        <View style={[styles.commentItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.commentLeft}>
                <PostAvatar post={{ isAnon: comment.isAnon, author: comment.author, authorAvatar: comment.authorAvatar }} size={hp(3.5)} theme={theme} />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>
                            {comment.isAnon ? 'Anonymous' : comment.author}
                        </Text>
                        <Text style={[styles.commentMeta, { color: theme.colors.textSecondary }]}>
                            {comment.location || ''} • {comment.timeAgo}
                        </Text>
                    </View>
                    <Text style={[styles.commentBody, { color: theme.colors.textPrimary }]}>
                        {comment.body}
                    </Text>
                    <View style={styles.commentActions}>
                        <TouchableOpacity style={styles.commentAction}>
                            <Ionicons name="paper-plane-outline" size={hp(1.8)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                            <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                            <Ionicons name="repeat-outline" size={hp(1.8)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                            <Ionicons name="ellipsis-horizontal" size={hp(1.8)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <VerticalVote
                score={score}
                userVote={userVote}
                onUpvote={() => onVote(comment.id, 'up')}
                onDownvote={() => onVote(comment.id, 'down')}
                theme={theme}
                size="small"
            />
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
    theme,
}) {
    const insets = useSafeAreaInsets()
    const [newComment, setNewComment] = useState('')
    const [isAnon, setIsAnon] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const score = useMemo(() => {
        return (post?.upvotes || 0) - (post?.downvotes || 0)
    }, [post])

    const sortedComments = useMemo(() => {
        let sorted = [...comments]
        if (commentSort === 'new') {
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        } else {
            // Best: by score
            sorted.sort((a, b) => {
                const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
                const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
                return scoreB - scoreA
            })
        }
        return sorted
    }, [comments, commentSort])

    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onAddComment(post.id, newComment.trim(), isAnon)
            setNewComment('')
        } catch (e) {
            console.error('Failed to submit comment:', e)
        }
        setIsSubmitting(false)
    }, [newComment, isAnon, isSubmitting, onAddComment, post?.id])

    if (!post) return null

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={hp(3)} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={sortedComments}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={() => (
                    <>
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
                                    <PostAvatar post={post} size={hp(4.5)} theme={theme} />
                                    <View style={styles.postAuthorInfo}>
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
                                    </View>
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

                            {/* Vertical vote on right side - keep Fizz-style voting */}
                            <View style={{ position: 'absolute', right: wp(4), top: hp(6) }}>
                                <VerticalVote
                                    score={score}
                                    userVote={postUserVote}
                                    onUpvote={() => onPostVote(post.id, 'upvote')}
                                    onDownvote={() => onPostVote(post.id, 'downvote')}
                                    theme={theme}
                                />
                            </View>
                        </View>

                        {/* Action bar */}
                        <View style={[styles.actionBar, { borderBottomColor: theme.colors.border }]}>
                            <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                                <Ionicons name="paper-plane-outline" size={hp(2.2)} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="chatbubble-outline" size={hp(2.2)} color={theme.colors.textSecondary} />
                                <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                                    {post.commentsCount || 0}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={onRepost}>
                                <Ionicons name="repeat-outline" size={hp(2.2)} color={theme.colors.textSecondary} />
                                <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                                    {post.repostsCount || 0}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="share-outline" size={hp(2.2)} color={theme.colors.textSecondary} />
                                <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                                    {post.sharesCount || 0}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="ellipsis-horizontal" size={hp(2.2)} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
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
                renderItem={({ item, index }) => (
                    <CommentItem
                        comment={item}
                        userVote={userVotes[item.id]}
                        onVote={(commentId, direction) => onCommentVote(commentId, null, direction)}
                        theme={theme}
                        anonNumber={index + 1}
                    />
                )}
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
                <View style={[styles.inputBar, { borderTopColor: theme.colors.border, paddingBottom: insets.bottom || hp(2) }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.backgroundSecondary }]}
                        placeholder="Add a comment..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                        maxLength={500}
                    />
                    <View style={styles.inputActions}>
                        <TouchableOpacity style={styles.inputAction}>
                            <Text style={[styles.gifButton, { color: theme.colors.textSecondary, borderColor: theme.colors.border }]}>GIF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inputAction}>
                            <Text style={[styles.gifButton, { color: theme.colors.textSecondary, borderColor: theme.colors.border }]}>MEME</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inputAction}>
                            <Ionicons name="image-outline" size={hp(2.4)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {newComment.trim().length > 0 && (
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: theme.colors.bondedPurple }]}
                            onPress={handleSubmitComment}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="send" size={hp(2)} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: wp(2),
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
    verticalVote: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    voteArrow: {
        padding: hp(0.5),
    },
    voteCount: {
        fontWeight: '700',
        marginVertical: hp(0.3),
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: wp(6),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    actionCount: {
        fontSize: hp(1.5),
        fontWeight: '500',
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
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentLeft: {
        flex: 1,
        flexDirection: 'row',
    },
    commentContent: {
        flex: 1,
        marginLeft: wp(2),
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(4),
        paddingTop: hp(1.5),
        borderTopWidth: StyleSheet.hairlineWidth,
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
    gifButton: {
        fontSize: hp(1.3),
        fontWeight: '700',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
        borderWidth: 1,
        borderRadius: hp(0.5),
    },
    sendButton: {
        width: hp(4),
        height: hp(4),
        borderRadius: hp(2),
        alignItems: 'center',
        justifyContent: 'center',
    },
})
