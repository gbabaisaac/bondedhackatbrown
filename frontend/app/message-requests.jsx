import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { hp, wp } from '../helpers/common'
import { useAcceptMessageRequest, useDeclineMessageRequest, useMessageRequests } from '../hooks/useMessageRequests'
import { useAppTheme } from './theme'

export default function MessageRequests() {
    const router = useRouter()
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const { openProfile } = useProfileModal()

    const { data: requests = [], isLoading, refetch } = useMessageRequests()
    const acceptMutation = useAcceptMessageRequest()
    const declineMutation = useDeclineMessageRequest()

    const handleAccept = async (request) => {
        try {
            const conversationId = await acceptMutation.mutateAsync({
                requestId: request.id,
                senderId: request.sender_id
            })

            // Navigate to the new chat
            router.replace({
                pathname: '/chat',
                params: {
                    conversationId,
                    userId: request.sender_id,
                    userName: request.sender?.full_name || request.sender?.username
                }
            })
        } catch (error) {
            console.error('Failed to accept request:', error)
            Alert.alert('Error', 'Failed to accept request')
        }
    }

    const handleDecline = (request) => {
        Alert.alert(
            'Decline Request',
            'Are you sure you want to decline this message request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: () => {
                        declineMutation.mutate({ requestId: request.id })
                    }
                }
            ]
        )
    }

    const renderItem = ({ item }) => (
        <View style={styles.requestItem}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openProfile(item.sender_id)}
                style={styles.profileSection}
            >
                <Image
                    source={item.sender?.avatar_url ? { uri: item.sender.avatar_url } : null}
                    style={styles.avatar}
                    contentFit="cover"
                >
                    {!item.sender?.avatar_url && (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarPlaceholderText}>
                                {(item.sender?.full_name || item.sender?.username || '?').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </Image>

                <View style={styles.info}>
                    <Text style={styles.name}>{item.sender?.full_name || item.sender?.username || 'User'}</Text>
                    <Text style={styles.username}>@{item.sender?.username || 'username'}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleDecline(item)}
                    disabled={declineMutation.isPending}
                >
                    <Ionicons name="close" size={hp(2.2)} color={theme.colors.error || '#FF3B30'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(item)}
                    disabled={acceptMutation.isPending}
                >
                    {acceptMutation.isPending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons name="checkmark" size={hp(2.2)} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={hp(2.8)} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Message Requests</Text>
                <View style={{ width: hp(2.8) }} />
            </View>

            {/* List */}
            <FlatList
                data={requests}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={isLoading}
                onRefresh={refetch}
                ListEmptyComponent={
                    !isLoading && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="mail-unread-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={styles.emptyText}>No pending message requests</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    )
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingBottom: hp(1.5),
        paddingTop: hp(2),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: hp(2.2),
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    backButton: {
        padding: hp(0.5),
    },
    listContent: {
        paddingVertical: hp(1),
        paddingBottom: hp(5),
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(4),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.borderSecondary || 'rgba(0,0,0,0.05)',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: hp(6),
        height: hp(6),
        borderRadius: hp(3),
        backgroundColor: theme.colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
    },
    avatarPlaceholderText: {
        fontSize: hp(2.5),
        fontFamily: theme.typography.fontFamily.heading,
        color: theme.colors.textSecondary,
    },
    info: {
        marginLeft: wp(3),
        flex: 1,
    },
    name: {
        fontSize: hp(1.9),
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    username: {
        fontSize: hp(1.5),
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.textSecondary,
        marginTop: hp(0.2),
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(3),
    },
    actionButton: {
        width: hp(4.5),
        height: hp(4.5),
        borderRadius: hp(2.25),
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: theme.colors.bondedPurple,
    },
    declineButton: {
        backgroundColor: theme.colors.backgroundSecondary,
    },
    centerContainer: {
        flex: 1,
        paddingTop: hp(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: hp(2),
        fontSize: hp(1.8),
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.textSecondary,
    }
})
