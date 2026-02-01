import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { hp, wp } from '../helpers/common'
import { useFriends } from '../hooks/useFriends'
import { useSendMessageRequest } from '../hooks/useMessageRequests'
import { useProfiles } from '../hooks/useProfiles'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme } from './theme'

export default function NewChat() {
    const router = useRouter()
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const { user: currentUser } = useAuthStore()

    const [searchText, setSearchText] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [isGroupMode, setIsGroupMode] = useState(false)
    const [selectedUsers, setSelectedUsers] = useState(new Set())
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchText])

    const { data: allProfiles = [], isLoading } = useProfiles({
        searchQuery: debouncedSearch,
        universityId: 'current'
    })
    const { data: friends = [], isLoading: friendsLoading } = useFriends()
    const sendMessageRequest = useSendMessageRequest()

    // Filter out self
    const profiles = allProfiles.filter(p => p.id !== currentUser?.id)

    const friendIds = useMemo(() => new Set(friends.map(friend => friend.id)), [friends])

    const normalizedFriends = useMemo(() => {
        return friends.map(friend => ({
            id: friend.id,
            name: friend.full_name || friend.username || 'User',
            full_name: friend.full_name,
            username: friend.username,
            photoUrl: friend.avatar_url,
            major: friend.major,
            grade: friend.grade,
        }))
    }, [friends])

    const normalizedAll = useMemo(() => {
        return profiles.map(profile => ({
            ...profile,
            name: profile.name || profile.full_name || profile.username || 'User',
        }))
    }, [profiles])

    const filteredFriends = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase()
        if (!query) return normalizedFriends
        return normalizedFriends.filter(user =>
            `${user.name} ${user.username || ''}`.toLowerCase().includes(query)
        )
    }, [debouncedSearch, normalizedFriends])

    const filteredOthers = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase()
        const base = normalizedAll.filter(user => !friendIds.has(user.id))
        if (!query) return base
        return base.filter(user =>
            `${user.name} ${user.username || ''}`.toLowerCase().includes(query)
        )
    }, [debouncedSearch, friendIds, normalizedAll])

    const sections = useMemo(() => {
        if (isGroupMode) {
            return [{ title: 'Friends', data: filteredFriends, sectionType: 'friends' }]
        }
        return [
            { title: 'Friends', data: filteredFriends, sectionType: 'friends' },
            { title: 'All Students', data: filteredOthers, sectionType: 'others' }
        ]
    }, [filteredFriends, filteredOthers, isGroupMode])

    const handleUserPress = async (user, sectionType) => {
        if (isGroupMode) {
            setSelectedUsers(prev => {
                const next = new Set(prev)
                if (next.has(user.id)) {
                    next.delete(user.id)
                } else {
                    next.add(user.id)
                }
                return next
            })
            return
        }

        if (sectionType === 'others') {
            try {
                await sendMessageRequest.mutateAsync({ receiverId: user.id })
                Alert.alert('Message request sent', `We sent ${user.name} a message request.`)
            } catch (error) {
                Alert.alert('Error', error?.message || 'Unable to send message request')
            }
            return
        }

        // Direct Chat
        navigateToChat(user.id, user.name || user.full_name || user.username)
    }

    const navigateToChat = (targetId, targetName, isGroup = false) => {
        router.push({
            pathname: '/chat',
            params: {
                userId: isGroup ? undefined : targetId,
                conversationId: isGroup ? targetId : undefined, // If group, targetId is convId
                userName: targetName,
                isGroupChat: isGroup ? 'true' : 'false'
            }
        })
    }

    const handleCreateGroup = async () => {
        if (selectedUsers.size < 2) {
            Alert.alert('Group Chat', 'Please select at least 2 friends.')
            return
        }
        setIsCreating(true)
        try {
            const selectedList = normalizedFriends.filter(p => selectedUsers.has(p.id))
            const defaultName = [...selectedList.slice(0, 2).map(p => p.name.split(' ')[0]), '...'].join(', ')

            // Create Group Conversation
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    name: defaultName,
                    type: 'group',
                    created_by: currentUser.id
                })
                .select()
                .single()

            if (error) throw error

            // Add Participants (Self + Selected)
            const participants = [
                { conversation_id: newConv.id, user_id: currentUser.id, role: 'owner' },
                ...selectedList.map(u => ({ conversation_id: newConv.id, user_id: u.id }))
            ]

            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert(participants)

            if (partError) throw partError

            // Navigate
            navigateToChat(newConv.id, defaultName, true)

        } catch (error) {
            console.error('Failed to create group:', error)
            Alert.alert('Error', 'Failed to create group chat')
        } finally {
            setIsCreating(false)
        }
    }

    const renderItem = ({ item, section }) => {
        const isSelected = selectedUsers.has(item.id)
        return (
            <TouchableOpacity
                style={[styles.userRow, isSelected && styles.userRowSelected]}
                onPress={() => handleUserPress(item, section?.sectionType)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarWrapper}>
                    <Image
                        source={item.photoUrl ? { uri: item.photoUrl } : null}
                        style={styles.avatar}
                        contentFit="cover"
                    >
                        {!item.photoUrl && (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </Image>
                    {isGroupMode && isSelected && (
                        <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userMeta}>
                        {[item.major, item.grade].filter(Boolean).join(' • ')}
                    </Text>
                </View>

                {!isGroupMode && section?.sectionType === 'friends' && (
                    <Ionicons name="chatbubble-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
                )}
                {!isGroupMode && section?.sectionType === 'others' && (
                    <Ionicons name="paper-plane-outline" size={hp(2.2)} color={theme.colors.textSecondary} />
                )}
                {isGroupMode && (
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                )}
            </TouchableOpacity>
        )
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={hp(2.8)} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isGroupMode ? 'New Group' : 'New Message'}</Text>

                <TouchableOpacity onPress={() => {
                    setIsGroupMode(!isGroupMode)
                    setSelectedUsers(new Set())
                }}>
                    <Text style={styles.headerAction}>{isGroupMode ? 'Cancel' : 'Create Group'}</Text>
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={hp(2)} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={isGroupMode ? "Search friends to add" : "Search for people..."}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchText}
                        onChangeText={setSearchText}
                        autoFocus={!isGroupMode}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={hp(2)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Create Group Button (Floating or Top) */}
            {isGroupMode && selectedUsers.size > 0 && (
                <View style={styles.selectedBar}>
                    <Text style={styles.selectedCount}>{selectedUsers.size} selected</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleCreateGroup}
                        disabled={isCreating}
                    >
                        {isCreating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createButtonText}>Create</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* List */}
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={({ section }) => (
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                )}
                contentContainerStyle={styles.listContent}
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                    isLoading || friendsLoading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
                        </View>
                    ) : (
                        <View style={styles.centerContainer}>
                            <Ionicons name="people-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={styles.emptyText}>
                                {debouncedSearch ? "No people found" : "Search for students at your school"}
                            </Text>
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
    headerAction: {
        fontSize: hp(1.8),
        color: theme.colors.bondedPurple,
        fontWeight: '600',
    },
    backButton: {
        padding: hp(0.5),
    },
    searchContainer: {
        padding: wp(4),
        paddingBottom: hp(1),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.radius.lg,
        paddingHorizontal: wp(3),
        height: hp(5.5),
    },
    searchInput: {
        flex: 1,
        marginLeft: wp(2),
        fontSize: hp(1.8),
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.textPrimary,
    },
    selectedBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingBottom: hp(1),
    },
    selectedCount: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    createButton: {
        backgroundColor: theme.colors.bondedPurple,
        paddingHorizontal: wp(4),
        paddingVertical: hp(0.8),
        borderRadius: 20,
    },
    createButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    listContent: {
        paddingVertical: hp(1),
        paddingBottom: hp(5),
    },
    sectionTitle: {
        paddingHorizontal: wp(4),
        paddingTop: hp(1.2),
        paddingBottom: hp(0.6),
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(4),
    },
    userRowSelected: {
        backgroundColor: theme.colors.backgroundSecondary + '50',
    },
    avatarWrapper: {
        position: 'relative',
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
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.bondedPurple,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
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
    userInfo: {
        flex: 1,
        marginLeft: wp(3),
    },
    userName: {
        fontSize: hp(1.9),
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    userMeta: {
        fontSize: hp(1.5),
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.textSecondary,
        marginTop: hp(0.2),
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: theme.colors.bondedPurple,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.bondedPurple,
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
