import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'
import { useConversationReactions, useToggleReaction } from '../../hooks/useMessageReactions'
import { useUnsendMessage } from '../../hooks/useMessages'
import { formatChatDate, isSameGroup, shouldShowDateSeparator } from '../../utils/chatHelpers'
import MessageBubble from '../Message/MessageBubble'
import { supabase } from '../../lib/supabase'

export default function MessageList({
    messages,
    currentUserId,
    conversationId,
    isLoading,
    isLoadingMore,
    onLoadMore,
    highlightMessageId,
    onAvatarPress,
}) {
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const listRef = useRef(null)
    const lastTapMessageIdRef = useRef(null)
    const lastTapTimeRef = useRef(0)
    const doubleTapTimeoutRef = useRef(null)
    const [reactionsModalVisible, setReactionsModalVisible] = useState(false)
    const [reactionsUsers, setReactionsUsers] = useState([])
    const [reactionsLoading, setReactionsLoading] = useState(false)
    const [activeHighlightId, setActiveHighlightId] = useState(null)

    // Fetch reactions for all messages in conversation
    const messageIds = useMemo(() => messages.map(m => m.id), [messages])
    const { data: reactionsMap = {} } = useConversationReactions(conversationId, messageIds)

    const toggleReaction = useToggleReaction()
    const unsendMessage = useUnsendMessage()

    const handleReaction = async (message, reactionType) => {
        try {
            const existingReactions = reactionsMap[message.id] || []
            await toggleReaction.mutateAsync({
                messageId: message.id,
                reactionType,
                existingReactions,
            })
        } catch (error) {
            console.error('Error toggling reaction:', error)
        }
    }

    const handleLongPress = (message) => {
        if (!message?.id) return
        if (message.sender_id !== currentUserId) return

        Alert.alert(
            'Delete message?',
            'This will remove the message for everyone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await unsendMessage.mutateAsync({ messageId: message.id, conversationId })
                        } catch (error) {
                            console.error('Error deleting message:', error)
                            Alert.alert('Error', 'Failed to delete message. Please try again.')
                        }
                    }
                }
            ]
        )
    }

    const handleMessagePress = (message) => {
        if (!message?.id) return
        if (message?.metadata?.unsent) return

        const now = Date.now()
        const DOUBLE_TAP_DELAY = 400

        if (doubleTapTimeoutRef.current) {
            clearTimeout(doubleTapTimeoutRef.current)
            doubleTapTimeoutRef.current = null
        }

        const isDoubleTap =
            message.id === lastTapMessageIdRef.current &&
            lastTapTimeRef.current > 0 &&
            (now - lastTapTimeRef.current) < DOUBLE_TAP_DELAY

        if (isDoubleTap) {
            handleReaction(message, 'heart')
            lastTapMessageIdRef.current = null
            lastTapTimeRef.current = 0
        } else {
            lastTapMessageIdRef.current = message.id
            lastTapTimeRef.current = now
            doubleTapTimeoutRef.current = setTimeout(() => {
                lastTapMessageIdRef.current = null
                lastTapTimeRef.current = 0
                doubleTapTimeoutRef.current = null
            }, DOUBLE_TAP_DELAY)
        }
    }

    const handleReactionsPress = async (message) => {
        if (!message?.id) return
        const reactions = reactionsMap[message.id] || []
        const heartReactions = reactions.filter(r => r.reaction_type === 'heart')
        const userIds = [...new Set(heartReactions.map(r => r.user_id))].filter(Boolean)
        if (userIds.length === 0) return

        setReactionsLoading(true)
        setReactionsModalVisible(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .in('id', userIds)

            if (error) throw error

            const users = (data || []).sort((a, b) => {
                const aName = a.full_name || a.username || ''
                const bName = b.full_name || b.username || ''
                return aName.localeCompare(bName)
            })
            setReactionsUsers(users)
        } catch (error) {
            console.error('Error loading reaction users:', error)
            Alert.alert('Error', 'Failed to load reactions.')
            setReactionsUsers([])
        } finally {
            setReactionsLoading(false)
        }
    }

    useEffect(() => {
        if (!highlightMessageId || messages.length === 0) return
        const index = messages.findIndex(m => m.id === highlightMessageId)
        if (index === -1) return

        try {
            listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
        } catch (err) {
            // Ignore; onScrollToIndexFailed will retry
        }
        setActiveHighlightId(highlightMessageId)
        const timer = setTimeout(() => setActiveHighlightId(null), 1800)
        return () => clearTimeout(timer)
    }, [highlightMessageId, messages])

    const renderItem = ({ item, index }) => {
        // Determine positioning in group
        // Inverted list: index+1 is OLDER/PREV, index-1 is NEWER/NEXT

        const prevMessage = messages[index + 1] // Older
        const nextMessage = messages[index - 1] // Newer

        // Is this the "first" message of the group (visually at the TOP)?
        // Means the OLDER message is different sender or diff time
        const isFirstInGroup = !isSameGroup(item, prevMessage)

        // Is this the "last" message of the group (visually at the BOTTOM)?
        // Means the NEWER message is different sender or diff time
        const isLastInGroup = !isSameGroup(item, nextMessage)

        const showAvatar = isLastInGroup && item.sender_id !== currentUserId
        const showDate = isFirstInGroup && shouldShowDateSeparator(item.created_at, prevMessage?.created_at)

        return (
            <View>
                {/* Inverted list: Date is visually 'above' (so rendered AFTER in flex-col-reverse, or BEFORE in standard?) */}
                {/* Wait, standard FlatList inverted renders bottom-up. */}
                {/* So the "Bottom" item is index 0. */}
                {/* If we want date at TOP of group, it needs to be rendered "after" the group items in DOM? */}
                {/* Actually, for Inverted list, "Footer" is top of screen. */}
                {/* Let's keep it simple: Render date separator as a separate View if needed. */}
                {/* BUT grouping logic date check needs to be correct. */}

                {/* Date Separator logic for Inverted List: 
            If message is oldest in group (FirstInGroup visually), verify if it needs separator.
            In inverted list, to show something "Above", we render it "Below" in DOM structure? No.
            Top of screen is "End" of list.
            Let's rely on standard View flow within renderItem.
            If Date needs to be ABOVE the message, in inverted list, it should be rendered AFTER the message component?
            Actually, inverted list flips the scroll direction, but item rendering is usually standard within the item container?
            Let's test. Usually for inverted chat, standard render is:
            [Date Separator]
            [Message]
            Wait, if inverted, [Message] is at bottom.
            So [Date] needs to be visually above.
            Inverted FlatList: visual top is end of list.
            If I render <View><Date/><Bubble/></View>:
            Visual on screen:
            [Date]       (Top)
            [Bubble]     (Bottom)
            This is correct for "Date above Bubble".
        */}

                {showDate && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateText}>
                            {formatChatDate(item.created_at)}
                        </Text>
                    </View>
                )}

                <MessageBubble
                    message={item}
                    isMe={item.sender_id === currentUserId}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showAvatar={showAvatar}
                    theme={theme}
                    reactions={reactionsMap[item.id] || []}
                    onPress={() => handleMessagePress(item)}
                    onLongPress={handleLongPress}
                    onAvatarPress={onAvatarPress}
                    onReactionsPress={handleReactionsPress}
                    isHighlighted={activeHighlightId === item.id}
                />

                {/* If we need spacing between groups? */}
                {isLastInGroup && <View style={{ height: 4 }} />}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {isLoading && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
                </View>
            ) : (
                <>
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(item) => item.id || item.created_at}
                        renderItem={renderItem}
                        inverted
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.2}
                        onScrollToIndexFailed={(info) => {
                            // Retry after a short delay once items have rendered
                            setTimeout(() => {
                                if (!listRef.current) return
                                const targetIndex = Math.min(info.index, messages.length - 1)
                                if (targetIndex < 0) return
                                listRef.current.scrollToIndex({
                                    index: targetIndex,
                                    animated: true,
                                    viewPosition: 0.5,
                                })
                            }, 150)
                        }}
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={styles.footerLoader}>
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        // For inverted list, empty component is centered? 
                        // Need to rotate it back if we want it right side up?
                        // Or just use styling `transform: [{ scaleY: -1 }]` on the container
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No messages yet</Text>
                            <Text style={styles.emptySubtext}>Say hello!</Text>
                        </View>
                    }
                    />

                </>
            )}

            <Modal
                visible={reactionsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setReactionsModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setReactionsModalVisible(false)}
                >
                    <View style={styles.reactionsModal}>
                        <Text style={styles.reactionsTitle}>❤️ Reactions</Text>
                        {reactionsLoading ? (
                            <View style={styles.reactionsLoading}>
                                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                            </View>
                        ) : reactionsUsers.length === 0 ? (
                            <Text style={styles.reactionsEmpty}>No reactions yet</Text>
                        ) : (
                            <FlatList
                                data={reactionsUsers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const name = item.full_name || item.username || 'User'
                                    return (
                                        <View style={styles.reactionUserRow}>
                                            {item.avatar_url ? (
                                                <Image source={{ uri: item.avatar_url }} style={styles.reactionAvatar} />
                                            ) : (
                                                <View style={styles.reactionAvatarFallback}>
                                                    <Text style={styles.reactionAvatarText}>
                                                        {(name.charAt(0) || 'U').toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={styles.reactionUserName}>{name}</Text>
                                        </View>
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

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        paddingHorizontal: wp(4),
        paddingBottom: hp(2),
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerLoader: {
        paddingVertical: hp(2),
        alignItems: 'center',
    },
    dateSeparator: {
        alignItems: 'center',
        marginVertical: hp(2),
        marginBottom: hp(1),
    },
    dateText: {
        fontSize: hp(1.5),
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: hp(20),
        transform: [{ scaleY: -1 }]
    },
    emptyText: {
        fontSize: hp(2.2),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: hp(1),
    },
    emptySubtext: {
        fontSize: hp(1.8),
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: wp(8),
    },
    reactionsModal: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.lg,
        padding: wp(5),
        maxHeight: hp(60),
    },
    reactionsTitle: {
        fontSize: hp(2),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: hp(1.5),
        textAlign: 'center',
    },
    reactionsLoading: {
        paddingVertical: hp(2),
        alignItems: 'center',
    },
    reactionsEmpty: {
        fontSize: hp(1.6),
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: hp(2),
    },
    reactionUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    reactionAvatar: {
        width: hp(4),
        height: hp(4),
        borderRadius: hp(2),
        marginRight: wp(3),
    },
    reactionAvatarFallback: {
        width: hp(4),
        height: hp(4),
        borderRadius: hp(2),
        marginRight: wp(3),
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactionAvatarText: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    reactionUserName: {
        fontSize: hp(1.7),
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
})
