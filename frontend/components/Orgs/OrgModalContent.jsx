import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useAppTheme } from '../../app/theme'
import { useClubsContext } from '../../contexts/ClubsContext'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp, wp } from '../../helpers/common'
import { resolveMediaUrls } from '../../helpers/mediaStorage'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useCreateConversation } from '../../hooks/useMessages'
import EventPost from '../Events/EventPost'
import { ArrowLeft } from '../Icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const OrgModalContent = ({ org, onClose, scrollYRef, panResponder }) => {
    const theme = useAppTheme()
    const router = useRouter()
    const { user } = useAuthStore()
    const { openProfile } = useProfileModal()
    const {
        isUserMember,
        hasUserRequested,
        requestToJoin,
        leaveClub,
        isUserAdmin,
        approveRequest,
        rejectRequest,
        currentUserId,
        refetch,
    } = useClubsContext()

    const [activeTab, setActiveTab] = useState('posts')
    const [memberProfiles, setMemberProfiles] = useState([])
    const [clubPosts, setClubPosts] = useState([])
    const [clubEvents, setClubEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [membersLoading, setMembersLoading] = useState(true)
    const [postsLoading, setPostsLoading] = useState(true)
    const [eventsLoading, setEventsLoading] = useState(true)
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [messagingAdmin, setMessagingAdmin] = useState(false)
    
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    
    // Stable image URLs - set once when org changes
    const [stableCoverImage, setStableCoverImage] = useState(null)
    const [stableAvatarImage, setStableAvatarImage] = useState(null)
    const imageInitializedRef = useRef(false)

    const createConversation = useCreateConversation()
    const isAdmin = org ? isUserAdmin(org.id) : false
    const isMember = isUserMember(org?.id)
    const hasRequested = hasUserRequested(org?.id)
    
    // Get admin profiles for messaging
    const adminProfiles = useMemo(() => {
        return memberProfiles.filter(m => m.role === 'admin' || m.role === 'owner')
    }, [memberProfiles])
    const orgRef = useRef(org)
    
    // Initialize images once when org loads/changes
    useEffect(() => {
        if (org?.id && !imageInitializedRef.current) {
            const coverImg = org?.coverImage || org?.cover_url || null
            const avatarImg = org?.avatar || org?.logo_url || null
            setStableCoverImage(coverImg)
            setStableAvatarImage(avatarImg)
            imageInitializedRef.current = true
        }
    }, [org?.id, org?.coverImage, org?.cover_url, org?.avatar, org?.logo_url])
    
    // Reset when org changes
    useEffect(() => {
        if (org?.id !== orgRef.current?.id) {
            imageInitializedRef.current = false
            setMembersLoading(true)
            setPostsLoading(true)
            setEventsLoading(true)
        }
        orgRef.current = org
    }, [org?.id])
    const pendingMembers = useMemo(() => memberProfiles.filter(m => m.role === 'pending'), [memberProfiles])
    const activeMembers = useMemo(() => memberProfiles.filter(m => m.role !== 'pending'), [memberProfiles])
    
    // Debug: Log admin status
    useEffect(() => {
        if (org?.id) {
            console.log('[OrgModal] Org:', org?.name, '| isAdmin:', isAdmin, '| user:', user?.id)
        }
    }, [org?.id, isAdmin, user?.id])
    const activeMemberCount = useMemo(() => {
        if (activeMembers.length > 0) return activeMembers.length
        return org?.members?.length || 0
    }, [activeMembers.length, org?.members?.length])
    const filteredMembers = useMemo(() => {
        const query = memberSearchQuery.trim().toLowerCase()
        if (!query) return activeMembers
        return activeMembers.filter((member) => {
            const name = `${member.profile?.full_name || ''} ${member.profile?.username || ''}`.toLowerCase()
            return name.includes(query)
        })
    }, [activeMembers, memberSearchQuery])

    // Fetch members
    const fetchMembers = useCallback(async () => {
        const activeOrg = orgRef.current
        if (!activeOrg?.id) {
            setMemberProfiles([])
            setMembersLoading(false)
            return
        }
        
        try {
            // Step 1: Fetch org_members records
            const { data: orgMembersData, error: orgMembersError } = await supabase
                .from('org_members')
                .select('user_id, role, joined_at')
                .eq('organization_id', activeOrg.id)

            if (orgMembersError) {
                console.error('Error fetching org_members:', orgMembersError)
                // Fall through to fallback logic
            }

            if (orgMembersData && orgMembersData.length > 0) {
                // Step 2: Fetch profiles for all member user_ids
                const userIds = orgMembersData.map(m => m.user_id).filter(Boolean)
                
                if (userIds.length > 0) {
                    const { data: profiles, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url, major, graduation_year')
                        .in('id', userIds)

                    if (profileError) {
                        console.error('Error fetching profiles:', profileError)
                        // Fall through to fallback logic
                    } else if (profiles && profiles.length > 0) {
                        // Step 3: Combine org_members with profiles
                        const profileMap = new Map(profiles.map(p => [p.id, p]))
                        const transformedMembers = orgMembersData.map((member) => ({
                            user_id: member.user_id,
                            role: member.role || 'member',
                            joined_at: member.joined_at,
                            profile: profileMap.get(member.user_id) || null,
                        })).filter(m => m.profile !== null) // Only include members with valid profiles
                        
                        setMemberProfiles(transformedMembers)
                        setMembersLoading(false)
                        return
                    }
                }
            }

            // Fallback: Use club context members if org_members query fails or returns empty
            const memberIds = Array.from(new Set([...(activeOrg?.members || []), ...(activeOrg?.admins || [])]))
            const pendingIds = Array.from(new Set(activeOrg?.requests || []))
            const profileIds = Array.from(new Set([...memberIds, ...pendingIds]))

            if (profileIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url, major, graduation_year')
                    .in('id', profileIds)

                if (!profileError && profiles && profiles.length > 0) {
                    const fallbackMembers = profiles.map((profile) => {
                        const userId = profile.id
                        let role = 'member'
                        if (pendingIds.includes(userId)) {
                            role = 'pending'
                        } else if ((activeOrg?.admins || []).includes(userId)) {
                            role = 'admin'
                        }
                        return {
                            user_id: userId,
                            role,
                            joined_at: null,
                            profile,
                        }
                    })
                    setMemberProfiles(fallbackMembers)
                    setMembersLoading(false)
                    return
                }
            }

            // If all else fails, set empty array
            setMemberProfiles([])
        } catch (error) {
            console.error('Error fetching members:', error)
            setMemberProfiles([])
        } finally {
            setMembersLoading(false)
        }
    }, [org?.id])

    // Fetch posts
    const fetchPosts = useCallback(async () => {
        if (!org?.id) {
            setPostsLoading(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('id, title, body, created_at, media_urls, org_id')
                .eq('org_id', org.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (!error && data) {
                const withMedia = await Promise.all(
                    data.map(async (post) => {
                        const resolvedMedia = await resolveMediaUrls(post.media_urls || [])
                        return { ...post, media: resolvedMedia }
                    })
                )
                setClubPosts(withMedia)
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setPostsLoading(false)
        }
    }, [org?.id])

    // Fetch events
    const fetchEvents = useCallback(async () => {
        if (!org?.id) {
            setEventsLoading(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('org_id', org.id)
                .order('start_at', { ascending: true })

            if (!error && data) {
                setClubEvents(data)
            }
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setEventsLoading(false)
        }
    }, [org?.id])

    const fetchStateRef = useRef({
        orgId: null,
        membersLoaded: false,
        postsLoaded: false,
        eventsLoaded: false,
    })

    useEffect(() => {
        if (!org?.id) return

        if (fetchStateRef.current.orgId !== org.id) {
            fetchStateRef.current = {
                orgId: org.id,
                membersLoaded: false,
                postsLoaded: false,
                eventsLoaded: false,
            }
        }

        if (!fetchStateRef.current.membersLoaded) {
            fetchMembers().finally(() => {
                fetchStateRef.current.membersLoaded = true
            })
        }

        if (!fetchStateRef.current.postsLoaded) {
            fetchPosts().finally(() => {
                fetchStateRef.current.postsLoaded = true
            })
        }

        if (!fetchStateRef.current.eventsLoaded) {
            fetchEvents().finally(() => {
                fetchStateRef.current.eventsLoaded = true
            })
        }
    }, [org?.id, fetchMembers, fetchPosts, fetchEvents])

    const handleJoin = async () => {
        if (isMember) {
            await leaveClub(org.id)
            fetchMembers()
        } else {
            const result = await requestToJoin(org.id)
            if (!result?.ok) {
                Alert.alert('Request failed', result?.error || 'Unable to join this organization.')
            } else {
                fetchMembers()
            }
        }
    }

    const handleScroll = (event) => {
        if (scrollYRef) {
            scrollYRef.current = event.nativeEvent.contentOffset.y
        }
    }

    const handleApproveMember = async (member) => {
        if (!org?.id) return
        const success = await approveRequest(org.id, member.user_id)
        if (success) {
            setMemberProfiles(prev => prev.map(m => (
                m.user_id === member.user_id ? { ...m, role: 'member' } : m
            )))
        }
    }

    const handleRejectMember = async (member) => {
        if (!org?.id) return
        const success = await rejectRequest(org.id, member.user_id)
        if (success) {
            setMemberProfiles(prev => prev.filter(m => m.user_id !== member.user_id))
        }
    }

    const handleMessageAdmin = async (adminUserId) => {
        if (!user?.id || !adminUserId) return
        
        setMessagingAdmin(true)
        try {
            // Use the createConversation hook which handles finding existing or creating new DMs
            const result = await createConversation.mutateAsync({
                otherUserId: adminUserId,
            })
            
            if (result) {
                // result could be just the ID or an object with id
                const conversationId = typeof result === 'string' ? result : result?.id
                if (conversationId) {
                    onClose()
                    router.push(`/chat?conversationId=${conversationId}`)
                }
            }
        } catch (error) {
            console.error('Error messaging admin:', error)
            Alert.alert('Error', 'Failed to start conversation. Please try again.')
        } finally {
            setMessagingAdmin(false)
        }
    }

    const handleContactAdmins = () => {
        if (adminProfiles.length === 0) {
            Alert.alert('No Admins', 'This organization has no admins to contact.')
            return
        }

        if (adminProfiles.length === 1) {
            // Only one admin - message directly
            handleMessageAdmin(adminProfiles[0].user_id)
            return
        }

        // Multiple admins - show picker
        const adminNames = adminProfiles.map(a => a.profile?.full_name || a.profile?.username || 'Admin')
        
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', ...adminNames],
                    cancelButtonIndex: 0,
                    title: 'Select an admin to message',
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        handleMessageAdmin(adminProfiles[buttonIndex - 1].user_id)
                    }
                }
            )
        } else {
            Alert.alert(
                'Message Admin',
                'Select an admin to message:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    ...adminProfiles.map((admin, index) => ({
                        text: adminNames[index],
                        onPress: () => handleMessageAdmin(admin.user_id),
                    })),
                ]
            )
        }
    }

    // Edit handlers
    const handleOpenEditModal = () => {
        setEditName(org?.name || '')
        setEditDescription(org?.description || org?.mission_statement || '')
        setShowEditModal(true)
    }
    
    const handleSaveEdit = async () => {
        if (!org?.id || !editName.trim()) {
            Alert.alert('Error', 'Organization name is required')
            return
        }
        
        setIsSavingEdit(true)
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    name: editName.trim(),
                    mission_statement: editDescription.trim(),
                })
                .eq('id', org.id)
            
            if (error) {
                throw error
            }
            
            Alert.alert('Success', 'Organization updated successfully')
            setShowEditModal(false)
            // Refresh the clubs context
            if (typeof refetch === 'function') {
                refetch()
            }
        } catch (error) {
            console.error('Error updating org:', error)
            Alert.alert('Error', 'Failed to update organization. Please try again.')
        } finally {
            setIsSavingEdit(false)
        }
    }

    const renderPost = ({ item }) => (
        <TouchableOpacity
            style={styles(theme).postCard}
            onPress={() => {
                onClose()
                router.push(`/forum?postId=${item.id}`)
            }}
            activeOpacity={0.8}
        >
            {item.media && item.media[0] && (
                <Image source={{ uri: item.media[0] }} style={styles(theme).postImage} />
            )}
            <View style={styles(theme).postContent}>
                {item.title && <Text style={styles(theme).postTitle}>{item.title}</Text>}
                {item.body && <Text style={styles(theme).postBody} numberOfLines={3}>{item.body}</Text>}
            </View>
        </TouchableOpacity>
    )

    // Debounce ref to prevent double-taps
    const lastPressTimeRef = useRef(0)
    
    const renderMember = ({ item }) => {
        // Defensive check: ensure item has required fields
        if (!item || !item.user_id) {
            return null
        }

        const profile = item.profile || {}
        const displayName = profile.full_name || profile.username || 'User'
        const initials = profile.full_name?.charAt(0) || profile.username?.charAt(0) || '?'

        const handleMemberPress = () => {
            // Debounce - prevent double taps within 300ms
            const now = Date.now()
            if (now - lastPressTimeRef.current < 300) {
                return
            }
            lastPressTimeRef.current = now
            
            if (item.user_id) {
                openProfile(item.user_id)
            }
        }

        return (
            <TouchableOpacity
                style={styles(theme).memberItem}
                onPress={handleMemberPress}
                activeOpacity={0.7}
            >
                {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles(theme).memberAvatar} />
                ) : (
                    <View style={[styles(theme).memberAvatar, styles(theme).memberAvatarPlaceholder]}>
                        <Text style={styles(theme).memberAvatarText}>
                            {initials}
                        </Text>
                    </View>
                )}
                <View style={styles(theme).memberInfo}>
                    <Text style={styles(theme).memberName}>
                        {displayName}
                    </Text>
                    {item.role && (
                        <Text style={styles(theme).memberRole}>
                            {item.role === 'owner' ? 'Owner' : item.role === 'admin' ? 'Admin' : item.role === 'pending' ? 'Pending' : 'Member'}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        )
    }

    const renderEvent = ({ item }) => (
        <EventPost event={item} onPress={() => {
            onClose()
            router.push(`/events/${item.id}`)
        }} />
    )

    const formatMeetingTime = (value) => {
        if (!value) return ''
        if (typeof value === 'string') {
            const date = new Date(value)
            if (!Number.isNaN(date.getTime())) {
                const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
                const time = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                })
                return `${weekday} ${time}`
            }
            return value
        }
        if (typeof value === 'object' && value.day && value.time) {
            const date = new Date(value.time)
            if (!Number.isNaN(date.getTime())) {
                const time = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                })
                return `${value.day} ${time}`
            }
            return `${value.day}: ${value.time}`
        }
        return String(value)
    }

    // Header component for FlatList - memoized to prevent flickering
    const ListHeaderComponent = useCallback(() => (
        <>
            {/* Cover Image Banner */}
            {stableCoverImage ? (
                <Image
                    source={{ uri: stableCoverImage }}
                    style={styles(theme).coverImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles(theme).coverImagePlaceholder} />
            )}

            {/* Org Header */}
            <View style={styles(theme).orgHeader}>
                {stableAvatarImage ? (
                    <Image 
                        source={{ uri: stableAvatarImage }} 
                        style={styles(theme).orgAvatar}
                    />
                ) : (
                    <View style={[styles(theme).orgAvatar, styles(theme).orgAvatarPlaceholder]}>
                        <Text style={styles(theme).orgAvatarText}>{org?.name?.charAt(0) || 'O'}</Text>
                    </View>
                )}
                <Text style={styles(theme).orgName}>{org.name}</Text>
                {org.description && (
                    <Text style={styles(theme).orgDescription} numberOfLines={2}>{org.description}</Text>
                )}
            </View>

            {/* Stats */}
            <View style={styles(theme).statsRow}>
                <TouchableOpacity style={styles(theme).statItem} onPress={() => setActiveTab('members')} activeOpacity={0.7}>
                    <Text style={styles(theme).statValue}>{activeMemberCount}</Text>
                    <Text style={styles(theme).statLabel}>Members</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles(theme).statItem} onPress={() => setActiveTab('posts')} activeOpacity={0.7}>
                    <Text style={styles(theme).statValue}>{clubPosts.length}</Text>
                    <Text style={styles(theme).statLabel}>Posts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles(theme).statItem} onPress={() => setActiveTab('events')} activeOpacity={0.7}>
                    <Text style={styles(theme).statValue}>{clubEvents.length}</Text>
                    <Text style={styles(theme).statLabel}>Events</Text>
                </TouchableOpacity>
            </View>

            {/* Action Button */}
            {isAdmin ? (
                <View style={styles(theme).adminButtonsColumn}>
                    <View style={styles(theme).adminButtonsRow}>
                        <TouchableOpacity
                            style={[styles(theme).adminButton, styles(theme).adminButtonPrimary]}
                            onPress={() => {
                                const forumId = org?.forumId || org?.forum_id || org?.forum?.id
                                const params = forumId ? { forumId, createPost: '1' } : { createPost: '1' }
                                onClose()
                                router.push({ pathname: '/forum', params })
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={hp(2)} color={theme.colors.white} />
                            <Text style={styles(theme).adminButtonText}>Create Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles(theme).adminButton, styles(theme).adminButtonSecondary]}
                            onPress={handleOpenEditModal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="create-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                            <Text style={[styles(theme).adminButtonText, { color: theme.colors.bondedPurple }]}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={[styles(theme).adminButton, styles(theme).adminButtonTertiary]}
                        onPress={() => setActiveTab('members')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="people-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                        <Text style={[styles(theme).adminButtonText, { color: theme.colors.bondedPurple }]}>Manage Members</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles(theme).userActionsRow}>
                    <TouchableOpacity
                        style={[
                            styles(theme).actionButton,
                            styles(theme).actionButtonFlex,
                            isMember && styles(theme).actionButtonSecondary
                        ]}
                        onPress={handleJoin}
                        activeOpacity={0.8}
                        disabled={hasRequested}
                    >
                        <Text style={[styles(theme).actionButtonText, isMember && { color: theme.colors.textPrimary }]}>
                            {isMember ? 'Leave' : hasRequested ? 'Requested' : (org?.isPublic === false || org?.requiresApproval) ? 'Request to Join' : 'Join'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Message Admins button - show for non-members to ask questions */}
                    {!isMember && adminProfiles.length > 0 && (
                        <TouchableOpacity
                            style={[styles(theme).actionButton, styles(theme).messageAdminButton]}
                            onPress={handleContactAdmins}
                            activeOpacity={0.8}
                            disabled={messagingAdmin}
                        >
                            {messagingAdmin ? (
                                <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                            ) : (
                                <>
                                    <Ionicons name="chatbubble-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                                    <Text style={[styles(theme).actionButtonText, { color: theme.colors.bondedPurple, marginLeft: wp(1) }]}>
                                        Ask
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Tabs */}
            <View style={styles(theme).tabs}>
                {['about', 'members', 'posts', 'events'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles(theme).tab,
                            activeTab === tab && styles(theme).activeTab
                        ]}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles(theme).tabText,
                            activeTab === tab && styles(theme).activeTabText
                        ]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* About Tab Content (only shown when about is active) */}
            {activeTab === 'about' && (
                <View style={styles(theme).aboutContent}>
                    <Text style={styles(theme).aboutText}>{org.description || 'No description available.'}</Text>

                    {/* Meeting Times */}
                    {org.meetingTimes && org.meetingTimes.length > 0 && (
                        <View style={styles(theme).infoSection}>
                            <View style={styles(theme).infoHeader}>
                                <Ionicons name="time-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
                                <Text style={styles(theme).infoHeaderText}>Meeting Times</Text>
                            </View>
                            {org.meetingTimes.map((time, index) => (
                                <Text key={index} style={styles(theme).infoText}>
                                    {formatMeetingTime(time)}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Meeting Location */}
                    {org.meetingLocation && (
                        <View style={styles(theme).infoSection}>
                            <View style={styles(theme).infoHeader}>
                                <Ionicons name="location-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
                                <Text style={styles(theme).infoHeaderText}>Location</Text>
                            </View>
                            <Text style={styles(theme).infoText}>{org.meetingLocation}</Text>
                        </View>
                    )}

                    {/* Category */}
                    {org.category && (
                        <View style={styles(theme).infoSection}>
                            <View style={styles(theme).infoHeader}>
                                <Ionicons name="pricetag-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
                                <Text style={styles(theme).infoHeaderText}>Category</Text>
                            </View>
                            <Text style={styles(theme).infoText}>{org.category.charAt(0).toUpperCase() + org.category.slice(1)}</Text>
                        </View>
                    )}

                    {/* Contact Email */}
                    {org.contactEmail && (
                        <View style={styles(theme).infoSection}>
                            <View style={styles(theme).infoHeader}>
                                <Ionicons name="mail-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
                                <Text style={styles(theme).infoHeaderText}>Contact</Text>
                            </View>
                            <Text style={styles(theme).infoText}>{org.contactEmail}</Text>
                        </View>
                    )}
                </View>
            )}

            {activeTab === 'members' && (
                <View style={styles(theme).memberSearchWrapper}>
                    <Ionicons
                        name="search"
                        size={hp(2)}
                        color={theme.colors.textSecondary}
                        style={styles(theme).memberSearchIcon}
                    />
                    <TextInput
                        style={styles(theme).memberSearchInput}
                        placeholder="Search members"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={memberSearchQuery}
                        onChangeText={setMemberSearchQuery}
                    />
                    {memberSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                            <Ionicons name="close-circle" size={hp(2)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {activeTab === 'members' && isAdmin && (
                <View style={styles(theme).pendingSection}>
                    <Text style={styles(theme).pendingTitle}>Join Requests ({pendingMembers.length})</Text>
                    {pendingMembers.length > 0 ? (
                        pendingMembers.map((member) => {
                            const displayName = member.profile?.full_name || member.profile?.username || 'User'
                            return (
                                <View key={member.user_id} style={styles(theme).pendingItem}>
                                    <TouchableOpacity 
                                        onPress={() => member.user_id && openProfile(member.user_id)}
                                        activeOpacity={0.7}
                                        style={styles(theme).pendingAvatarTouchable}
                                    >
                                        {member.profile?.avatar_url ? (
                                            <Image source={{ uri: member.profile.avatar_url }} style={styles(theme).pendingAvatar} />
                                        ) : (
                                            <View style={styles(theme).pendingAvatarFallback}>
                                                <Text style={styles(theme).pendingAvatarText}>
                                                    {(displayName?.charAt(0) || 'U').toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles(theme).pendingInfo}
                                        onPress={() => member.user_id && openProfile(member.user_id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles(theme).pendingName}>{displayName}</Text>
                                        <Text style={styles(theme).pendingMeta}>Requested to join</Text>
                                    </TouchableOpacity>
                                    <View style={styles(theme).pendingActions}>
                                        <TouchableOpacity
                                            style={styles(theme).approveButton}
                                            onPress={() => handleApproveMember(member)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="checkmark" size={hp(2)} color={theme.colors.white} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles(theme).rejectButton}
                                            onPress={() => handleRejectMember(member)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close" size={hp(2)} color={theme.colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )
                        })
                    ) : (
                        <Text style={styles(theme).pendingEmpty}>No pending requests</Text>
                    )}
                </View>
            )}
        </>
    ), [
        org,
        stableCoverImage,
        stableAvatarImage,
        activeTab,
        memberProfiles,
        clubPosts,
        clubEvents,
        theme,
        pendingMembers,
        activeMemberCount,
        isAdmin,
        isMember,
        hasRequested,
        memberSearchQuery,
        handleApproveMember,
        handleRejectMember,
        handleJoin,
        onClose,
        router,
    ])

    // Get data based on active tab
    const getListData = () => {
        if (activeTab === 'about') return []
        if (activeTab === 'members') return filteredMembers
        if (activeTab === 'posts') return clubPosts
        if (activeTab === 'events') return clubEvents
        return []
    }

    const renderItem = ({ item }) => {
        if (activeTab === 'members') return renderMember({ item })
        if (activeTab === 'posts') return renderPost({ item })
        if (activeTab === 'events') return renderEvent({ item })
        return null
    }

    const renderEmpty = () => {
        if (activeTab === 'about') return null
        
        // Show loading spinner based on active tab
        const isLoading = (activeTab === 'members' && membersLoading) ||
                         (activeTab === 'posts' && postsLoading) ||
                         (activeTab === 'events' && eventsLoading)
        
        if (isLoading) {
            return <ActivityIndicator size="large" color={theme.colors.bondedPurple} style={{ marginTop: hp(4) }} />
        }

        let message = 'No items yet'
        if (activeTab === 'members') message = memberSearchQuery.trim() ? 'No matching members' : 'No members yet'
        if (activeTab === 'posts') message = 'No posts yet'
        if (activeTab === 'events') message = 'No events yet'

        return <Text style={styles(theme).emptyText}>{message}</Text>
    }

    return (
        <View style={styles(theme).container}>
            {panResponder && (
                <View
                    style={styles(theme).swipeHandleArea}
                    {...panResponder.panHandlers}
                />
            )}

            {/* Header */}
            <View style={styles(theme).header}>
                <TouchableOpacity onPress={onClose} style={styles(theme).closeButton} activeOpacity={0.7}>
                    <ArrowLeft size={hp(2.5)} color={theme.colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles(theme).dragIndicator} />
            </View>

            <FlatList
                data={getListData()}
                renderItem={renderItem}
                keyExtractor={(item, index) => item?.id || item?.user_id || index.toString()}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles(theme).listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                onScroll={handleScroll}
            />
            
            {/* Edit Organization Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles(theme).editModalOverlay}>
                    <View style={styles(theme).editModalContent}>
                        <View style={styles(theme).editModalHeader}>
                            <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles(theme).editModalClose}>
                                <Ionicons name="close" size={hp(3)} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles(theme).editModalTitle}>Edit Organization</Text>
                            <TouchableOpacity 
                                onPress={handleSaveEdit} 
                                disabled={isSavingEdit}
                                style={styles(theme).editModalSave}
                            >
                                {isSavingEdit ? (
                                    <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                                ) : (
                                    <Text style={styles(theme).editModalSaveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles(theme).editModalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles(theme).editLabel}>Organization Name</Text>
                            <TextInput
                                style={styles(theme).editInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter organization name"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            
                            <Text style={styles(theme).editLabel}>Description</Text>
                            <TextInput
                                style={[styles(theme).editInput, styles(theme).editTextArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder="Enter organization description"
                                placeholderTextColor={theme.colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp(4),
        paddingTop: hp(2),
        paddingBottom: hp(1),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    swipeHandleArea: {
        position: 'absolute',
        top: 0,
        left: wp(15),
        right: wp(15),
        height: hp(4),
        zIndex: 5,
    },
    closeButton: {
        position: 'absolute',
        left: wp(4),
        top: hp(2),
        zIndex: 10,
        padding: hp(1),
    },
    dragIndicator: {
        width: wp(12),
        height: hp(0.5),
        backgroundColor: theme.colors.border,
        borderRadius: theme.radius.full,
    },
    listContent: {
        paddingBottom: hp(4),
    },
    coverImage: {
        width: '100%',
        height: hp(20),
        backgroundColor: theme.colors.border,
    },
    coverImagePlaceholder: {
        width: '100%',
        height: hp(20),
        backgroundColor: theme.colors.backgroundSecondary,
    },
    orgHeader: {
        alignItems: 'center',
        paddingVertical: hp(3),
        paddingHorizontal: wp(6),
        marginTop: hp(-6),
    },
    orgAvatar: {
        width: hp(12),
        height: hp(12),
        borderRadius: hp(6),
        marginBottom: hp(2),
        borderWidth: 4,
        borderColor: theme.colors.background,
    },
    orgAvatarPlaceholder: {
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orgAvatarText: {
        fontSize: hp(4),
        fontWeight: '800',
        color: theme.colors.white,
        fontFamily: theme.typography.fontFamily.heading,
    },
    orgName: {
        fontSize: hp(2.6),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
        marginBottom: hp(1),
        textAlign: 'center',
    },
    orgDescription: {
        fontSize: hp(1.6),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        textAlign: 'center',
        lineHeight: hp(2.2),
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: hp(2),
        paddingHorizontal: wp(6),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: hp(2.4),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
    },
    statLabel: {
        fontSize: hp(1.4),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        marginTop: hp(0.3),
    },
    userActionsRow: {
        flexDirection: 'row',
        marginHorizontal: wp(6),
        marginTop: hp(2),
        gap: wp(2),
    },
    actionButton: {
        marginHorizontal: wp(6),
        marginTop: hp(2),
        paddingVertical: hp(1.5),
        backgroundColor: theme.colors.bondedPurple,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
    },
    actionButtonFlex: {
        flex: 1,
        marginHorizontal: 0,
        marginTop: 0,
    },
    actionButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    messageAdminButton: {
        flexDirection: 'row',
        paddingHorizontal: wp(4),
        marginHorizontal: 0,
        marginTop: 0,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.bondedPurple,
    },
    actionButtonText: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.white,
        fontFamily: theme.typography.fontFamily.body,
    },
    adminButtonsRow: {
        flexDirection: 'row',
        gap: wp(2),
    },
    adminButtonsColumn: {
        marginHorizontal: wp(6),
        marginTop: hp(2),
        gap: hp(1.2),
    },
    adminButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(1.5),
        borderRadius: theme.radius.lg,
        gap: wp(2),
    },
    adminButtonPrimary: {
        backgroundColor: theme.colors.bondedPurple,
    },
    adminButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.bondedPurple,
    },
    adminButtonTertiary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.bondedPurple,
    },
    adminButtonText: {
        fontSize: hp(1.7),
        fontWeight: '600',
        color: theme.colors.white,
        fontFamily: theme.typography.fontFamily.body,
    },
    tabs: {
        flexDirection: 'row',
        marginTop: hp(2),
        marginHorizontal: wp(4),
        marginBottom: hp(1.5),
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.radius.lg,
        padding: hp(0.5),
    },
    tab: {
        flex: 1,
        paddingVertical: hp(1),
        alignItems: 'center',
        borderRadius: theme.radius.md,
    },
    activeTab: {
        backgroundColor: theme.colors.background,
    },
    tabText: {
        fontSize: hp(1.6),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        fontWeight: '500',
    },
    activeTabText: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    memberSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginHorizontal: wp(4),
        marginTop: hp(1.5),
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.1),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.colors.borderSecondary,
    },
    memberSearchIcon: {
        marginRight: wp(1),
    },
    memberSearchInput: {
        flex: 1,
        fontSize: hp(1.6),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
    },
    aboutContent: {
        paddingHorizontal: wp(6),
        paddingTop: hp(2),
        paddingBottom: hp(4),
    },
    pendingSection: {
        marginTop: hp(2),
        marginHorizontal: wp(4),
        padding: wp(3),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
    },
    pendingTitle: {
        fontSize: hp(1.7),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
        marginBottom: hp(1),
    },
    pendingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
    },
    pendingAvatarTouchable: {
        marginRight: wp(3),
    },
    pendingAvatar: {
        width: hp(4.5),
        height: hp(4.5),
        borderRadius: hp(2.25),
    },
    pendingAvatarFallback: {
        width: hp(4.5),
        height: hp(4.5),
        borderRadius: hp(2.25),
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingAvatarText: {
        fontSize: hp(1.8),
        fontWeight: '700',
        color: theme.colors.white,
        fontFamily: theme.typography.fontFamily.heading,
    },
    pendingInfo: {
        flex: 1,
    },
    pendingName: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
    },
    pendingMeta: {
        fontSize: hp(1.3),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        marginTop: hp(0.2),
    },
    pendingActions: {
        flexDirection: 'row',
        gap: wp(2),
    },
    approveButton: {
        width: hp(3.4),
        height: hp(3.4),
        borderRadius: hp(1.7),
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        width: hp(3.4),
        height: hp(3.4),
        borderRadius: hp(1.7),
        backgroundColor: theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingEmpty: {
        fontSize: hp(1.4),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
    },
    aboutText: {
        fontSize: hp(1.7),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
        lineHeight: hp(2.4),
        marginBottom: hp(2),
    },
    infoSection: {
        marginTop: hp(2),
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(1),
    },
    infoHeaderText: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
        marginLeft: wp(2),
    },
    infoText: {
        fontSize: hp(1.6),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        lineHeight: hp(2.2),
        marginLeft: wp(8),
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(6),
        marginBottom: hp(1),
        backgroundColor: theme.colors.surface,
        marginHorizontal: wp(4),
        borderRadius: theme.radius.md,
    },
    memberAvatar: {
        width: hp(5),
        height: hp(5),
        borderRadius: hp(2.5),
        marginRight: wp(3),
    },
    memberAvatarPlaceholder: {
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberAvatarText: {
        fontSize: hp(2),
        fontWeight: '700',
        color: theme.colors.white,
        fontFamily: theme.typography.fontFamily.heading,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: hp(1.7),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
    },
    memberRole: {
        fontSize: hp(1.4),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        marginTop: hp(0.2),
    },
    postCard: {
        marginBottom: hp(2),
        marginHorizontal: wp(4),
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        maxWidth: '100%',
    },
    postImage: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: hp(40),
        backgroundColor: theme.colors.border,
    },
    postContent: {
        padding: wp(4),
    },
    postTitle: {
        fontSize: hp(1.8),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
        marginBottom: hp(0.5),
    },
    postBody: {
        fontSize: hp(1.6),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        lineHeight: hp(2.2),
    },
    emptyText: {
        fontSize: hp(1.7),
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily.body,
        textAlign: 'center',
        marginTop: hp(4),
    },
    // Edit Modal Styles
    editModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    editModalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        maxHeight: '80%',
        minHeight: '50%',
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingVertical: hp(2),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    editModalClose: {
        padding: hp(0.5),
    },
    editModalTitle: {
        fontSize: hp(2),
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
    },
    editModalSave: {
        padding: hp(0.5),
    },
    editModalSaveText: {
        fontSize: hp(1.8),
        fontWeight: '600',
        color: theme.colors.bondedPurple,
        fontFamily: theme.typography.fontFamily.body,
    },
    editModalBody: {
        padding: wp(4),
    },
    editLabel: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
        marginBottom: hp(1),
        marginTop: hp(2),
    },
    editInput: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.radius.md,
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        fontSize: hp(1.8),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    editTextArea: {
        minHeight: hp(15),
        paddingTop: hp(1.5),
    },
})

export default OrgModalContent
