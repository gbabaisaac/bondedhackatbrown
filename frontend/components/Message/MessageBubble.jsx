import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { hp } from '../../helpers/common'
import { useAuthStore } from '../../stores/authStore'
import RichMessagePreview from './RichMessagePreviewSimple'

export default function MessageBubble({
    message,
    isMe,
    theme,
    isFirstInGroup, // Visually Top
    isLastInGroup,  // Visually Bottom
    showAvatar,
    onPress,
    onLongPress,
    onAvatarPress,
    reactions = [],
    onReactionsPress,
    isHighlighted,
}) {
    const { user } = useAuthStore()
    const styles = createStyles(theme)

    // Bubble Shape Logic
    const borderTopLeft = !isMe && !isFirstInGroup ? 5 : 20
    const borderBottomLeft = !isMe && !isLastInGroup ? 5 : 20
    const borderTopRight = isMe && !isFirstInGroup ? 5 : 20
    const borderBottomRight = isMe && !isLastInGroup ? 5 : 20

    // Tail Logic (Only visually bottom aka isLastInGroup)
    // Actually iMessage creates a continuous shape.
    // Let's stick to: Rounded corners everywhere except the "connected" side.

    const bubbleStyle = {
        borderTopLeftRadius: !isMe ? (isFirstInGroup ? 20 : 5) : 20,
        borderBottomLeftRadius: !isMe ? (isLastInGroup ? 20 : 5) : 20,

        borderTopRightRadius: isMe ? (isFirstInGroup ? 20 : 5) : 20,
        borderBottomRightRadius: isMe ? (isLastInGroup ? 20 : 5) : 20,

        // Add small margin between grouped messages
        marginBottom: 2,
    }

    const senderAvatar = message.sender?.avatar_url

    const isUnsent = message?.metadata?.unsent || message?.content === ''

    // Count reactions by type
    const reactionCounts = {}
    const userReactions = new Set()

    reactions.forEach(reaction => {
        const type = reaction.reaction_type
        reactionCounts[type] = (reactionCounts[type] || 0) + 1
        if (reaction.user_id === user?.id) {
            userReactions.add(type)
        }
    })

    const hasReactions = Object.keys(reactionCounts).length > 0

    return (
        <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
            {/* Avatar (Left side, only if other and last in group) */}
            {!isMe && (
                <View style={styles.avatarContainer}>
                    {showAvatar ? (
                        <TouchableOpacity 
                            activeOpacity={0.7}
                            onPress={() => onAvatarPress && message.sender?.id && onAvatarPress(message.sender.id)}
                        >
                            {senderAvatar ? (
                                <Image source={{ uri: senderAvatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarText}>
                                        {(message.sender?.full_name || message.sender?.username || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 30 }} /> // Spacer to keep alignment
                    )}
                </View>
            )}

            <View style={styles.bubbleWrapper}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={onPress}
                    onLongPress={() => onLongPress && onLongPress(message)}
                    style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                        bubbleStyle,
                        isHighlighted && styles.bubbleHighlighted
                    ]}
                >
                    <Text
                        style={[
                            styles.text,
                            isMe ? styles.textMe : styles.textOther,
                            isUnsent && styles.textUnsent
                        ]}
                    >
                        {isUnsent ? 'Message unsent' : message.content}
                    </Text>

                    {/* Rich Message Preview */}
                    {!isUnsent && <RichMessagePreview message={message} isOwn={isMe} />}
                </TouchableOpacity>

                {/* Reactions Display */}
                {hasReactions && !isUnsent && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onReactionsPress && onReactionsPress(message)}
                        style={[
                            styles.reactionsContainer,
                            isMe ? styles.reactionsContainerMe : styles.reactionsContainerOther
                        ]}
                    >
                        {Object.entries(reactionCounts).map(([reactionType, count]) => (
                            <View
                                key={reactionType}
                                style={[
                                    styles.reactionBadge,
                                    userReactions.has(reactionType) && styles.reactionBadgeActive
                                ]}
                            >
                                <Text style={styles.reactionEmoji}>
                                    {reactionType === 'heart' ? '❤️' : '👍'}
                                </Text>
                                {count > 1 && (
                                    <Text style={styles.reactionCount}>{count}</Text>
                                )}
                            </View>
                        ))}
                    </TouchableOpacity>
                )}
            </View>

            {/* Status / Time (Optional, maybe only on last message or tap) */}
            {/* {isLastInGroup && isMe && (
                 <Text style={styles.statusText}>Delivered</Text>
             )} */}
        </View>
    )
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 1, // Tight spacing
        maxWidth: '100%',
    },
    containerMe: {
        justifyContent: 'flex-end',
    },
    containerOther: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 30,
        marginRight: 8,
        justifyContent: 'flex-end',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    avatarPlaceholder: {
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    bubbleWrapper: {
        maxWidth: '70%',
        position: 'relative',
    },
    bubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 36,
        justifyContent: 'center',
    },
    bubbleMe: {
        backgroundColor: theme.colors.bondedPurple, // iMessage Blue/Purple equivalent
    },
    bubbleOther: {
        backgroundColor: theme.colors.backgroundSecondary || '#E5E5EA', // iMessage Gray
    },
    bubbleHighlighted: {
        borderWidth: 2,
        borderColor: theme.colors.bondedPurple,
        shadowColor: theme.colors.bondedPurple,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    text: {
        fontSize: 16,
        lineHeight: 20,
    },
    textMe: {
        color: '#FFFFFF',
    },
    textOther: {
        color: theme.colors.textPrimary || '#000000',
    },
    textUnsent: {
        fontStyle: 'italic',
        color: theme.colors.textSecondary,
    },
    statusText: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 2,
        marginRight: 4,
        alignSelf: 'flex-end',
    },
    reactionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    reactionsContainerMe: {
        alignSelf: 'flex-end',
    },
    reactionsContainerOther: {
        alignSelf: 'flex-start',
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 2,
    },
    reactionBadgeActive: {
        backgroundColor: theme.colors.bondedPurple + '20',
        borderColor: theme.colors.bondedPurple,
    },
    reactionEmoji: {
        fontSize: hp(1.8),
    },
    reactionCount: {
        fontSize: hp(1.3),
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
})
