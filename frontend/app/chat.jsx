import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import ChatHeader from '../components/Chat/ChatHeader'
import ChatInputBar from '../components/Chat/ChatInputBar'
import MessageList from '../components/Chat/MessageList'
import { useMarkAsRead, useMessages, useSendMessage } from '../hooks/useMessages'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme } from './theme'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { useClubsContext } from '../contexts/ClubsContext'
import { hp, wp } from '../helpers/common'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'

export default function Chat() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const params = useLocalSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { getClub } = useClubsContext()
  const log = (...args) => {
    if (__DEV__) console.log(...args)
  }

  // Params
  const {
    userId,           // For direct messages
    userName,
    conversationId: paramConvId,
    classId,          // For class chats (class_section_id)
    orgId,            // For org chats
    isGroupChat,
    highlightMessageId,
    showWavePrompt
  } = params

  const [conversationId, setConversationId] = useState(paramConvId)
  const [isInitializing, setIsInitializing] = useState(!paramConvId)
  const [initError, setInitError] = useState(null)
  const [conversationInfo, setConversationInfo] = useState({
    name: userName || 'Loading...',
    type: 'direct',
    avatar_url: null,
    participants: []
  })
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [isWavePromptVisible, setIsWavePromptVisible] = useState(false)
  const [hasShownWavePrompt, setHasShownWavePrompt] = useState(false)
  const { openProfile } = useProfileModal()

  // Data Hooks
  const {
    data: messagesPage,
    isLoading: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: messagesError
  } = useMessages(conversationId)

  // Memoize messages list from infinite query
  const messages = React.useMemo(() => {
    if (!messagesPage?.pages) return []
    return messagesPage.pages.flatMap(page => page.messages || [])
  }, [messagesPage])


  const sendMessageMutation = useSendMessage()
  const markAsRead = useMarkAsRead()

  useEffect(() => {
    if (!conversationId || hasShownWavePrompt) return
    if (showWavePrompt === 'true') {
      setIsWavePromptVisible(true)
      setHasShownWavePrompt(true)
    }
  }, [conversationId, hasShownWavePrompt, showWavePrompt])

  const handleWave = () => {
    if (!conversationId) return
    setIsWavePromptVisible(false)
    sendMessageMutation.mutate(
      { conversationId, content: '👋' },
      {
        onError: (error) => {
          Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to send wave'))
        }
      }
    )
  }

  // Initialize Chat Logic - Combined to prevent race conditions
  useEffect(() => {
    const initChat = async () => {
      if (!user?.id) {
        setInitError('User not authenticated')
        setIsInitializing(false)
        return
      }

      setIsInitializing(true)
      setInitError(null)

      try {
        let targetId = paramConvId

        // Only find/create conversation if we don't have one from params
        if (!targetId) {
          // 1. Handle Direct Message (userId provided)
          if (userId) {
            log('🔵 Creating/finding direct chat with user:', userId)

            const { data, error } = await supabase.rpc('find_or_create_direct_chat', {
              p_user1_id: user.id,
              p_user2_id: userId
            })

            if (error) {
              console.error('❌ Error creating direct chat:', error)
              throw error
            }

            targetId = data
          }

          // 2. Handle Class Chat (classId is class_section_id)
          else if (classId) {
            log('🔵 Finding class chat for section:', classId)

            const { data: existingClassChat, error } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'class')
              .eq('class_section_id', classId)
              .maybeSingle()

            if (error) {
              console.error('❌ Error finding class chat:', error)
              throw error
            }

            if (existingClassChat) {
              targetId = existingClassChat.id
            } else {
              throw new Error('Class chat not found. Make sure you are enrolled in this class.')
            }
          }

          // 3. Handle Org Chat
          else if (orgId) {
            log('🔵 Finding org chat for org:', orgId)

            const { data: existingOrgChat, error } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'org')
              .eq('org_id', orgId)
              .maybeSingle()

            if (error) {
              console.error('❌ Error finding org chat:', error)
              throw error
            }

            if (existingOrgChat) {
              targetId = existingOrgChat.id
            } else {
              throw new Error('Organization chat not found. Make sure you are a member of this organization.')
            }
          }
        }

        if (!targetId) {
          throw new Error('Unable to create or find conversation')
        }

        // Set the conversation ID
        setConversationId(targetId)

        // Immediately fetch the full conversation info
        await fetchConversationInfo(targetId)

      } catch (error) {
        console.error('❌ Failed to initialize conversation:', error)
        setInitError(getFriendlyErrorMessage(error, 'Unable to open this chat right now.'))
      } finally {
        setIsInitializing(false)
      }
    }

    initChat()
  }, [userId, classId, orgId, paramConvId, user?.id])

  // Fetch conversation info when conversationId is set
  const fetchConversationInfo = async (convId) => {
    try {
      log('🔍 Fetching conversation info for:', convId)
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          name,
          class_section_id,
          org_id,
          avatar_url,
          conversation_participants(
            user_id,
            profiles(
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', convId)
        .single()

      if (error) {
        console.error('❌ Error fetching conversation:', error)
        throw error
      }

      log('📦 Raw conversation data:', JSON.stringify(data, null, 2))

      if (data) {
        const participants = data.conversation_participants.map(p => ({
          id: p.user_id,
          ...p.profiles
        }))

        log('👥 Conversation participants:', JSON.stringify(participants, null, 2))

        // For direct chats, set name to other user's name
        let displayName = data.name
        if (data.type === 'direct') {
          const otherUser = participants.find(p => p.id !== user.id)
          log('👤 Other user found:', otherUser)
          displayName = otherUser?.full_name || otherUser?.username || 'Chat'
        }

        log('✅ Setting conversationInfo state:', {
          type: data.type,
          name: displayName,
          participantCount: participants.length,
          participants: JSON.stringify(participants)
        })

        const orgAvatar = data.type === 'org' && data.org_id ? getClub(data.org_id)?.avatar || null : null
        const avatarUrl = data.avatar_url || orgAvatar || null

        setConversationInfo({
          type: data.type,
          name: displayName,
          avatar_url: avatarUrl,
          participants
        })
      }
    } catch (error) {
      console.error('❌ Error fetching conversation info:', error)
    }
  }

  // Mark as read when messages load
  useEffect(() => {
    if (conversationId && messages.length > 0 && !isMessagesLoading) {
      markAsRead.mutate(conversationId)
    }
  }, [conversationId, messages.length, isMessagesLoading])

  // Handlers
  const handleSendMessage = (text) => {
    if (!conversationId || !text.trim() || !user?.id) return

    sendMessageMutation.mutate({
      conversationId,
      content: text.trim(),
      senderId: user.id
    })
  }

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // Loading State
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Starting conversation...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error State
  if (initError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>❌ {initError}</Text>
          <Text
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            Go Back
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Messages Error State
  if (messagesError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ChatHeader
          userName={conversationInfo.name}
          userId={userId}
          isGroup={conversationInfo.type !== 'direct'}
          conversationType={conversationInfo.type}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            Failed to load messages: {messagesError.message}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Get other user's avatar for direct chats
  const otherUser = conversationInfo.type === 'direct'
    ? conversationInfo.participants.find(p => p.id !== user.id)
    : null

  const otherUserAvatar = otherUser?.avatar_url
  const headerAvatar = conversationInfo.type === 'direct' ? otherUserAvatar : conversationInfo.avatar_url

  log('🔎 Other user lookup:', {
    currentUserId: user?.id,
    allParticipants: conversationInfo.participants.map(p => ({ id: p.id, avatar: p.avatar_url })),
    otherUser: otherUser,
    otherUserAvatar: otherUserAvatar
  })

  log('🎨 Rendering header with:', {
    name: conversationInfo.name,
    avatar: otherUserAvatar,
    type: conversationInfo.type,
    participantCount: conversationInfo.participants.length,
    rawParticipants: JSON.stringify(conversationInfo.participants),
    userId: userId,
    currentUserId: user?.id
  })

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Modal visible={isWavePromptVisible} transparent animationType="fade">
        <View style={styles.waveOverlay}>
          <View style={styles.waveCard}>
            <Text style={styles.waveTitle}>Say hi to {userName || 'your new friend'}</Text>
            <Text style={styles.waveSubtitle}>Send a quick wave to break the ice.</Text>
            <View style={styles.waveActions}>
              <TouchableOpacity style={styles.waveSecondary} onPress={() => setIsWavePromptVisible(false)}>
                <Text style={styles.waveSecondaryText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.wavePrimary} onPress={handleWave}>
                <Text style={styles.wavePrimaryText}>Wave 👋</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ChatHeader
        userName={conversationInfo.name}
        userAvatar={headerAvatar}
        userId={userId}
        isGroup={conversationInfo.type !== 'direct'}
        conversationType={conversationInfo.type}
        participants={conversationInfo.participants}
        groupMembersCount={conversationInfo.participants.length}
        onShowMembers={() => setShowMembersModal(true)}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MessageList
          messages={messages}
          currentUserId={user?.id}
          conversationId={conversationId}
          isLoading={isMessagesLoading}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          highlightMessageId={highlightMessageId}
          onAvatarPress={openProfile}
        />

        <ChatInputBar
          onSend={handleSendMessage}
          isSending={sendMessageMutation.isPending}
          disabled={!conversationId}
        />
      </KeyboardAvoidingView>

      {/* Group Members Modal */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowMembersModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={hp(3)} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Members ({conversationInfo.participants.length})</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <FlatList
            data={conversationInfo.participants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.memberItem}
                onPress={() => {
                  setShowMembersModal(false)
                  openProfile(item.id)
                }}
                activeOpacity={0.7}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarText}>
                      {(item.full_name || item.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.full_name || item.username || 'User'}</Text>
                  {item.username && item.full_name && (
                    <Text style={styles.memberUsername}>@{item.username}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={hp(2)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.membersList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textPrimary || '#000',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error || '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    fontSize: 16,
    color: theme.colors.bondedPurple || '#6B4EFF',
    fontWeight: '600',
    padding: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  waveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  waveCard: {
    width: '100%',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    padding: wp(5),
  },
  waveTitle: {
    fontSize: hp(2.2),
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: hp(0.8),
  },
  waveSubtitle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    marginBottom: hp(2),
  },
  waveActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: wp(3),
  },
  wavePrimary: {
    backgroundColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
  },
  wavePrimaryText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  waveSecondary: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  waveSecondaryText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  modalCloseButton: {
    padding: hp(0.5),
  },
  modalTitle: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  modalPlaceholder: {
    width: hp(3),
  },
  membersList: {
    padding: wp(4),
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  memberAvatar: {
    width: hp(5.5),
    height: hp(5.5),
    borderRadius: hp(2.75),
  },
  memberAvatarPlaceholder: {
    width: hp(5.5),
    height: hp(5.5),
    borderRadius: hp(2.75),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  memberUsername: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
})
