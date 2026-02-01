import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AppTopBar from '../../components/AppTopBar'
import BottomNav from '../../components/BottomNav'
import EventPost from '../../components/Events/EventPost'
import InviteModal from '../../components/InviteModal'
import ShareModal from '../../components/ShareModal'
import { useClubsContext } from '../../contexts/ClubsContext'
import { useOrgModal } from '../../contexts/OrgModalContext'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { resolveMediaUrls, uploadImageToBondedMedia } from '../../helpers/mediaStorage'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useCreatePost } from '../../hooks/useCreatePost'
import { hp, wp } from '../../helpers/common'
import { getFriendlyErrorMessage } from '../../utils/userFacingErrors'
import { useAppTheme } from '../theme'

export default function ClubDetail() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { user } = useAuthStore()
  const {
    getClub,
    isUserMember,
    hasUserRequested,
    requestToJoin,
    approveRequest,
    rejectRequest,
    leaveClub,
    isUserAdmin,
    removeMember,
    ensureClubForum,
    currentUserId,
  } = useClubsContext()
  const createPostMutation = useCreatePost()
  const queryClient = useQueryClient()
  const { openProfile } = useProfileModal()
  const { openOrg } = useOrgModal()
  const [activeTab, setActiveTab] = useState('posts') // Default to posts for Instagram-like view
  const [viewMode, setViewMode] = useState('member') // LinkedIn-style view switcher ('member' | 'admin')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isHydratingClub, setIsHydratingClub] = useState(true)
  const [memberProfiles, setMemberProfiles] = useState([])
  const [adminProfiles, setAdminProfiles] = useState([])
  const [pendingProfiles, setPendingProfiles] = useState([])
  const [clubPosts, setClubPosts] = useState([])
  const [postsCount, setPostsCount] = useState(0)
  const [clubEvents, setClubEvents] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [postCaption, setPostCaption] = useState('')
  const [postImage, setPostImage] = useState(null)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [campusForumId, setCampusForumId] = useState(null)

  const scrollViewRef = useRef(null)
  const postsTabPositionRef = useRef(0)

  const club = getClub(id)
  const isAdmin = club ? isUserAdmin(club.id) : false

  // Auto-open modal for deep linking (redirect to modal)
  useEffect(() => {
    if (id) {
      openOrg(id)
      // Navigate back to previous page or home
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back()
        } else {
          router.replace('/forum')
        }
      }, 100)
    }
  }, [id, openOrg])

  // Helper to scroll to posts section
  const scrollToPosts = useCallback(() => {
    setActiveTab('posts')
    setTimeout(() => {
      if (scrollViewRef.current && postsTabPositionRef.current > 0) {
        scrollViewRef.current.scrollTo({
          y: postsTabPositionRef.current - hp(10), // Offset for header
          animated: true
        })
      }
    }, 100) // Small delay to ensure layout is complete
  }, [])

  const forumId = useMemo(() => {
    if (!club?.forumId) return null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(club.forumId) ? club.forumId : null
  }, [club?.forumId])

  // Auto-switch to admin view if user is admin
  useEffect(() => {
    if (isAdmin && viewMode === 'member') {
      setViewMode('admin')
    }
  }, [isAdmin])

  // Hydration timeout for club loading
  useEffect(() => {
    if (club) {
      setIsHydratingClub(false)
      return
    }
    const timeout = setTimeout(() => setIsHydratingClub(false), 600)
    return () => clearTimeout(timeout)
  }, [club])

  const fetchMembers = useCallback(async () => {
    if (!club?.id) return
    setMembersLoading(true)
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('user_id, role, joined_at, profile:profiles(id, full_name, username, avatar_url, major, graduation_year)')
        .eq('organization_id', club.id)

      if (error || !data || data.length === 0) {
        console.warn('Failed to load org members:', error)
        if (club?.members?.length) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, major, graduation_year')
            .in('id', club.members)

          if (!profileError) {
            const fallbackMembers = (profiles || []).map((profile) => ({
              user_id: profile.id,
              role: club.admins?.includes(profile.id) ? 'admin' : 'member',
              joined_at: null,
              profile,
            }))
            setMemberProfiles(fallbackMembers)
            setAdminProfiles(fallbackMembers.filter((row) => row.role === 'admin'))
            setPendingProfiles([])
            return
          }
        }
        setMemberProfiles([])
        setAdminProfiles([])
        setPendingProfiles([])
        return
      }

      const members = (data || []).filter((row) => row.role !== 'pending')
      const admins = (data || []).filter((row) => row.role === 'admin' || row.role === 'owner')
      const pending = (data || []).filter((row) => row.role === 'pending')

      setMemberProfiles(members)
      setAdminProfiles(admins)
      setPendingProfiles(pending)
    } finally {
      setMembersLoading(false)
    }
  }, [club?.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  useEffect(() => {
    if (!club?.id) return

    const fetchEvents = async () => {
      setEventsLoading(true)
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('org_id', club.id)
          .order('start_at', { ascending: true })

        if (error) {
          console.warn('Failed to load club events:', error)
          setClubEvents([])
          return
        }
        setClubEvents(data || [])
      } finally {
        setEventsLoading(false)
      }
    }

    fetchEvents()
  }, [club?.id])

  useEffect(() => {
    if (!club?.id) return

    const fetchCampusForum = async () => {
      if (!user?.id) return
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile?.university_id) return

        const { data: forums, error: forumsError } = await supabase
          .from('forums')
          .select('id, type')
          .eq('university_id', profile.university_id)
          .eq('type', 'campus')
          .limit(1)

        if (!forumsError && forums?.[0]?.id) {
          setCampusForumId(forums[0].id)
        }
      } catch (error) {
        // Non-blocking.
      }
    }

    fetchCampusForum()
  }, [club?.id, user?.id])

  const fetchPosts = useCallback(async () => {
    if (!club?.id) return
    setPostsLoading(true)
    try {
      let targetForumId = campusForumId || forumId

      if (!targetForumId && isAdmin) {
        targetForumId = await ensureClubForum(club.id)
      }

      if (!targetForumId) {
        setClubPosts([])
        setPostsCount(0)
        return
      }

      const { data, error, count } = await supabase
        .from('posts')
        .select('id, title, body, created_at, user_id, media_urls, org_id', { count: 'exact' })
        .eq('forum_id', targetForumId)
        .eq('org_id', club.id)
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) {
        console.warn('Failed to load club posts:', error)
        setClubPosts([])
        setPostsCount(0)
        return
      }

      const withMedia = await Promise.all(
        (data || []).map(async (post) => {
          const resolvedMedia = await resolveMediaUrls(post.media_urls || [])
          return {
            ...post,
            media: resolvedMedia,
          }
        })
      )

      setClubPosts(withMedia)
      setPostsCount(count || data?.length || 0)
    } finally {
      setPostsLoading(false)
    }
  }, [club?.id, forumId, campusForumId, isAdmin, ensureClubForum])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  if (!club && isHydratingClub) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="Your University"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
            <Text style={styles.loadingText}>Loading organization...</Text>
          </View>
          <BottomNav />
        </View>
      </SafeAreaView>
    )
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="University of Rhode Island"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Club not found</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
          <BottomNav />
        </View>
      </SafeAreaView>
    )
  }

  const isMember = memberProfiles.some((member) => member.user_id === currentUserId) || isUserMember(club.id)
  const hasRequested = pendingProfiles.some((member) => member.user_id === currentUserId) || hasUserRequested(club.id)
  const memberCount = memberProfiles.length || club.members?.length || 0
  const requiresApproval = club.requiresApproval === true
  const needsApproval = requiresApproval || club.isPublic === false

  const handleJoin = async () => {
    if (isMember) {
      await leaveClub(club.id)
      setMemberProfiles((prev) => prev.filter((member) => member.user_id !== currentUserId))
      return
    } else {
      const result = await requestToJoin(club.id)
      if (!result?.ok) {
        Alert.alert('Request failed', result?.error || 'Unable to join this organization.')
        return
      }
      await fetchMembers()
    }
  }

  const handleOpenEdit = () => {
    setEditName(club.name || '')
    setEditDescription(club.description || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Name required', 'Please enter a name for the organization.')
      return
    }

    setIsSavingEdit(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
        })
        .eq('id', club.id)

      if (error) throw error

      Alert.alert('Success', 'Organization updated successfully')
      setShowEditModal(false)
      // Trigger refetch by router navigation or context update
      router.replace(`/clubs/${club.id}`)
    } catch (error) {
      console.error('Error updating organization:', error)
      Alert.alert('Error', 'Failed to update organization. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const pickPostImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      })

      if (!result.canceled && result.assets?.[0]) {
        setPostImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const handleCreateOrgPost = async () => {
    if (!club?.id || !user?.id) return
    if (!postImage) {
      Alert.alert('Add a photo', 'Please select a photo for this post.')
      return
    }

    const targetForumId = campusForumId || forumId
    if (!targetForumId) {
      Alert.alert('Forum missing', 'Your campus forum is not available yet.')
      return
    }

    if (isCreatingPost) return
    setIsCreatingPost(true)

    const caption = postCaption.trim()
    const body = caption.length > 0 ? caption : `${club.name} shared a photo.`
    try {
      // Create post with org_id directly
      const postData = {
        forum_id: targetForumId,
        user_id: user.id,
        org_id: club.id, // Set org_id on creation
        title: '',
        body,
        tags: [],
        media_urls: [],
        is_anonymous: false,
        upvotes_count: 0,
        comments_count: 0,
        reposts_count: 0,
      }

      const { data: createdPost, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      if (postError) {
        throw postError
      }

      if (createdPost?.id) {

        const uploadResult = await uploadImageToBondedMedia({
          fileUri: postImage,
          mediaType: 'org_post',
          ownerType: 'org',
          ownerId: club.id,
          userId: user.id,
          orgId: club.id,
          postId: createdPost.id,
        })

        if (uploadResult?.path) {
          await supabase
            .from('posts')
            .update({ media_urls: [uploadResult.path] })
            .eq('id', createdPost.id)
        }

        // Invalidate React Query cache to ensure fresh data with org info
        queryClient.invalidateQueries(['posts', targetForumId])
      }

      setPostCaption('')
      setPostImage(null)
      setShowCreatePostModal(false)
      // Refresh posts list
      await fetchPosts()
    } catch (error) {
      console.error('Failed to create post:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to create post.'))
    } finally {
      setIsCreatingPost(false)
    }
  }

  const renderMember = ({ item }) => {
    const profile = item.profile || {}
    const userId = item.user_id
    const displayName = profile.full_name || profile.username || 'Member'
    const isCurrentUser = userId === currentUserId
    const adminIds = adminProfiles.map((admin) => admin.user_id)
    const canRemove = isAdmin && viewMode === 'admin' && !isCurrentUser && !adminIds.includes(userId)

    const handleRemoveMember = () => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${displayName} from ${club.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await removeMember(club.id, userId)
              if (success) {
                setMemberProfiles((prev) => prev.filter((member) => member.user_id !== userId))
                Alert.alert('Success', 'Member removed successfully')
              } else {
                Alert.alert('Error', 'Failed to remove member')
              }
            },
          },
        ]
      )
    }

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => openProfile(userId)}
        activeOpacity={0.7}
      >
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatar} />
        ) : (
          <View style={styles.memberAvatarFallback}>
            <Text style={styles.memberAvatarInitial}>
              {(displayName?.charAt(0) || 'M').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.memberName} numberOfLines={1}>
          {displayName}
        </Text>
        {canRemove && (
          <TouchableOpacity
            style={styles.removeMemberButton}
            onPress={(e) => {
              e.stopPropagation()
              handleRemoveMember()
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={hp(1.8)} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={styles.orgPostCard}
      onPress={() => router.push(`/forum?postId=${item.id}`)}
      activeOpacity={0.8}
    >
      {item.media?.[0] ? (
        <Image source={{ uri: item.media[0] }} style={styles.orgPostImage} />
      ) : (
        <View style={styles.orgPostImagePlaceholder}>
          <Ionicons name="image-outline" size={hp(3.5)} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.orgPostContent}>
        <Text style={styles.orgPostCaption} numberOfLines={3}>
          {item.body || 'New post'}
        </Text>
        <Text style={styles.orgPostDate}>
          {new Date(item.created_at || item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="Your University"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Image / Banner */}
          <View style={styles.heroSection}>
            {club.coverImage ? (
              <Image source={{ uri: club.coverImage }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="image-outline" size={hp(4)} color={theme.colors.softBlack} style={{ opacity: 0.3 }} />
              </View>
            )}
          </View>

          <View style={styles.contentSection}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {club.avatar ? (
                  <Image source={{ uri: club.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {club.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileText}>
                <View style={styles.clubNameRow}>
                  <Text style={styles.clubName}>{club.name}</Text>
                  {isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.clubHandle}>
                  {(club.category.charAt(0).toUpperCase() + club.category.slice(1))} · {club.isPublic ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              {hasRequested ? (
                <View style={[styles.actionButtonSecondary, styles.actionButton]}>
                  <Ionicons name="time-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.actionButtonText}>Request Pending</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleJoin}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isMember ? 'checkmark-circle' : 'add-circle-outline'}
                    size={hp(2)}
                    color={theme.colors.white}
                  />
                  <Text style={styles.actionButtonPrimaryText}>
                    {isMember ? 'Leave Club' : (needsApproval ? 'Request to join' : 'Join Club')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => setShowShareModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={hp(2)} color={theme.colors.textPrimary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={styles.createOrgPostButton}
                onPress={() => setShowCreatePostModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={hp(2.2)} color={theme.colors.white} />
                <Text style={styles.createOrgPostText}>Create post</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={styles.createOrgEventButton}
                onPress={() => router.push({ pathname: '/events/create', params: { orgId: club.id } })}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={hp(2.2)} color={theme.colors.white} />
                <Text style={styles.createOrgPostText}>Create event</Text>
              </TouchableOpacity>
            )}

            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setShowMembersModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.statValue}>{memberCount}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={scrollToPosts} activeOpacity={0.7}>
                <Text style={styles.statValue}>{postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('events')} activeOpacity={0.7}>
                <Text style={styles.statValue}>{clubEvents.length}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bioText}>{club.description || 'No bio yet.'}</Text>
            </View>

            {(club.meetingTimes || club.meetingLocation) && (
              <View style={styles.meetingInfoSection}>
                <Text style={styles.sectionTitle}>Meeting Info</Text>
                {club.meetingTimes && club.meetingTimes.length > 0 && (
                  <View style={styles.meetingTimesContainer}>
                    {club.meetingTimes.map((meeting, index) => (
                      <View key={index} style={styles.meetingTimeCard}>
                        <View style={styles.meetingTimeHeader}>
                          <Ionicons name="time-outline" size={hp(2)} color={theme.colors.accent} />
                          <Text style={styles.meetingDay}>{meeting.day}</Text>
                          {!club.isMeetingPublic && (
                            <Ionicons name="lock-closed-outline" size={hp(1.5)} color={theme.colors.textSecondary} style={{ marginLeft: theme.spacing.xs }} />
                          )}
                        </View>
                        <Text style={styles.meetingTime}>
                          {new Date(meeting.time).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {club.meetingLocation && (
                  <View style={styles.meetingLocationCard}>
                    <Ionicons name="location-outline" size={hp(2)} color={theme.colors.accent} />
                    <Text style={styles.meetingLocationText}>{club.meetingLocation}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* View Switcher - LinkedIn style (Admin only) */}
          {isAdmin && (
            <View style={styles.viewSwitcherContainer}>
              <View style={styles.viewSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.viewSwitcherButton,
                    viewMode === 'member' && styles.viewSwitcherButtonActive,
                  ]}
                  onPress={() => setViewMode('member')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.viewSwitcherText,
                      viewMode === 'member' && styles.viewSwitcherTextActive,
                    ]}
                  >
                    Member view
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewSwitcherButton,
                    viewMode === 'admin' && styles.viewSwitcherButtonActive,
                  ]}
                  onPress={() => setViewMode('admin')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.viewSwitcherText,
                      viewMode === 'admin' && styles.viewSwitcherTextActive,
                    ]}
                  >
                    Admin view
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isAdmin && (
            <View style={styles.adminToolsSection}>
              <Text style={styles.sectionTitle}>Admin tools</Text>
              <View style={styles.adminToolsRow}>
                <TouchableOpacity
                  style={styles.adminToolButton}
                  onPress={handleOpenEdit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.adminToolText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adminToolButton}
                  onPress={() => setShowInviteModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.adminToolText}>Invites</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adminToolButton}
                  onPress={() => setShowMembersModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.adminToolText}>Members</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tabs - Instagram style */}
          <View style={styles.tabs}>
            {isAdmin && viewMode === 'admin'
              ? ['posts', 'events', 'requests'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      activeTab === tab && styles.tabActive,
                    ]}
                    onPress={() => {
                      if (tab === 'posts') {
                        scrollToPosts()
                      } else {
                        setActiveTab(tab)
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        tab === 'posts' ? 'grid-outline' :
                        tab === 'events' ? 'calendar-outline' :
                        tab === 'requests' ? 'person-add-outline' :
                        'albums-outline'
                      }
                      size={hp(2.2)}
                      color={activeTab === tab ? theme.colors.textPrimary : theme.colors.textSecondary}
                      style={{ opacity: activeTab === tab ? 1 : 0.5 }}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab && styles.tabTextActive,
                      ]}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))
              : ['posts', 'events'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      activeTab === tab && styles.tabActive,
                    ]}
                    onPress={() => {
                      if (tab === 'posts') {
                        scrollToPosts()
                      } else {
                        setActiveTab(tab)
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        tab === 'posts' ? 'grid-outline' :
                        tab === 'events' ? 'calendar-outline' :
                        'grid-outline'
                      }
                      size={hp(2.2)}
                      color={activeTab === tab ? theme.colors.textPrimary : theme.colors.textSecondary}
                      style={{ opacity: activeTab === tab ? 1 : 0.5 }}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab && styles.tabTextActive,
                      ]}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Leadership */}
              {adminProfiles.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Leadership</Text>
                  {adminProfiles.map((leader) => (
                    <View key={leader.user_id} style={styles.leaderItem}>
                      <View style={styles.leaderInfo}>
                        <Text style={styles.leaderName}>
                          {leader.profile?.full_name || leader.profile?.username || 'Admin'}
                        </Text>
                        <Text style={styles.leaderRole}>Admin</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Quick Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{memberCount}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{postsCount}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{clubEvents.length}</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'posts' && (
            <View
              style={styles.tabContent}
              onLayout={(event) => {
                postsTabPositionRef.current = event.nativeEvent.layout.y
              }}
            >
              {postsLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                </View>
              ) : clubPosts.length > 0 ? (
                <FlatList
                  data={clubPosts}
                  renderItem={renderPost}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="document-text-outline"
                    size={hp(5)}
                    color={theme.colors.textSecondary}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'events' && (
            <View style={styles.tabContent}>
              {eventsLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
                </View>
              ) : clubEvents.length > 0 ? (
                <FlatList
                  data={clubEvents}
                  renderItem={({ item }) => (
                    <EventPost event={item} forumId={club.forumId} />
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="calendar-outline"
                    size={hp(5)}
                    color={theme.colors.textSecondary}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={styles.emptyStateText}>No events yet</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'requests' && isAdmin && viewMode === 'admin' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Join Requests ({pendingProfiles.length})</Text>
              {pendingProfiles.length > 0 ? (
                <FlatList
                  data={pendingProfiles}
                  renderItem={({ item }) => {
                    const profile = item.profile || {}
                    const userId = item.user_id
                    const displayName = profile.full_name || profile.username || 'User'
                    return (
                      <View style={styles.requestItem}>
                        {profile.avatar_url ? (
                          <Image source={{ uri: profile.avatar_url }} style={styles.requestAvatar} />
                        ) : (
                          <View style={styles.requestAvatarFallback}>
                            <Text style={styles.memberAvatarInitial}>
                              {(displayName?.charAt(0) || 'U').toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestName}>{displayName}</Text>
                          <Text style={styles.requestTime}>
                            Requested {item.joined_at ? new Date(item.joined_at).toLocaleDateString() : 'recently'}
                          </Text>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={styles.approveButton}
                            onPress={async () => {
                              const success = await approveRequest(club.id, userId)
                              if (success) {
                                setPendingProfiles((prev) => prev.filter((member) => member.user_id !== userId))
                                setMemberProfiles((prev) => [...prev, { ...item, role: 'member' }])
                              }
                            }}
                          >
                            <Ionicons name="checkmark" size={hp(2)} color={theme.colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={async () => {
                              const success = await rejectRequest(club.id, userId)
                              if (success) {
                                setPendingProfiles((prev) => prev.filter((member) => member.user_id !== userId))
                              }
                            }}
                          >
                            <Ionicons name="close" size={hp(2)} color={theme.colors.white} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  }}
                  keyExtractor={(item) => item}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="person-add-outline"
                    size={hp(5)}
                    color={theme.colors.textSecondary}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={styles.emptyStateText}>No pending requests</Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* Invite Modal */}
        <InviteModal
          visible={showInviteModal}
          clubName={club.name}
          onClose={() => setShowInviteModal(false)}
          onInvite={(userIds) => {
            // TODO: Send invites to selected users
            Alert.alert('Success', `Invited ${userIds.length} people to ${club.name}`)
          }}
        />

        {/* Share Modal */}
        <ShareModal
          visible={showShareModal}
          content={{
            type: 'club',
            data: {
              id: club.id,
              name: club.name,
              category: club.category,
              members: club.members,
            }
          }}
          onClose={() => setShowShareModal(false)}
        />

        {/* Edit Modal */}
        <Modal visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
          <SafeAreaView style={styles.createPostModalSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.createPostHeader, { paddingTop: Math.max(hp(1.5), insets.top * 0.6) }]}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.createPostClose}>
                <Ionicons name="close" size={hp(3)} color={theme.colors.charcoal} />
              </TouchableOpacity>
              <Text style={styles.createPostTitle}>Edit Organization</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit} style={styles.createPostSubmit}>
                <Text style={styles.createPostSubmitText}>{isSavingEdit ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.createPostBody} contentContainerStyle={{ padding: wp(4), gap: hp(2) }}>
              <View>
                <Text style={styles.messageLabel}>Name</Text>
                <TextInput
                  style={[styles.createPostCaption, { minHeight: hp(5.5), paddingVertical: hp(1.5) }]}
                  placeholder="Organization name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>
              <View>
                <Text style={styles.messageLabel}>Description</Text>
                <TextInput
                  style={styles.createPostCaption}
                  placeholder="Describe your organization..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal visible={showCreatePostModal} animationType="slide" onRequestClose={() => setShowCreatePostModal(false)}>
          <SafeAreaView style={styles.createPostModalSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.createPostHeader, { paddingTop: Math.max(hp(1.5), insets.top * 0.6) }]}>
              <TouchableOpacity onPress={() => setShowCreatePostModal(false)} style={styles.createPostClose}>
                <Ionicons name="close" size={hp(3)} color={theme.colors.charcoal} />
              </TouchableOpacity>
              <Text style={styles.createPostTitle}>New post</Text>
              <TouchableOpacity onPress={handleCreateOrgPost} disabled={isCreatingPost} style={styles.createPostSubmit}>
                <Text style={styles.createPostSubmitText}>{isCreatingPost ? 'Posting...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.createPostBody}>
              <TouchableOpacity style={styles.createPostImagePicker} onPress={pickPostImage} activeOpacity={0.8}>
                {postImage ? (
                  <Image source={{ uri: postImage }} style={styles.createPostImage} />
                ) : (
                  <View style={styles.createPostImagePlaceholder}>
                    <Ionicons name="image-outline" size={hp(3.5)} color={theme.colors.textSecondary} />
                    <Text style={styles.createPostImageText}>Add a photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.createPostCaption}
                placeholder="Write a caption..."
                placeholderTextColor={theme.colors.textSecondary}
                value={postCaption}
                onChangeText={setPostCaption}
                multiline
              />
            </View>
          </SafeAreaView>
        </Modal>

        <Modal visible={showMembersModal} animationType="slide" onRequestClose={() => setShowMembersModal(false)}>
          <SafeAreaView style={styles.membersModalSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.membersModalHeader, { paddingTop: Math.max(hp(3.5), insets.top + hp(1.5)) }]}>
              <TouchableOpacity onPress={() => setShowMembersModal(false)} style={styles.membersModalClose}>
                <Ionicons name="close" size={hp(3)} color={theme.colors.charcoal} />
              </TouchableOpacity>
              <Text style={styles.membersModalTitle}>Members</Text>
              <View style={styles.membersModalSpacer} />
            </View>
            {membersLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={theme.colors.bondedPurple} />
              </View>
            ) : memberProfiles.length > 0 ? (
              <FlatList
                data={memberProfiles}
                renderItem={renderMember}
                keyExtractor={(item) => item.user_id}
                numColumns={2}
                columnWrapperStyle={styles.membersRow}
                contentContainerStyle={styles.membersModalList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={hp(5)} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={styles.emptyStateText}>No members yet</Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(18),
  },
  heroSection: {
    width: '100%',
    height: hp(42),
    backgroundColor: theme.colors.bondedPurple + '10',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.bondedPurple + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    marginTop: -hp(3),
    paddingHorizontal: wp(5),
    paddingTop: hp(2.5),
    paddingBottom: hp(6),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginBottom: hp(2),
  },
  avatarContainer: {
    width: hp(8.5),
    height: hp(8.5),
    borderRadius: hp(4.25),
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: hp(4.25),
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: hp(4.25),
    backgroundColor: theme.colors.bondedPurple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: hp(3.2),
    fontWeight: '800',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
  },
  profileText: {
    flex: 1,
    gap: hp(0.6),
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flexWrap: 'wrap',
  },
  clubName: {
    fontSize: hp(2.6),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  clubHandle: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  adminBadge: {
    backgroundColor: theme.colors.info + '20',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: theme.radius.sm,
  },
  adminBadgeText: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.info,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1.5),
    marginBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: hp(0.4),
  },
  statValue: {
    fontSize: hp(2.1),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.3),
    borderRadius: theme.radius.lg,
    gap: wp(2),
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.bondedPurple,
  },
  actionButtonPrimaryText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  bioSection: {
    marginBottom: hp(2),
  },
  bioText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    lineHeight: hp(2.5),
  },
  membersModalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  membersModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  membersModalClose: {
    padding: wp(1),
  },
  membersModalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  membersModalSpacer: {
    width: hp(3),
  },
  membersModalList: {
    padding: wp(4),
  },
  createPostModalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  createPostClose: {
    padding: wp(1),
  },
  createPostTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  createPostSubmit: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bondedPurple,
  },
  createPostSubmitText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  createPostBody: {
    padding: wp(5),
    gap: hp(2),
  },
  createPostImagePicker: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  createPostImage: {
    width: '100%',
    height: hp(34),
    resizeMode: 'cover',
  },
  createPostImagePlaceholder: {
    height: hp(34),
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(1),
  },
  createPostImageText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  createPostCaption: {
    minHeight: hp(12),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: wp(4),
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  messageLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
    fontFamily: theme.typography.fontFamily.body,
  },
  orgPostCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  orgPostImage: {
    width: '100%',
    height: hp(28),
    resizeMode: 'cover',
  },
  orgPostImagePlaceholder: {
    height: hp(28),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  orgPostContent: {
    padding: wp(4),
    gap: hp(0.8),
  },
  orgPostCaption: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    lineHeight: hp(2.4),
  },
  orgPostDate: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  adminToolsSection: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  adminToolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  adminToolButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  adminToolText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  createOrgPostButton: {
    marginBottom: hp(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.6),
    borderRadius: theme.radius.xl,
    gap: wp(2),
  },
  createOrgEventButton: {
    marginBottom: hp(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: hp(1.6),
    borderRadius: theme.radius.xl,
    gap: wp(2),
  },
  createOrgPostText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: hp(1.2),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.bondedPurple,
  },
  tabText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  tabTextActive: {
    color: theme.colors.bondedPurple,
    opacity: 1,
  },
  tabContent: {
    padding: wp(4),
    backgroundColor: theme.colors.background,
    minHeight: hp(30),
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(1.5),
  },
  meetingInfoSection: {
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.background,
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  meetingTimesContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  meetingTimeCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  meetingTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  meetingDay: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  meetingTime: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginLeft: hp(3),
  },
  meetingLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  meetingLocationText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    marginBottom: hp(0.5),
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  leaderRole: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  postCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginBottom: hp(1.5),
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  postTitle: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  postDate: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  postBody: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    lineHeight: hp(2.4),
  },
  membersRow: {
    justifyContent: 'space-between',
  },
  memberItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: hp(2),
    marginHorizontal: wp(1),
    position: 'relative',
  },
  memberAvatar: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginBottom: hp(0.5),
  },
  memberAvatarFallback: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginBottom: hp(0.5),
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  memberAvatarInitial: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  memberName: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    maxWidth: wp(35),
  },
  removeMemberButton: {
    position: 'absolute',
    top: -hp(0.5),
    right: -wp(1),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    padding: hp(0.2),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  emptyStateText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginTop: hp(1.5),
  },
  emptyStateButton: {
    marginTop: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.xl,
  },
  emptyStateButtonText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  postGridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    marginBottom: wp(1),
  },
  postGridItem: {
    width: (wp(100) - wp(8) - wp(2)) / 3,
    aspectRatio: 1,
    position: 'relative',
  },
  postGridItemMargin: {
    marginRight: wp(1),
  },
  postGridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: theme.radius.sm,
  },
  postGridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postGridOverlay: {
    position: 'absolute',
    top: wp(2),
    right: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: theme.radius.sm,
    gap: wp(1),
  },
  postGridLikes: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: wp(3),
  },
  requestAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: theme.radius.full,
  },
  requestAvatarFallback: {
    width: hp(5),
    height: hp(5),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.2),
  },
  requestTime: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  loadingBlock: {
    paddingVertical: hp(2),
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: wp(2),
  },
  approveButton: {
    width: hp(4),
    height: hp(4),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: hp(4),
    height: hp(4),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: hp(2),
  },
  backButton: {
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.xl,
  },
  backButtonText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  viewSwitcherContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewSwitcherButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitcherButtonActive: {
    backgroundColor: theme.colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  viewSwitcherText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  viewSwitcherTextActive: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.white,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  analyticsValue: {
    fontSize: theme.typography.sizes.xxl,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  analyticsLabel: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  analyticsChange: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.success,
    fontWeight: theme.typography.weights.medium,
  },
  analyticsSection: {
    marginTop: theme.spacing.lg,
  },
  analyticsSectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  activityIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  activityTime: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: theme.typography.opacity.meta,
  },
})
