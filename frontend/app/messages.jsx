import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomNav from '../components/BottomNav'
import MessageListItem from '../components/Message/MessageListItem'
import { useClubsContext } from '../contexts/ClubsContext'
import { hp, wp } from '../helpers/common'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useLinkSystemProfile, useLinkConversationPreview } from '../hooks/useLinkChat'
import { useMessageRequests } from '../hooks/useMessageRequests'
import { useConversations, useCreateConversation, useMarkAsRead } from '../hooks/useMessages'
import { useNotificationCount } from '../hooks/useNotificationCount'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatRelativeMessageTime } from '../utils/dateFormatters'
import { useAppTheme } from './theme'

export default function Messages() {
  const router = useRouter()
  const theme = useAppTheme()
  const { user } = useAuthStore()
  const styles = createStyles(theme)
  const { data: currentUserProfile } = useCurrentUserProfile()
  const { getClub, getAllClubs } = useClubsContext()
  const { data: linkProfile } = useLinkSystemProfile()
  const { data: linkPreview } = useLinkConversationPreview()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ chats: [], people: [], messages: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('direct') // 'direct' | 'classes' | 'orgs' | 'groups'

  // Data Hooks
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useConversations()
  const { data: messageRequests = [] } = useMessageRequests()
  const { data: notificationCount = 0 } = useNotificationCount()
  const notificationLabel = notificationCount > 99 ? '99+' : `${notificationCount}`
  const markAsRead = useMarkAsRead()
  const createConversation = useCreateConversation()

  // Private Forums (Org Chats) - Fetched manually
  const [privateForums, setPrivateForums] = useState([])
  const [isLoadingForums, setIsLoadingForums] = useState(false)

  // Fetch Logic for Org Forums
  const fetchPrivateForums = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoadingForums(true)
      // 1. Get Org Memberships
      const { data: orgMemberships } = await supabase
        .from('org_members')
        .select('organization_id')
        .eq('user_id', user.id)

      const orgIds = (orgMemberships || []).map(row => row.organization_id)
      if (orgIds.length === 0) {
        setPrivateForums([])
        return
      }

      // 2. Get Forums for these Orgs
      const { data: forums } = await supabase
        .from('forums')
        .select('id, name, org_id, type')
        .in('org_id', orgIds)
        .eq('type', 'org')

      const forumsList = (forums || []).map(f => ({
        id: f.id,
        name: f.name,
        type: 'org',
        org_id: f.org_id,
        isForum: true, // Marker to distinguish from active convos
        image_url: null,
      }))

      setPrivateForums(forumsList)
    } catch (err) {
      console.error('Error fetching forums:', err)
    } finally {
      setIsLoadingForums(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchPrivateForums()
  }, [fetchPrivateForums])

  const formattedConversations = useMemo(() => {
    const clubsByName = new Map(
      (getAllClubs?.() || []).map((club) => [club.name?.toLowerCase(), club])
    )

    return conversations.map(c => {
      const club = c.type === 'org' && c.org_id ? getClub(c.org_id) : null
      const directName = c.type === 'direct'
        ? (c.other_participant?.full_name || c.other_participant?.username || c.name)
        : null
      const directAvatar = c.type === 'direct'
        ? (c.other_participant?.avatar_url || null)
        : null
      const name = directName || c.name || club?.name || c.name
      const fallbackClub = !club && name ? clubsByName.get(name.toLowerCase()) : null
      const image_url = directAvatar || c.image_url || c.avatar_url || club?.avatar || fallbackClub?.avatar || null
      const timeValue = c.last_message_at || c.last_message?.created_at || c.created_at
      const sortTime = timeValue ? new Date(timeValue).getTime() : Number.NEGATIVE_INFINITY

      return {
        ...c,
        image_url,
        name,
        sortTime: Number.isNaN(sortTime) ? Number.NEGATIVE_INFINITY : sortTime,
      }
    })
  }, [conversations, getAllClubs, getClub])

  const conversationById = useMemo(() => {
    const map = new Map()
    formattedConversations.forEach((conv) => {
      if (conv?.id) map.set(conv.id, conv)
    })
    return map
  }, [formattedConversations])

  useEffect(() => {
    let timeout = null
    const query = searchQuery.trim()

    if (!query) {
      setSearchResults((prev) => {
        if (prev.chats.length === 0 && prev.people.length === 0 && prev.messages.length === 0) {
          return prev
        }
        return { chats: [], people: [], messages: [] }
      })
      setIsSearching((prev) => (prev ? false : prev))
      return () => { }
    }

    setIsSearching(true)
    timeout = setTimeout(async () => {
      try {
        const chatResults = formattedConversations.filter((item) => {
          const title = item.name || item.participants?.[0]?.full_name || item.participants?.[0]?.username || 'User'
          return title.toLowerCase().includes(query.toLowerCase())
        })

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', user?.id)
          .maybeSingle()

        let search = supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, university_id')
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(20)

        if (currentProfile?.university_id) {
          search = search.eq('university_id', currentProfile.university_id)
        }

        let messageResults = []
        const conversationIds = formattedConversations.map((c) => c.id).filter(Boolean)
        if (conversationIds.length > 0) {
          const { data: msgData } = await supabase
            .from('messages')
            .select(`
              id,
              conversation_id,
              content,
              created_at,
              sender:profiles!messages_sender_id_fkey (
                id,
                full_name,
                username,
                avatar_url
              )
            `)
            .in('conversation_id', conversationIds)
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20)

          messageResults = (msgData || []).map((msg) => {
            const conv = conversationById.get(msg.conversation_id)
            const senderName = msg.sender?.full_name || msg.sender?.username || 'User'
            const senderAvatar = msg.sender?.avatar_url || null
            return {
              ...msg,
              conversation_name: conv?.name || 'Chat',
              conversation_type: conv?.type,
              conversation_avatar: conv?.image_url || null,
              sender_name: senderName,
              sender_avatar: senderAvatar,
            }
          })
        }

        const { data } = await search
        const filtered = (data || []).filter((p) => p.id !== user?.id)
        setSearchResults({
          chats: chatResults,
          people: filtered,
          messages: messageResults
        })
      } catch (err) {
        console.warn('Search failed:', err)
        setSearchResults({ chats: [], people: [], messages: [] })
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [searchQuery, user?.id, formattedConversations, conversationById])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchConversations(), fetchPrivateForums()])
    setIsRefreshing(false)
  }

  // Unified Data Merging & Splitting
  const { directChats, classChats, orgChats, groupChats, tabUnreadCounts } = useMemo(() => {

    // Filter out forums that already have an active conversation
    const activeForumOrgIds = new Set(
      conversations
        .filter(c => c.type === 'org' && c.org_id)
        .map(c => c.org_id)
    )

    const activeForumNames = new Set(
      conversations
        .filter(c => ['group', 'org', 'class'].includes(c.type))
        .map(c => c.name)
    )

    const inactiveForums = privateForums
      .filter(f => !(f.org_id && activeForumOrgIds.has(f.org_id)) && !activeForumNames.has(f.name))
      .map(f => ({
        ...f,
        last_message: 'Tap to start chatting',
        last_message_at: null,
        sortTime: Number.NEGATIVE_INFINITY,
        participants: [],
        unread_count: 0,
      }))

    const getSortTime = (item) => {
      const timeValue = item.last_preview_at || item.last_message_at || item.last_message?.created_at || item.created_at
      const time = timeValue ? new Date(timeValue).getTime() : Number.NEGATIVE_INFINITY
      return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
    }

    // Always show Link at the top of direct chats
    // Use linkPreview data (fetches actual last_message from link_conversations table)
    // Falls back to linkProfile.bio only if user hasn't started a Link conversation yet
    const linkConversation = linkPreview || {
      id: linkProfile?.id ? `link-${linkProfile.id}` : 'link-default',
      type: 'link',
      name: linkProfile?.display_name || 'Link',
      image_url: linkProfile?.avatar_url || null,
      last_message: linkProfile?.bio || 'Your campus buddy! Ask me anything.',
      last_message_at: null,
      sortTime: Number.MAX_SAFE_INTEGER,
      participants: [{
        id: 'link',
        full_name: linkProfile?.display_name || 'Link',
        avatar_url: linkProfile?.avatar_url || null,
      }],
      unread_count: 0,
      isLink: true,
    }

    const direct = formattedConversations
      .filter(c => c.type === 'direct')
      .sort((a, b) => getSortTime(b) - getSortTime(a))

    const classes = formattedConversations
      .filter(c => c.type === 'class')
      .sort((a, b) => getSortTime(b) - getSortTime(a))

    const orgs = [
      ...formattedConversations.filter(c => c.type === 'org'),
      ...inactiveForums
    ].sort((a, b) => getSortTime(b) - getSortTime(a))

    const groups = formattedConversations
      .filter(c => c.type === 'group')
      .sort((a, b) => getSortTime(b) - getSortTime(a))

    // Filter by search
    const filterFn = (item) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const title = item.name || item.participants?.[0]?.full_name || item.participants?.[0]?.username || 'User'
      return title.toLowerCase().includes(q)
    }

    // Calculate unread counts for each tab
    const directUnread = direct.reduce((sum, c) => sum + (c.unread_count || 0), 0) + messageRequests.length
    const classesUnread = classes.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    const orgsUnread = orgs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    const groupsUnread = groups.reduce((sum, c) => sum + (c.unread_count || 0), 0)

    // Add Link at the top of direct chats if it exists and not searching
    const directChatsFiltered = direct.filter(filterFn)
    const directChatsWithLink = searchQuery.trim()
      ? directChatsFiltered
      : [linkConversation, ...directChatsFiltered]

    return {
      directChats: directChatsWithLink,
      classChats: classes.filter(filterFn),
      orgChats: orgs.filter(filterFn),
      groupChats: groups.filter(filterFn),
      tabUnreadCounts: {
        direct: directUnread,
        classes: classesUnread,
        orgs: orgsUnread,
        groups: groupsUnread,
      }
    }
  }, [conversations, privateForums, searchQuery, formattedConversations, messageRequests.length, linkProfile, linkPreview])


  // Handlers
  const handleItemPress = async (item) => {
    // Handle Link conversation - route to dedicated Link chat
    if (item.isLink) {
      router.push('/link')
      return
    }

    if (item.isForum) {
      try {
        let targetId = null

        // 1. Try finding by org_id (Most reliable for Orgs)
        if (item.org_id) {
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('org_id', item.org_id)
            .maybeSingle()
          if (existing) targetId = existing.id
        }

        // 2. Fallback: Try finding by name
        if (!targetId) {
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('name', item.name)
            .in('type', ['group', 'org'])
            .maybeSingle()
          if (existing) targetId = existing.id
        }

        // 3. Create if not found
        if (!targetId) {
          const type = item.org_id ? 'org' : 'group'

          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              name: item.name,
              type: type,
              created_by: user.id,
              org_id: item.org_id || null
            })
            .select()
            .single()

          if (newConv) {
            targetId = newConv.id
            // Add self
            await supabase.from('conversation_participants').insert({
              conversation_id: targetId, user_id: user.id
            })
          }
        }

        if (targetId) {
          router.push({
            pathname: '/chat',
            params: {
              conversationId: targetId,
              userName: item.name,
              isGroupChat: 'true',
              orgId: item.org_id
            }
          })
        }
      } catch (e) {
        console.error('Error opening forum chat', e)
        Alert.alert('Error', 'Could not join organization chat')
      }
      return
    }

    // Normal Conversation
    // For direct chats, find the other participant
    let otherParticipant = item.participants?.find(p => p.id !== user.id)
    if (!otherParticipant && item.participants?.length > 0) otherParticipant = item.participants[0]

    const isGroup = ['group', 'org', 'class'].includes(item.type)
    const displayName = isGroup
      ? (item.name || 'Group Chat')
      : (otherParticipant?.full_name || otherParticipant?.username || 'User')

    if (item.id) markAsRead.mutate(item.id)

    router.push({
      pathname: '/chat',
      params: {
        conversationId: item.id,
        userId: otherParticipant?.id,
        userName: displayName,
        isGroupChat: isGroup ? 'true' : 'false',
        orgId: item.org_id,
        classId: item.class_section_id
      }
    })
  }

  const handleDeleteConversation = async (conversation) => {
    // Logic: Leave conversation used 'conversation_participants'
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to remove this conversation? This will hide it from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!conversation.id) return // Can't delete inactive forum placeholder
            try {
              if (conversation.type === 'group') {
                const displayName =
                  currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  user?.user_metadata?.full_name ||
                  user?.user_metadata?.username ||
                  user?.email?.split('@')[0] ||
                  'Someone'
                await supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversation.id,
                    sender_id: user.id,
                    content: `${displayName} left the chat`,
                    metadata: { type: 'system', action: 'left' },
                  })
              }

              const { error } = await supabase
                .from('conversation_participants')
                .delete()
                .eq('conversation_id', conversation.id)
                .eq('user_id', user.id)

              if (error) throw error

              // Refetch
              refetchConversations()
            } catch (err) {
              Alert.alert('Error', 'Failed to delete conversation')
            }
          }
        }
      ]
    )
  }

  const handleOpenProfileChat = async (profile) => {
    try {
      const convId = await createConversation.mutateAsync({ otherUserId: profile.id })
      if (!convId) return
      router.push({
        pathname: '/chat',
        params: {
          conversationId: convId,
          userId: profile.id,
          userName: profile.full_name || profile.username || 'User',
          isGroupChat: 'false',
        }
      })
    } catch (err) {
      Alert.alert('Error', 'Failed to start chat')
    }
  }

  const renderContent = () => {
    if (searchQuery.trim()) {
      return (
        <FlatList
          data={[
            ...(searchResults?.chats?.length ? [{ type: 'chats_header', id: 'chats_header' }] : []),
            ...(searchResults?.chats || []).map((chat) => ({ type: 'chat', ...chat })),
            ...(searchResults?.messages?.length ? [{ type: 'messages_header', id: 'messages_header' }] : []),
            ...(searchResults?.messages || []).map((message) => ({ type: 'message', ...message })),
            ...(searchResults?.people?.length ? [{ type: 'people_header', id: 'people_header' }] : []),
            ...(searchResults?.people || []).map((person) => ({ type: 'person', ...person })),
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'chats_header') {
              return <Text style={styles.searchSectionTitle}>Chats</Text>
            }
            if (item.type === 'messages_header') {
              return <Text style={styles.searchSectionTitle}>Messages</Text>
            }
            if (item.type === 'people_header') {
              return <Text style={styles.searchSectionTitle}>People</Text>
            }
            if (item.type === 'chat') {
              return (
                <MessageListItem
                  conversation={item}
                  currentUserId={user?.id}
                  onPress={() => handleItemPress(item)}
                />
              )
            }
            if (item.type === 'message') {
              return (
                <TouchableOpacity
                  style={styles.messageResultItem}
                  onPress={() => {
                    router.push({
                      pathname: '/chat',
                      params: {
                        conversationId: item.conversation_id,
                        userName: item.conversation_name,
                        isGroupChat: item.conversation_type !== 'direct' ? 'true' : 'false',
                        highlightMessageId: item.id,
                      }
                    })
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.messageResultAvatar}>
                    {item.sender_avatar ? (
                      <Image source={{ uri: item.sender_avatar }} style={styles.messageResultAvatarImage} />
                    ) : (
                      <Text style={styles.messageResultAvatarText}>
                        {(item.sender_name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.messageResultInfo}>
                    <Text style={styles.messageResultTitle}>{item.sender_name || 'User'}</Text>
                    <Text style={styles.messageResultSnippet} numberOfLines={1}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={styles.messageResultTime}>
                    {formatRelativeMessageTime(item.created_at)}
                  </Text>
                </TouchableOpacity>
              )
            }
            if (item.type !== 'person') return null
            return (
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => handleOpenProfileChat(item)}
                activeOpacity={0.7}
              >
                <View style={styles.searchAvatar}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.searchAvatarImage} />
                  ) : (
                    <Text style={styles.searchAvatarText}>
                      {(item.full_name || item.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.searchInfo}>
                  <Text style={styles.searchName}>
                    {item.full_name || item.username || 'User'}
                  </Text>
                  {item.username && (
                    <Text style={styles.searchUsername}>@{item.username}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          }}
          ListHeaderComponent={
            <View style={styles.searchHeader}>
              <Text style={styles.searchHeaderTitle}>Search</Text>
              {isSearching && <ActivityIndicator size="small" color={theme.colors.textSecondary} />}
            </View>
          }
          ListEmptyComponent={
            !isSearching && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={hp(5)} color={theme.colors.textSecondary} style={{ opacity: 0.3, marginBottom: hp(1) }} />
                <Text style={styles.emptyText}>No results</Text>
              </View>
            )
          }
        />
      )
    }

    let data = directChats
    let emptyText = 'No messages yet'
    if (activeTab === 'classes') {
      data = classChats
      emptyText = 'No class chats yet'
    } else if (activeTab === 'orgs') {
      data = orgChats
      emptyText = 'No org chats yet'
    } else if (activeTab === 'groups') {
      data = groupChats
      emptyText = 'No group chats yet'
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id || `forum-${item.name}`}
        renderItem={({ item }) => (
          <MessageListItem
            conversation={item}
            currentUserId={user?.id}
            onPress={() => handleItemPress(item)}
            onLongPress={item.isLink ? undefined : () => handleDeleteConversation(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !conversationsLoading && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.3, marginBottom: hp(1) }} />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          )
        }
      />
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Modern Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={hp(2.4)} color={theme.colors.textPrimary} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={hp(2)} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {!searchQuery.trim() && (
          <View style={styles.tabContainer}>
            {[
              { key: 'direct', label: 'Messages' },
              { key: 'classes', label: 'Classes' },
              { key: 'orgs', label: 'Orgs' },
              { key: 'groups', label: 'Groups' },
            ].map(tab => {
              const unreadCount = tabUnreadCounts[tab.key] || 0
              const showBadge = unreadCount > 0
              const badgeLabel = unreadCount > 99 ? '99+' : `${unreadCount}`

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <View style={styles.tabContent}>
                    <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                      {tab.label}
                    </Text>
                    {showBadge && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{badgeLabel}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Requests Alert - Only show on Direct tab? Or both? */}
        {!searchQuery.trim() && activeTab === 'direct' && messageRequests.length > 0 && (
          <TouchableOpacity
            style={styles.requestAlert}
            onPress={() => router.push('/message-requests')}
          >
            <Text style={styles.requestAlertText}>
              {messageRequests.length} Message Request{messageRequests.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={hp(2)} color={theme.colors.bondedPurple} />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>

        {/* FAB for New Chat */}
        {!searchQuery.trim() && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => router.push('/new-chat')}
          >
            <Ionicons name="add" size={hp(3.5)} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Bottom Nav! */}
        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingBottom: hp(1),
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: hp(3.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  notificationButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: hp(0.3),
    right: wp(0.6),
    minWidth: hp(1.8),
    height: hp(1.8),
    borderRadius: hp(0.9),
    paddingHorizontal: wp(0.6),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  notificationBadgeText: {
    fontSize: hp(1.1),
    color: theme.colors.white,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.body,
    includeFontPadding: false,
  },
  searchSection: {
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(3),
    height: hp(5),
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(2),
    color: theme.colors.textPrimary,
    fontSize: hp(1.8),
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
  },
  tab: {
    marginRight: wp(6),
    paddingBottom: hp(1),
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.bondedPurple,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  tabText: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.textPrimary,
  },
  tabBadge: {
    minWidth: hp(1.8),
    height: hp(1.8),
    borderRadius: hp(0.9),
    paddingHorizontal: wp(1),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: hp(1),
    color: theme.colors.white,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.body,
    includeFontPadding: false,
  },
  listContent: {
    paddingBottom: hp(12), // Space for FAB + BottomNav
  },
  requestAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
    backgroundColor: theme.colors.backgroundSecondary + '50',
  },
  requestAlertText: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1),
  },
  searchHeaderTitle: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
  },
  searchSectionTitle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontWeight: '600',
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(0.5),
  },
  messageResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSecondary,
  },
  messageResultAvatar: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  messageResultAvatarImage: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
  },
  messageResultAvatarText: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  messageResultInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  messageResultTitle: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  messageResultSnippet: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  messageResultMeta: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  messageResultTime: {
    fontSize: hp(1.2),
    color: theme.colors.textSecondary,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSecondary,
  },
  searchAvatar: {
    width: hp(5.2),
    height: hp(5.2),
    borderRadius: hp(2.6),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  searchAvatarImage: {
    width: hp(5.2),
    height: hp(5.2),
    borderRadius: hp(2.6),
  },
  searchAvatarText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  searchUsername: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  emptyState: {
    paddingTop: hp(10),
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: hp(2),
  },
  fab: {
    position: 'absolute',
    bottom: hp(12), // Adjusted for BottomNav
    right: wp(5),
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 100,
  },
})
