import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ChatHeader from '../components/Chat/ChatHeader'
import ChatInput from '../components/Chat/ChatInput'
import TypingIndicator from '../components/Chat/TypingIndicator'
import MessageBubble from '../components/Message/MessageBubble'
import { useMessagesContext } from '../contexts/MessagesContext'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { hp, wp } from '../helpers/common'
import { createSignedUrlForPath, uploadImageToBondedMedia } from '../helpers/mediaStorage'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useMarkAsRead, useMessages, useSendMessage } from '../hooks/useMessages'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme } from './theme'

export default function Chat() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const params = useLocalSearchParams()
  const { user } = useAuthStore()
  const markAsRead = useMarkAsRead()
  // const sendMessageMutation = useSendMessage() // Will use this instead of context
  const {
    getOrCreateConversation,
    unsendMessage,
    realtimeDisabled,
  } = useMessagesContext()

  const [conversationId, setConversationId] = useState(params.conversationId || null)
  const sendMessageMutation = useSendMessage()
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    refetch: refetchMessages
  } = useMessages(conversationId)

  const queryClient = useQueryClient()

  // Derive messages from React Query data (single source of truth)
  const messages = useMemo(() => {
    if (!messagesData) return []
    return messagesData.pages.flatMap(page => page.messages)
  }, [messagesData])

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [typingUserName, setTypingUserName] = useState('')
  const [typingUserAvatar, setTypingUserAvatar] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [recipientProfile, setRecipientProfile] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showUnsendModal, setShowUnsendModal] = useState(false)
  const { openProfile } = useProfileModal()
  const [sharedProfile, setSharedProfile] = useState(null)
  const [reactionSummaries, setReactionSummaries] = useState({}) // { messageId: { userIds: [] } }
  const [reactionProfiles, setReactionProfiles] = useState({}) // { userId: { id, full_name, username, avatar_url } }
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [reactionModalMessageId, setReactionModalMessageId] = useState(null)
  const [lastTapMessageId, setLastTapMessageId] = useState(null)
  const [lastTapTime, setLastTapTime] = useState(0)
  const [senderProfiles, setSenderProfiles] = useState({})
  const [activeGroupProfile, setActiveGroupProfile] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameDraft, setGroupNameDraft] = useState('')
  const doubleTapTimeoutRef = useRef(null)
  const flatListRef = useRef(null)
  const messageIdsRef = useRef(new Set())
  const reactionProfilesRef = useRef({})
  const conversationIdRef = useRef(null)
  const prevConversationIdRef = useRef(null)
  const lastTypingSentAtRef = useRef(0)
  const channelRef = useRef(null)
  const typingIndicatorTimeoutRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const typingDebounceTimeoutRef = useRef(null)

  const userName = params.userName || params.forumName || 'User'
  const recipientId = params.userId
  const paramConversationId = params.conversationId
  const isGroupChat = params.isGroupChat === 'true'
  const forumName = params.forumName
  const forumId = params.forumId

  // Fetch recipient profile
  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (!recipientId || !user?.id || isGroupChat) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, major, graduation_year, grade')
          .eq('id', recipientId)
          .single()

        if (error) {
          console.error('Error fetching recipient profile:', error)
          return
        }

        if (data) {
          setRecipientProfile(data)
        }
      } catch (error) {
        console.error('Error fetching recipient profile:', error)
      }
    }

    fetchRecipientProfile()
  }, [recipientId, user?.id])

  useEffect(() => {
    const fetchRecipientFromConversation = async () => {
      if (!user?.id || isGroupChat || recipientId) return
      if (!conversationId || !isValidUUID(conversationId)) return

      try {
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .limit(1)

        if (participantsError) {
          console.error('Error fetching conversation participants:', participantsError)
          return
        }

        const otherUserId = participants?.[0]?.user_id
        if (!otherUserId) return

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, major, graduation_year, grade')
          .eq('id', otherUserId)
          .single()

        if (error) {
          console.error('Error fetching recipient profile from conversation:', error)
          return
        }

        if (data) {
          setRecipientProfile(data)
        }
      } catch (error) {
        console.error('Error fetching recipient profile from conversation:', error)
      }
    }

    fetchRecipientFromConversation()
  }, [conversationId, isGroupChat, recipientId, user?.id])

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!isGroupChat || !conversationId) return
      setIsLoadingMembers(true)
      try {
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)

        if (participantsError) {
          console.error('Error fetching group participants:', participantsError)
          setGroupMembers([])
          return
        }

        const participantIds = (participants || []).map((row) => row.user_id)
        if (participantIds.length === 0) {
          setGroupMembers([])
          return
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, major, graduation_year, grade')
          .in('id', participantIds)

        if (profilesError) {
          console.error('Error fetching group member profiles:', profilesError)
          setGroupMembers([])
          return
        }

        setGroupMembers(profiles || [])
      } catch (error) {
        console.error('Error fetching group members:', error)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    fetchGroupMembers()
  }, [conversationId, isGroupChat])

  useEffect(() => {
    const fetchSenderProfiles = async () => {
      if (!isGroupChat || !conversationId) return
      const convMessages = messages
      if (!convMessages || convMessages.length === 0) return

      const senderIds = Array.from(
        new Set(
          convMessages
            .map((msg) => msg.sender_id)
            .filter((id) => id && id !== user?.id)
        )
      )

      const missingIds = senderIds.filter((id) => !senderProfiles[id])
      if (missingIds.length === 0) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, major, graduation_year, grade')
          .in('id', missingIds)

        if (error) {
          console.error('Error fetching sender profiles:', error)
          return
        }

        const profileMap = (data || []).reduce((acc, profile) => {
          acc[profile.id] = profile
          return acc
        }, {})
        setSenderProfiles((prev) => ({ ...prev, ...profileMap }))
      } catch (error) {
        console.error('Error fetching sender profiles:', error)
      }
    }

    fetchSenderProfiles()
  }, [messages, conversationId, isGroupChat, senderProfiles, user?.id])

  // Check if string is a valid UUID (for filtering temporary message IDs)
  const isValidUUID = (str) => {
    if (!str || typeof str !== 'string') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  useEffect(() => {
    reactionProfilesRef.current = reactionProfiles
  }, [reactionProfiles])

  // Get current user's profile for reaction display
  const { data: currentUserProfile } = useCurrentUserProfile()

  useEffect(() => {
    if (!user?.id || !currentUserProfile) return
    setReactionProfiles(prev => ({
      ...prev,
      [user.id]: {
        id: user.id,
        full_name: currentUserProfile.full_name || currentUserProfile.name || null,
        username: currentUserProfile.username || null,
        avatar_url: currentUserProfile.avatar_url || currentUserProfile.avatarUrl || null,
      },
    }))
  }, [user?.id, currentUserProfile])

  useEffect(() => {
    const messageIds = new Set(
      messages
        .map(m => m.id)
        .filter(Boolean)
        .filter(id => isValidUUID(id))
    )
    messageIdsRef.current = messageIds
  }, [messages])

  const ensureReactionProfiles = useCallback(async (userIds) => {
    if (!userIds?.length) return
    const existing = reactionProfilesRef.current
    const missingIds = userIds.filter(id => !existing[id])
    if (!missingIds.length) return

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', missingIds)

    if (error) {
      console.error('Error fetching reaction profiles:', error)
      return
    }

    if (data?.length) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile
        return acc
      }, {})
      setReactionProfiles(prev => ({ ...prev, ...profileMap }))
    }
  }, [])

  const addReactionToState = useCallback((messageId, userId) => {
    if (!messageId || !userId) return
    setReactionSummaries(prev => {
      const existing = prev[messageId]?.userIds || []
      if (existing.includes(userId)) return prev
      return {
        ...prev,
        [messageId]: { userIds: [...existing, userId] },
      }
    })
  }, [])

  const removeReactionFromState = useCallback((messageId, userId) => {
    if (!messageId || !userId) return
    setReactionSummaries(prev => {
      const existing = prev[messageId]?.userIds || []
      if (!existing.includes(userId)) return prev
      const nextIds = existing.filter(id => id !== userId)
      const next = { ...prev }
      if (nextIds.length) {
        next[messageId] = { userIds: nextIds }
      } else {
        delete next[messageId]
      }
      return next
    })
  }, [])

  // Fetch heart reactions and keep them in sync
  useEffect(() => {
    if (realtimeDisabled) return
    if (!conversationId || !user?.id || !isValidUUID(conversationId)) return

    let isActive = true
    const fetchReactions = async () => {
      const messageIds = Array.from(messageIdsRef.current)
      if (!messageIds.length) {
        if (isActive) setReactionSummaries({})
        return
      }

      try {
        const { data: reactions, error } = await supabase
          .from('message_reactions')
          .select('message_id, reaction_type, user_id')
          .in('message_id', messageIds)
          .eq('reaction_type', 'heart')

        if (error) {
          // Silent timeout errors - non-critical
          if (error.message?.includes('timeout') || error.code === 'upstream_reset') {
            return
          }
          console.error('Error fetching reactions:', error)
          return
        }

        const summary = {}
        const userIds = new Set()
        reactions?.forEach(reaction => {
          if (!summary[reaction.message_id]) {
            summary[reaction.message_id] = { userIds: [] }
          }
          if (!summary[reaction.message_id].userIds.includes(reaction.user_id)) {
            summary[reaction.message_id].userIds.push(reaction.user_id)
          }
          userIds.add(reaction.user_id)
        })

        if (isActive) {
          setReactionSummaries(summary)
          await ensureReactionProfiles(Array.from(userIds))
        }
      } catch (error) {
        // Silent
      }
    }

    fetchReactions()
    const intervalId = setInterval(fetchReactions, 30000) // Increase to 30s to reduce load

    return () => {
      isActive = false
      clearInterval(intervalId)
    }
  }, [conversationId, messages, user?.id])

  useEffect(() => {
    if (!conversationId || !user?.id || !isValidUUID(conversationId)) return

    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `reaction_type=eq.heart`,
        },
        (payload) => {
          const messageIds = messageIdsRef.current
          const reaction = payload.new || payload.old

          if (!reaction?.message_id || !messageIds.has(reaction.message_id)) {
            return
          }

          if (payload.eventType === 'INSERT' && payload.new) {
            addReactionToState(reaction.message_id, reaction.user_id)
            ensureReactionProfiles([reaction.user_id])
          } else if (payload.eventType === 'DELETE' && payload.old) {
            removeReactionFromState(reaction.message_id, reaction.user_id)
          }
        }
      )
      .subscribe((status) => {
        // console.log('📡 Reaction subscription status:', status, 'for conversation:', conversationId)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, realtimeDisabled, user?.id])

  // Toggle heart reaction on a message (Instagram-style)
  const toggleHeartReaction = async (messageId) => {
    if (!user?.id || !messageId) return

    // Don't try to react to temporary/optimistic messages
    if (!isValidUUID(messageId)) {
      console.warn('⚠️ Cannot react to temporary message:', messageId)
      return
    }

    const hasHeart = reactionSummaries[messageId]?.userIds?.includes(user.id)

    try {
      if (hasHeart) {
        // Remove heart reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'heart')

        if (error) throw error

        removeReactionFromState(messageId, user.id)
      } else {
        // Add heart reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction_type: 'heart',
          })

        if (error) {
          if (error.code === '23505') {
            addReactionToState(messageId, user.id)
            ensureReactionProfiles([user.id])
            return
          }
          throw error
        }

        addReactionToState(messageId, user.id)
        ensureReactionProfiles([user.id])
      }
    } catch (error) {
      console.error('Error toggling heart reaction:', error)
      // Silent fail - don't show alert for reactions
    }
  }

  // Handle double tap for heart reaction (Instagram-style)
  const handleMessagePress = useCallback((item) => {
    if (!item?.id) return // Guard against invalid items
    // Don't allow reactions on unsent messages
    if (item?.metadata?.unsent) return

    const now = Date.now()
    const DOUBLE_TAP_DELAY = 400 // Increased delay for better detection

    // Clear any existing timeout
    if (doubleTapTimeoutRef.current) {
      clearTimeout(doubleTapTimeoutRef.current)
      doubleTapTimeoutRef.current = null
    }

    // Check if this is a double tap on the same message
    const isDoubleTap = item.id === lastTapMessageId && lastTapTime > 0 && (now - lastTapTime) < DOUBLE_TAP_DELAY

    if (isDoubleTap) {
      // Double tap detected - toggle heart reaction
      // console.log('❤️ Double tap detected on message:', item.id, 'Time diff:', now - lastTapTime)
      toggleHeartReaction(item.id)
      setLastTapMessageId(null)
      setLastTapTime(0)
    } else {
      // Single tap - set up for potential double tap
      // console.log('👆 Single tap on message:', item.id, 'Setting up for double tap')
      setLastTapMessageId(item.id)
      setLastTapTime(now)
      doubleTapTimeoutRef.current = setTimeout(() => {
        // console.log('⏱️ Double tap timeout expired for message:', item.id)
        setLastTapMessageId(null)
        setLastTapTime(0)
        doubleTapTimeoutRef.current = null
      }, DOUBLE_TAP_DELAY)
    }
  }, [lastTapMessageId, lastTapTime, toggleHeartReaction])

  // Initialize conversation and load messages
  useEffect(() => {
    const initializeChat = async () => {
      if (!user?.id) return
      if (conversationId) return // Already have it

      try {
        let convId = null
        if (paramConversationId) {
          convId = String(paramConversationId)
        } else if (isGroupChat && forumId) {
          convId = await getOrCreateForumGroupChat(forumId, forumName || 'Class Chat')
        } else if (recipientId) {
          convId = await getOrCreateConversation(recipientId)
        }

        if (convId) {
          setConversationId(convId)
        }
      } catch (error) {
        console.error('Error initializing chat:', error)
      }
    }

    initializeChat()
  }, [paramConversationId, recipientId, user?.id, isGroupChat, forumId, conversationId])

  // Helper: Get or create a group conversation for a forum/class
  const getOrCreateForumGroupChat = async (forumId, chatName) => {
    if (!user?.id || !forumId) return null

    try {
      // First, check if a group conversation already exists for this forum
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .ilike('name', chatName)
        .single()

      if (existingConv?.id) {
        // Check if current user is a participant
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', existingConv.id)
          .eq('user_id', user.id)
          .single()

        if (!participant) {
          await supabase
            .from('conversation_participants')
            .insert({ conversation_id: existingConv.id, user_id: user.id })

          // Optional: Insert system message
          await supabase.from('messages').insert({
            conversation_id: existingConv.id,
            sender_id: user.id,
            content: `${user.user_metadata?.full_name || 'Someone'} joined the chat`,
            metadata: { type: 'system', action: 'joined' },
          })
        }

        return existingConv.id
      }

      // Create new group conversation (Simplified)
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: chatName,
          type: 'group',
          created_by: user.id,
        })
        .select()
        .single()

      if (convError) throw convError

      // Add current user as participant (Real group chat would add all class members, but let's keep it simple for now)
      await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: user.id })

      return newConv.id
    } catch (error) {
      console.error('Error in getOrCreateForumGroupChat:', error)
      return null
    }
  }

  useEffect(() => {
    if (!conversationId || !isValidUUID(conversationId)) return
    markAsRead.mutate(conversationId)
  }, [conversationId, messages.length])

  useEffect(() => {
    if (!conversationId || !isValidUUID(conversationId)) return
    if (!messages.length) {
      markAsRead.mutate(conversationId)
      return
    }
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.senderId && lastMessage.senderId !== 'me') {
      markAsRead.mutate(conversationId)
    }
  }, [conversationId, messages, markAsRead])


  // Set up broadcast channel for typing indicators
  useEffect(() => {
    if (realtimeDisabled) {
      setIsOtherTyping(false)
      return
    }
    if (!conversationId || !user?.id || !isValidUUID(conversationId)) {
      console.log('⏭️ Skipping typing channel setup - invalid conversationId or user')
      return
    }

    const channelName = `chat:${conversationId}`
    console.log('🔧 Setting up typing channel:', channelName)

    // Clean up any existing channel first
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing typing channel')
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    // Add a small delay to ensure conversation is fully initialized
    const setupChannel = setTimeout(() => {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts (industry standard)
        },
      })

      // Set up event listeners before subscribing
      channel
        .on('broadcast', { event: 'typing' }, async (payload) => {
          console.log('📝 Typing indicator received:', payload.payload)
          // Only show typing if it's from someone else
          if (payload.payload.userId !== user.id) {
            // Use provided name/avatar or fetch from recipient profile
            const displayName = payload.payload.userName || recipientProfile?.full_name || recipientProfile?.username || 'Someone'
            const displayAvatar = payload.payload.userAvatar || recipientProfile?.avatar_url || null

            console.log('✅ Showing typing indicator for:', displayName)
            setIsOtherTyping(true)
            setTypingUserName(displayName)
            setTypingUserAvatar(displayAvatar)

            // Clear typing indicator after 3 seconds
            if (typingIndicatorTimeoutRef.current) {
              clearTimeout(typingIndicatorTimeoutRef.current)
            }
            typingIndicatorTimeoutRef.current = setTimeout(() => {
              console.log('⏱️ Typing indicator timeout, hiding')
              setIsOtherTyping(false)
              setTypingUserName('')
              setTypingUserAvatar(null)
            }, 3000)
          } else {
            console.log('⏭️ Ignoring own typing indicator')
          }
        })
        .on('broadcast', { event: 'stop_typing' }, (payload) => {
          console.log('🛑 Stop typing received:', payload.payload)
          if (payload.payload.userId !== user.id) {
            console.log('✅ Hiding typing indicator')
            setIsOtherTyping(false)
            setTypingUserName('')
            setTypingUserAvatar(null)
            if (typingIndicatorTimeoutRef.current) {
              clearTimeout(typingIndicatorTimeoutRef.current)
            }
          }
        })

      // Subscribe to the channel with error handling
      channel.subscribe((status) => {
        // console.log('📡 Broadcast channel status:', status, 'for channel:', channelName)
        if (status === 'SUBSCRIBED') {
          // console.log('✅ Successfully subscribed to typing channel:', channelName)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error for:', channelName)
          // console.log('💡 This is usually harmless - typing indicators may not work, but messages will still work')
          // Don't throw - just log the error, typing indicators are optional
        } else if (status === 'TIMED_OUT') {
          // console.warn('⏱️ Channel subscription timed out for:', channelName)
        } else if (status === 'CLOSED') {
          // console.log('🔒 Channel closed for:', channelName)
        }
      })

      channelRef.current = channel
    }, 500) // Delay to ensure conversation is ready

    return () => {
      clearTimeout(setupChannel)
      console.log('🧹 Cleaning up typing channel:', channelName)
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (typingDebounceTimeoutRef.current) {
        clearTimeout(typingDebounceTimeoutRef.current)
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [conversationId, realtimeDisabled, user?.id]) // Re-subscribe when conversation changes

  // Send typing indicator (debounced)
  const sendTypingIndicator = useCallback(() => {
    if (realtimeDisabled) return
    if (!channelRef.current || !user?.id || !conversationId) return

    const now = Date.now()
    if (now - lastTypingSentAtRef.current < 1200) return
    lastTypingSentAtRef.current = now

    // Get user's display name from profile or email
    const displayName = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || 'User'

    // Ensure channel is subscribed before sending
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: displayName,
        userAvatar: user.user_metadata?.avatar_url || null,
        conversationId: conversationId,
      },
    }).then(() => {
      console.log('✅ Typing indicator sent')
    }).catch((error) => {
      console.error('❌ Error sending typing indicator:', error)
    })

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: {
          userId: user.id,
          conversationId: conversationId,
        },
      }).catch((error) => {
        console.error('❌ Error sending stop typing:', error)
      })
    }, 2000)
  }, [conversationId, realtimeDisabled, user?.id, user?.email, user?.user_metadata])

  // Note: Real-time updates are handled by useMessages hook
  // No need for periodic polling as useMessages already has refetchInterval

  // AI Moderator / Suggester logic remains

  // Process AI analysis separately to avoid blocking the main UI loop
  // Only trigger when the number of messages changes significantly

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showSearch && searchQuery.trim()) return
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages, showSearch, searchQuery])


  const handleSend = async () => {
    if (!inputText.trim() || isSending || !conversationId) return

    setIsSending(true)
    const text = inputText.trim()
    setInputText('')

    // Stop typing indicator
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: {
          userId: user.id,
          conversationId: conversationId,
        },
      }).catch((error) => {
        console.error('Error sending stop typing:', error)
      })
    }

    // Optimistic update via React Query cache
    const optimisticId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      content: text,
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      metadata: {},
      sender: {
        id: user?.id,
        full_name: user?.user_metadata?.full_name || 'You',
        username: user?.user_metadata?.username || user?.email?.split('@')[0],
        avatar_url: user?.user_metadata?.avatar_url || null,
      },
      _optimistic: true,
      _status: 'sending',
    }

    // Add to React Query cache optimistically
    queryClient.setQueryData(['messages', conversationId], (old) => {
      if (!old) {
        return { pages: [{ messages: [optimisticMessage], hasMore: false }], pageParams: [0] }
      }
      const firstPage = old.pages[0]
      return {
        ...old,
        pages: [
          {
            ...firstPage,
            messages: [...firstPage.messages, optimisticMessage],
          },
          ...old.pages.slice(1),
        ],
      }
    })

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      console.log('📤 Sending message to conversation:', conversationId)

      // Send message with a safety timeout (increased to 45s)
      const messagePromise = sendMessageMutation.mutateAsync({
        conversationId,
        content: text
      })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Send timed out')), 45000)
      )

      const message = await Promise.race([messagePromise, timeoutPromise])
      // console.log('✅ Message confirmed from context:', message?.id)

      if (message) {
        // Replace optimistic message with real one in cache
        queryClient.setQueryData(['messages', conversationId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page, idx) => {
              if (idx === 0) {
                return {
                  ...page,
                  messages: page.messages.map(m =>
                    m.id === optimisticId
                      ? { ...message, _optimistic: false, _status: 'sent' }
                      : m
                  ),
                }
              }
              return page
            }),
          }
        })
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
      }
    } catch (error) {
      console.error('❌ Error in handleSend:', error)
      // Mark optimistic message as failed
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page, idx) => {
            if (idx === 0) {
              return {
                ...page,
                messages: page.messages.map(m =>
                  m.id === optimisticId ? { ...m, _status: 'failed' } : m
                ),
              }
            }
            return page
          }),
        }
      })
      if (error.message === 'Send timed out') {
        Alert.alert('Connection Error', 'Message sending is taking too long. It might have sent, or you can try again.')
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.')
      }
    } finally {
      setIsSending(false)
    }
  }

  // Handle text input change with typing indicator
  const handleTextChange = (text) => {
    setInputText(text)
    if (text.length > 0) {
      if (typingDebounceTimeoutRef.current) {
        clearTimeout(typingDebounceTimeoutRef.current)
      }
      typingDebounceTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator()
      }, 300)
    }
  }

  // Pick image from library
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to send images.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    }
  }

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null)
  }

  // Upload image and send as message (Instagram-style with optimistic update)
  const sendImage = async () => {
    if (!selectedImage || !conversationId || !user?.id || uploadingImage) return

    setUploadingImage(true)
    const imageUri = selectedImage
    const caption = inputText.trim() // Get caption if user typed one

    // Optimistic update via React Query cache
    const optimisticId = `temp-image-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      content: caption || '📷 Image',
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      metadata: {
        type: 'image',
        imageUrl: imageUri, // Use local URI for immediate display
        imagePath: null, // Will be set after upload
      },
      sender: {
        id: user?.id,
        full_name: user?.user_metadata?.full_name || 'You',
        username: user?.user_metadata?.username || user?.email?.split('@')[0],
        avatar_url: user?.user_metadata?.avatar_url || null,
      },
      _optimistic: true,
      _status: 'sending',
    }

    // Add to React Query cache optimistically
    queryClient.setQueryData(['messages', conversationId], (old) => {
      if (!old) {
        return { pages: [{ messages: [optimisticMessage], hasMore: false }], pageParams: [0] }
      }
      const firstPage = old.pages[0]
      return {
        ...old,
        pages: [
          {
            ...firstPage,
            messages: [...firstPage.messages, optimisticMessage],
          },
          ...old.pages.slice(1),
        ],
      }
    })

    // Clear input immediately for better UX
    setSelectedImage(null)
    setInputText('')

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      // Upload image with a timeout
      const uploadPromise = uploadImageToBondedMedia({
        fileUri: imageUri,
        mediaType: 'message_media',
        ownerType: 'user',
        ownerId: user.id,
        userId: user.id,
        mimeType: 'image/jpeg',
      })

      const uploadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out')), 45000)
      )

      const uploadResult = await Promise.race([uploadPromise, uploadTimeout])
      console.log('✅ Image uploaded:', uploadResult.path)

      // Get signed URL
      const imageUrl = await createSignedUrlForPath(uploadResult.path)

      // Send message with a timeout
      const sendPromise = sendMessageToContext(
        conversationId,
        caption || '📷 Image',
        {
          type: 'image',
          imageUrl: imageUrl,
          imagePath: uploadResult.path,
        }
      )

      const sendTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Send timed out')), 15000)
      )

      const message = await Promise.race([sendPromise, sendTimeout])

      if (message) {
        // Replace optimistic message with real one in cache
        queryClient.setQueryData(['messages', conversationId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page, idx) => {
              if (idx === 0) {
                return {
                  ...page,
                  messages: page.messages.map(m =>
                    m.id === optimisticId
                      ? {
                        ...message,
                        metadata: {
                          type: 'image',
                          imageUrl: imageUrl,
                          imagePath: uploadResult.path,
                        },
                        _optimistic: false,
                        _status: 'sent',
                      }
                      : m
                  ),
                }
              }
              return page
            }),
          }
        })
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
      }
    } catch (error) {
      console.error('❌ Error sending image:', error)
      // Mark optimistic message as failed
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page, idx) => {
            if (idx === 0) {
              return {
                ...page,
                messages: page.messages.map(m =>
                  m.id === optimisticId ? { ...m, _status: 'failed' } : m
                ),
              }
            }
            return page
          }),
        }
      })
      const errorMsg = error.message === 'Upload timed out' ? 'Image upload timed out. Check your connection.' : 'Failed to send image.'
      Alert.alert('Error', errorMsg)
      // Restore input on error
      setSelectedImage(imageUri)
      setInputText(caption)
    } finally {
      setUploadingImage(false)
    }
  }



  // Handle long press on message (Instagram-style unsend)
  const handleMessageLongPress = (item) => {
    if (item.sender_id === user?.id && item.id && !item.id.toString().startsWith('temp-')) {
      setSelectedMessage(item)
      setShowUnsendModal(true)
    }
  }

  // Handle unsend message
  const handleUnsend = async () => {
    if (!selectedMessage || !conversationId) return

    try {
      await unsendMessage(selectedMessage.id)
      setShowUnsendModal(false)
      setSelectedMessage(null)
    } catch (error) {
      console.error('Error unsending message:', error)
      Alert.alert('Error', 'Failed to unsend message. Please try again.')
    }
  }

  const getReactionDisplayName = (userId) => {
    if (userId === user?.id) return 'You'
    const profile = reactionProfiles[userId]
    return profile?.full_name || profile?.username || 'User'
  }

  const reactionModalUserIds = reactionModalMessageId
    ? reactionSummaries[reactionModalMessageId]?.userIds || []
    : []
  const sortedReactionModalUserIds = user?.id
    ? [
      ...reactionModalUserIds.filter(id => id === user.id),
      ...reactionModalUserIds.filter(id => id !== user.id),
    ]
    : reactionModalUserIds

  const renderMessage = useCallback(({ item, index }) => {
    if (!item) return null

    const isMe = item.sender_id === user?.id
    const prevMessage = index > 0 ? messages[index - 1] : null

    // Show avatar for 'other' in groups if it's the first message in a sequence
    const showAvatar = !isMe && isGroupChat && (!prevMessage || prevMessage.sender_id !== item.sender_id)

    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        theme={theme}
        isGroupChat={isGroupChat}
        showAvatar={showAvatar}
        onPress={() => handleMessagePress(item)}
        onAvatarPress={(id) => openProfile(id)}
      />
    )
  }, [messages, user?.id, isGroupChat, theme])


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} pointerEvents="box-none">
      <View style={styles.container} pointerEvents="auto">
        {/* Chat Header - Industry Standard (iMessage/WhatsApp style) */}
        <ChatHeader
          theme={theme}
          recipientProfile={recipientProfile}
          isGroupChat={isGroupChat}
          forumName={forumName}
          userName={userName}
          isOtherTyping={isOtherTyping}
          setShowSearch={setShowSearch}
          setShowGroupInfo={setShowGroupInfo}
        />

        {showSearch && (
          <View style={styles.chatSearchContainer}>
            <Ionicons name="search-outline" size={hp(2)} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.chatSearchInput}
              placeholder="Search in conversation"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={hp(2)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}


        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={
            showSearch && searchQuery.trim()
              ? messages.filter((msg) =>
                (msg.text || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
              )
              : messages
          }
          keyExtractor={(item, index) => {
            // Ensure unique keys - handle optimistic messages and duplicates
            if (!item.id) {
              console.warn('⚠️ Message without ID at index:', index, item)
              return `msg-${index}-${Date.now()}-${Math.random()}`
            }
            // Add prefix to distinguish optimistic messages
            const prefix = item._optimistic ? 'optimistic-' : ''
            return `${prefix}${item.id}`
          }}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isMessagesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
              </View>
            ) : (
              conversationId ? (
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtitle}>Send the first message to start the chat.</Text>
                </View>
              ) : null
            )
          }
        />

        {/* Typing Indicator with animated dots */}
        <TypingIndicator
          theme={theme}
          isOtherTyping={isOtherTyping}
          typingUserName={typingUserName}
          typingUserAvatar={typingUserAvatar}
        />

        {/* Input Area */}
        <ChatInput
          theme={theme}
          inputText={inputText}
          setInputText={setInputText}
          handleTextChange={handleTextChange}
          selectedImage={selectedImage}
          removeSelectedImage={removeSelectedImage}
          pickImage={pickImage}
          isSending={isSending}
          uploadingImage={uploadingImage}
          handleSend={handleSend}
          sendImage={sendImage}
        />



        {isGroupChat && (
          <Modal
            visible={showGroupInfo}
            transparent
            animationType="slide"
            onRequestClose={() => setShowGroupInfo(false)}
          >
            <View style={styles.groupInfoOverlay}>
              <Pressable
                style={styles.groupInfoBackdrop}
                onPress={() => setShowGroupInfo(false)}
              >
                <Pressable
                  style={styles.groupInfoContent}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.groupInfoHeader}>
                    <Text style={styles.groupInfoTitle}>Group info</Text>
                    <TouchableOpacity
                      style={styles.groupInfoClose}
                      onPress={() => setShowGroupInfo(false)}
                    >
                      <Ionicons name="close" size={hp(2.4)} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.groupNameRow}>
                    {editingGroupName ? (
                      <>
                        <TextInput
                          style={styles.groupNameInput}
                          value={groupNameDraft}
                          onChangeText={setGroupNameDraft}
                          placeholder="Group name"
                          placeholderTextColor={theme.colors.textSecondary}
                        />
                        <TouchableOpacity
                          style={styles.groupNameSave}
                          onPress={async () => {
                            const nextName = groupNameDraft.trim()
                            if (!nextName || !conversationId) {
                              setEditingGroupName(false)
                              return
                            }
                            try {
                              const { error } = await supabase
                                .from('conversations')
                                .update({ name: nextName })
                                .eq('id', conversationId)
                              if (!error) {
                                setEditingGroupName(false)
                              }
                            } catch (error) {
                              console.error('Failed to update group name:', error)
                              setEditingGroupName(false)
                            }
                          }}
                        >
                          <Text style={styles.groupNameSaveText}>Save</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.groupNameText}>
                          {forumName || 'Group chat'}
                        </Text>
                        <TouchableOpacity
                          style={styles.groupNameEdit}
                          onPress={() => {
                            setGroupNameDraft(forumName || '')
                            setEditingGroupName(true)
                          }}
                        >
                          <Ionicons name="pencil" size={hp(2)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <Text style={styles.groupMembersLabel}>
                    {groupMembers.length} members
                  </Text>

                  {isLoadingMembers ? (
                    <View style={styles.groupMembersEmpty}>
                      <Text style={styles.groupMembersEmptyText}>Loading members...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.groupMembersList}
                    >
                      {groupMembers.map((member) => (
                        <TouchableOpacity
                          key={member.id}
                          style={styles.groupMemberRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            setShowGroupInfo(false)
                            openProfile(member.id)
                          }}
                        >
                          {member.avatar_url ? (
                            <Image source={{ uri: member.avatar_url }} style={styles.groupMemberAvatar} />
                          ) : (
                            <View style={styles.groupMemberAvatarPlaceholder}>
                              <Text style={styles.groupMemberAvatarInitial}>
                                {(member.full_name || member.username || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.groupMemberInfo}>
                            <Text style={styles.groupMemberName}>
                              {member.full_name || member.username || 'Member'}
                            </Text>
                            <Text style={styles.groupMemberMeta}>
                              {member.major || 'Student'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={hp(1.8)} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </Pressable>
              </Pressable>
            </View>
          </Modal>
        )}

        {/* Reaction Details Modal */}
        <Modal
          visible={showReactionModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowReactionModal(false)
            setReactionModalMessageId(null)
          }}
        >
          <Pressable
            style={styles.reactionModalOverlay}
            onPress={() => {
              setShowReactionModal(false)
              setReactionModalMessageId(null)
            }}
          >
            <Pressable
              style={styles.reactionModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.reactionModalHeader}>
                <Text style={styles.reactionModalTitle}>Hearts</Text>
                <TouchableOpacity
                  style={styles.reactionModalClose}
                  onPress={() => {
                    setShowReactionModal(false)
                    setReactionModalMessageId(null)
                  }}
                >
                  <Ionicons name="close" size={hp(2.2)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.reactionModalSubtitle}>
                {sortedReactionModalUserIds.length}{' '}
                {sortedReactionModalUserIds.length === 1 ? 'person' : 'people'} reacted
              </Text>
              <FlatList
                data={sortedReactionModalUserIds}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.reactionListContent}
                renderItem={({ item: userId }) => {
                  const profile = reactionProfiles[userId]
                  return (
                    <View style={styles.reactionUserRow}>
                      {profile?.avatar_url ? (
                        <Image
                          source={{ uri: profile.avatar_url }}
                          style={styles.reactionAvatar}
                        />
                      ) : (
                        <View style={styles.reactionAvatarPlaceholder}>
                          <Ionicons name="person" size={hp(1.8)} color={theme.colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.reactionUserName}>
                        {getReactionDisplayName(userId)}
                      </Text>
                    </View>
                  )
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* Unsend Message Modal - Instagram Style */}
        <Modal
          visible={showUnsendModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowUnsendModal(false)
            setSelectedMessage(null)
          }}
        >
          <Pressable
            style={styles.unsendModalOverlay}
            onPress={() => {
              setShowUnsendModal(false)
              setSelectedMessage(null)
            }}
          >
            <View style={styles.unsendModalContent}>
              <TouchableOpacity
                style={styles.unsendButton}
                activeOpacity={0.7}
                onPress={handleUnsend}
              >
                <Ionicons name="trash-outline" size={hp(2.5)} color="#FF3B30" />
                <Text style={styles.unsendButtonText}>Unsend</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unsendCancelButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowUnsendModal(false)
                  setSelectedMessage(null)
                }}
              >
                <Text style={styles.unsendCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
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
    backgroundColor: theme.colors.backgroundSecondary, // Light gray background like iMessage
    paddingHorizontal: 0, // Remove horizontal padding - header and messages handle their own
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: hp(0.5),
    marginRight: theme.spacing.sm,
  },
  chatHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  headerAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  headerAvatarPlaceholder: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  groupHeaderAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  chatHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  chatHeaderSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.1),
  },
  groupChatSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: theme.ui.metaOpacity,
    marginTop: theme.spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    padding: hp(0.5),
  },
  chatSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: theme.spacing.md,
    paddingVertical: hp(1),
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  chatSearchInput: {
    flex: 1,
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  groupInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  groupInfoBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  groupInfoContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: hp(1.6),
    paddingHorizontal: wp(4),
    paddingBottom: hp(3),
    maxHeight: '85%',
  },
  groupInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  groupInfoTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  groupInfoClose: {
    padding: hp(0.5),
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  groupNameText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  groupNameEdit: {
    padding: hp(0.5),
  },
  groupNameInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  groupNameSave: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bondedPurple,
  },
  groupNameSaveText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  groupMembersLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: hp(1),
  },
  groupMembersList: {
    paddingBottom: hp(2),
  },
  groupMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.08)',
  },
  groupMemberAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    marginRight: wp(3),
  },
  groupMemberAvatarPlaceholder: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  groupMemberAvatarInitial: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
  },
  groupMemberInfo: {
    flex: 1,
  },
  groupMemberName: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  groupMemberMeta: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  groupMembersEmpty: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  groupMembersEmptyText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  profileModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileModalContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? hp(5) : hp(2),
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reactionModalCard: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: hp(60),
  },
  reactionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionModalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  reactionModalClose: {
    padding: hp(0.5),
  },
  reactionModalSubtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  reactionListContent: {
    paddingBottom: theme.spacing.lg,
  },
  reactionUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.08)',
  },
  reactionAvatar: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  reactionAvatarPlaceholder: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionUserName: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  linkAIContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  linkAIHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  linkAITitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  suggestionsScroll: {
    marginBottom: theme.spacing.xs,
  },
  suggestionChip: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  suggestionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.accent,
    fontFamily: theme.typography.fontFamily.body,
  },
  qualityText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    minHeight: hp(50),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Transparent so it doesn't block
  },
  emptyMessagesContainer: {
    flex: 1,
    minHeight: hp(45),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyMessagesTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptyMessagesSubtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  messagesList: {
    paddingVertical: hp(1),
    paddingBottom: hp(2),
    paddingLeft: theme.spacing.sm, // Small padding on left
    paddingRight: 0, // No padding on right for sent messages
  },
  messageContainer: {
    marginVertical: hp(0.3),
    maxWidth: wp(95), // Use almost all available space
    paddingLeft: 0,
    paddingRight: 0, // No padding on right
  },
  messageContainerMe: {
    alignItems: 'flex-end',
    paddingRight: 0, // No padding on right - push to edge
    paddingLeft: wp(5), // Minimal left padding to push all the way right
    marginRight: 0, // No margin on right
  },
  messageContainerOther: {
    alignItems: 'flex-start',
    paddingLeft: wp(2),
    paddingRight: theme.spacing.xs,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: hp(1),
  },
  systemMessageText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  messagePending: {
    opacity: 0.7,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: wp(0.5),
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: hp(0.4),
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: hp(0.3),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    gap: wp(1),
  },
  reactionPillMe: {
    alignSelf: 'flex-end',
    borderColor: theme.colors.bondedPurple + '55',
  },
  reactionPillOther: {
    alignSelf: 'flex-start',
  },
  reactionCountText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  reactionCountTextActive: {
    color: '#FF3040',
    fontWeight: theme.typography.weights.semibold,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.6),
    gap: wp(1.5),
  },
  groupAvatarButton: {
    width: hp(3.4),
    height: hp(3.4),
    borderRadius: hp(1.7),
  },
  groupAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: hp(1.7),
  },
  groupAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: hp(1.7),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarInitial: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
  },
  groupSenderName: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  groupMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  groupMessageContent: {
    flex: 1,
  },
  messageBubble: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.xl,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleMe: {
    backgroundColor: theme.colors.bondedPurple,
    borderBottomRightRadius: theme.radius.sm,
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  messageText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.4),
    marginBottom: theme.spacing.xs,
  },
  messageTextMe: {
    color: theme.colors.white,
  },
  messageTextOther: {
    color: theme.colors.textPrimary,
  },
  messageTime: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamily.body,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: theme.colors.white,
    opacity: 0.8,
  },
  messageTimeOther: {
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  // Shared Content Card Styles
  sharedCard: {
    maxWidth: '94%',
    borderRadius: theme.radius.lg,
    padding: wp(3.4),
    marginVertical: hp(0.5),
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sharedCardMe: {
    alignSelf: 'flex-end',
    borderColor: theme.colors.bondedPurple,
  },
  sharedCardOther: {
    alignSelf: 'flex-start',
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  sharedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.7),
  },
  sharedCardLabelPill: {
    backgroundColor: theme.colors.bondedPurple + '15',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: theme.radius.full,
  },
  sharedCardLabel: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sharedCardTitle: {
    fontSize: hp(1.85),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: hp(2.4),
  },
  sharedCardSubtitle: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.0),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  sharedCardIconBg: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginBottom: hp(1),
  },
  sharedCardInfo: {
    flex: 1,
  },
  sharedCardAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sharedCardImage: {
    width: hp(6),
    height: hp(6),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sharedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp(1),
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border + '40',
  },
  sharedCardAction: {
    fontSize: hp(1.4),
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  sharedProfileAvatarRow: {
    alignItems: 'flex-start',
    marginBottom: hp(0.6),
  },
  sharedProfileAvatar: {
    width: hp(5.2),
    height: hp(5.2),
    borderRadius: hp(2.75),
    backgroundColor: theme.colors.background,
  },
  sharedProfileAvatarPlaceholder: {
    width: hp(5.2),
    height: hp(5.2),
    borderRadius: hp(2.75),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  sharedEventCover: {
    width: '100%',
    height: hp(12),
    borderRadius: theme.radius.md,
    marginBottom: hp(0.7),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sharedEventCoverPlaceholder: {
    width: '100%',
    height: hp(12),
    borderRadius: theme.radius.md,
    marginBottom: hp(0.7),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  sharedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.8),
  },
  sharedCardTime: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  // Typing indicator styles
  typingContainer: {
    paddingHorizontal: wp(2),
    paddingBottom: hp(1),
  },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    borderBottomLeftRadius: theme.radius.sm,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: hp(0.5),
  },
  typingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  typingAvatar: {
    width: hp(2),
    height: hp(2),
    borderRadius: hp(1),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  typingAvatarPlaceholder: {
    width: hp(2),
    height: hp(2),
    borderRadius: hp(1),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingUserName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  typingDot: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    backgroundColor: theme.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  attachButton: {
    padding: hp(0.5),
    marginRight: wp(2),
  },
  input: {
    flex: 1,
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    maxHeight: hp(10),
    paddingVertical: hp(0.8),
  },
  sendButton: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(2),
  },
  sendButtonDisabled: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  // Image message styles
  imageMessageBubble: {
    maxWidth: wp(75),
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  imageMessageBubbleMe: {
    backgroundColor: theme.colors.bondedPurple,
    borderBottomRightRadius: theme.radius.sm,
  },
  imageMessageBubbleOther: {
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: theme.radius.sm,
  },
  messageImage: {
    width: '100%',
    height: hp(30),
    borderRadius: theme.radius.lg,
  },
  imagePlaceholder: {
    width: wp(75),
    height: hp(30),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  imageMessageText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  imageMessageTextMe: {
    color: theme.colors.white,
  },
  imageMessageTextOther: {
    color: theme.colors.textPrimary,
  },
  // Inline image preview styles (Instagram-style, inside input area)
  inlineImagePreview: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  inlineImagePreviewImage: {
    width: wp(25),
    height: wp(25),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  inlineRemoveImageButton: {
    position: 'absolute',
    top: -hp(0.8),
    right: -hp(0.8),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unsendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsendModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    minWidth: wp(60),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  unsendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  unsendButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF3B30',
    fontFamily: theme.typography.fontFamily.body,
  },
  unsendCancelText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.body,
  },
  // Floating Input Styles
  floatingInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  floatingAttachButton: {
    padding: theme.spacing.sm,
    marginBottom: hp(0.5),
  },
  floatingInput: {
    flex: 1,
    minHeight: hp(5),
    maxHeight: hp(15),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingTop: hp(1.2),
    paddingBottom: hp(1.2),
    marginHorizontal: theme.spacing.xs,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  floatingSendButton: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.2),
  },
})
