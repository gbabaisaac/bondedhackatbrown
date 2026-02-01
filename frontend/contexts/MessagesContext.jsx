/**
 * MessagesContext - Real-time messaging with Supabase
 * 
 * Architecture:
 * 1. Messages: Stored in DB, real-time via Postgres Changes (not Broadcast)
 * 2. Typing indicators: Ephemeral, via Broadcast (not stored)
 * 3. Online status: Via Presence
 * 
 * Table: public.messages
 * - id, conversation_id, sender_id, content, created_at
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const MessagesContext = createContext()

export const MessagesProvider = ({ children }) => {
  const { user } = useAuthStore()
  const log = (...args) => {
    if (__DEV__) console.log(...args)
  }
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState({}) // { conversationId: [messages] }
  const [typingUsers, setTypingUsers] = useState({}) // { conversationId: { oderId: timestamp } }
  const [onlineUsers, setOnlineUsers] = useState({}) // { oderId: true }
  const [isLoading, setIsLoading] = useState(false)
  const [realtimeDisabled, setRealtimeDisabled] = useState(false)
  const subscriptionsRef = useRef({})
  const pollingIntervalsRef = useRef({})
  const realtimeDisabledRef = useRef(false)
  const realtimeWarnedRef = useRef(false)
  const typingTimeoutsRef = useRef({})
  const subscriptionTimeoutsRef = useRef({})
  const presenceChannelRef = useRef(null)
  const senderProfilesRef = useRef({})

  // Check if string is a valid UUID
  const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  // Check if Supabase table exists (for graceful fallback)
  const isTableNotFoundError = (error) => {
    return error?.code === 'PGRST205' ||
      error?.code === '42P01' ||
      error?.message?.includes('Could not find the table') ||
      error?.message?.includes('relation') && error?.message?.includes('does not exist')
  }

  const isPolicyRecursionError = (error) => {
    return error?.code === '42P17' || error?.message?.includes('infinite recursion')
  }

  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  // Load user's conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)

      // Fetch conversations where user is a participant
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversation:conversations (
            id,
            name,
            type,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)

      if (isTableNotFoundError(error)) {
        console.warn('Conversations table not found, using empty state')
        setConversations([])
        return
      }

      if (isPolicyRecursionError(error)) {
        console.warn('Conversation RLS recursion detected, using empty state')
        setConversations([])
        return
      }

      if (error) {
        console.error('Error loading conversations:', error)
        throw error
      }

      const conversationIds = (data || []).map(item => item.conversation_id).filter(Boolean)

      let participantsByConversation = {}
      if (conversationIds.length) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            user_id,
            profile:profiles (
              id,
              full_name,
              username,
              avatar_url
            )
          `)
          .in('conversation_id', conversationIds)
          .neq('user_id', user.id)

        if (participantsError) {
          console.warn('Error loading conversation participants:', participantsError)
        } else {
          participantsByConversation = (participantsData || []).reduce((acc, row) => {
            if (!acc[row.conversation_id]) acc[row.conversation_id] = []
            if (row.profile) acc[row.conversation_id].push(row.profile)
            return acc
          }, {})
        }
      }

      let lastMessageByConversation = {}
      if (conversationIds.length) {
        const limit = Math.max(conversationIds.length * 3, 20)
        const { data: recentMessages, error: recentMessagesError } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (recentMessagesError) {
          console.warn('Error loading recent messages:', recentMessagesError)
        } else {
          (recentMessages || []).forEach((msg) => {
            if (!lastMessageByConversation[msg.conversation_id]) {
              lastMessageByConversation[msg.conversation_id] = msg
            }
          })
        }
      }

      // Get last message and other participants for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          const conv = item.conversation

          let lastMsg = lastMessageByConversation[conv.id]
          if (!lastMsg) {
            const { data: fallbackLastMsg } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            lastMsg = fallbackLastMsg
          }

          const participants = participantsByConversation[conv.id] || []

          // Get unread count
          const lastReadAt = item.last_read_at || '1970-01-01'
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .gt('created_at', lastReadAt)

          return {
            ...conv,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || conv.created_at,
            last_message_sender_id: lastMsg?.sender_id || null,
            participants,
            other_participant: conv.type === 'direct' ? (participants.find(p => p.id !== user.id) || participants[0]) : null,
            unread_count: unreadCount || 0,
          }
        })
      )

      // Sort by last message time
      conversationsWithDetails.sort((a, b) =>
        new Date(b.last_message_at) - new Date(a.last_message_at)
      )

      setConversations(conversationsWithDetails)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Get or create 1-on-1 conversation
  const getOrCreateConversation = useCallback(async (otherUserId) => {
    if (!user?.id) throw new Error('User must be authenticated')
    if (!otherUserId) throw new Error('Other user ID is required')

    try {
      // Check for existing 1-on-1 conversation
      const { data: existing } = await supabase
        .rpc('find_direct_conversation', {
          user1: user.id,
          user2: otherUserId
        })

      if (existing) {
        return existing
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          created_by: user.id,
        })
        .select()
        .single()

      if (convError) throw convError

      // Add participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: otherUserId },
        ])

      if (participantError) throw participantError

      // Reload conversations in background
      loadConversations()

      return newConv.id
    } catch (error) {
      console.error('Error getting/creating conversation:', error)

      // Fallback for when tables don't exist
      if (isTableNotFoundError(error)) {
        return `local-conv-${user.id}-${otherUserId}`
      }

      if (isPolicyRecursionError(error)) {
        return `local-conv-${user.id}-${otherUserId}`
      }

      throw error
    }
  }, [user?.id, loadConversations])

  // Create group conversation
  const createGroupConversation = useCallback(async (participantIds, name) => {
    if (!user?.id) throw new Error('User must be authenticated')
    if (!participantIds?.length) throw new Error('Participant IDs are required')

    try {
      // Create conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: name || 'Group Chat',
          created_by: user.id,
        })
        .select()
        .single()

      if (convError) throw convError

      // Add all participants (including creator)
      const allParticipants = [...new Set([user.id, ...participantIds])]
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map(userId => ({
            conversation_id: newConv.id,
            user_id: userId,
          }))
        )

      if (participantError) throw participantError

      // Reload conversations
      await loadConversations()

      return newConv.id
    } catch (error) {
      console.error('Error creating group conversation:', error)
      throw error
    }
  }, [user?.id, loadConversations])

  // ============================================================================
  // MESSAGES
  // ============================================================================

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId, limit = 50) => {
    if (!conversationId || !isValidUUID(conversationId)) {
      setMessages(prev => ({ ...prev, [conversationId]: [] }))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          metadata,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error loading messages:', error)
        throw error
      }

      // Reverse to get chronological order
      const sortedMessages = (data || []).reverse()

      setMessages(prev => ({
        ...prev,
        [conversationId]: sortedMessages,
      }))
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages(prev => ({
        ...prev,
        [conversationId]: [],
      }))
    } finally {
      setIsLoading(false)
    }
  }, [subscribeToMessages])

  const fetchMessagesSnapshot = useCallback(async (conversationId, limit = 50) => {
    if (!conversationId || !isValidUUID(conversationId)) return

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        metadata,
        sender:profiles!messages_sender_id_fkey (
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('Polling messages failed:', error)
      return
    }

    const sortedMessages = (data || []).reverse()
    setMessages(prev => ({
      ...prev,
      [conversationId]: sortedMessages,
    }))
  }, [])

  const startPollingMessages = useCallback((conversationId) => {
    if (pollingIntervalsRef.current[conversationId]) return
    fetchMessagesSnapshot(conversationId)
    pollingIntervalsRef.current[conversationId] = setInterval(() => {
      fetchMessagesSnapshot(conversationId)
    }, 6000) // Slightly slower polling to save bandwidth
  }, [fetchMessagesSnapshot])

  // Send a message
  const sendMessage = useCallback(async (conversationId, content, metadata = null) => {
    if (!user?.id) throw new Error('User must be authenticated')
    if (!conversationId) throw new Error('Conversation ID is required')
    // Allow empty content if metadata contains image
    if (!content?.trim() && !metadata?.imageUrl) throw new Error('Message content or image is required')

    try {
      // Handle local/fallback conversations (non-UUIDs)
      if (!isValidUUID(conversationId)) {
        const localMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          created_at: new Date().toISOString(),
          sender: {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'You',
            avatar_url: user.user_metadata?.avatar_url,
          },
        }
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), localMessage],
        }))
        return localMessage
      }

      // Insertion into Supabase
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content?.trim() || (metadata?.imageUrl ? '📷 Image' : ''),
      }

      // Add metadata if provided (for images, etc.)
      if (metadata) {
        messageData.metadata = metadata
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          metadata,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      // log('✅ Message sent:', data.id)

      // Add to local state immediately to ensure smooth UX
      // The real-time listener will also try to add it, but we handle duplicates there
      setMessages(prev => {
        const existing = prev[conversationId] || []
        if (existing.find(m => m.id === data.id)) return prev
        return {
          ...prev,
          [conversationId]: [...existing, data],
        }
      })

      // Update conversation's updated_at (failure here is non-critical)
      supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then(({ error }) => {
          if (error) console.warn('Non-critical: Failed to update conversation timestamp:', error)
        })

      return data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [user?.id, user?.user_metadata])

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS (Postgres Changes)
  // ============================================================================

  // Subscribe to new messages in a conversation
  const subscribeToMessages = useCallback((conversationId) => {
    if (!isValidUUID(conversationId)) {
      console.warn('⚠️ Invalid conversationId for subscription:', conversationId)
      return
    }

    if (realtimeDisabledRef.current || realtimeDisabled) {
      startPollingMessages(conversationId)
      return
    }

    // Unsubscribe if already subscribed
    if (subscriptionsRef.current[conversationId]) {
      // log('🧹 Unsubscribing from existing channel for:', conversationId)
      subscriptionsRef.current[conversationId].unsubscribe()
      delete subscriptionsRef.current[conversationId]
    }
    if (pollingIntervalsRef.current[conversationId]) {
      clearInterval(pollingIntervalsRef.current[conversationId])
      delete pollingIntervalsRef.current[conversationId]
    }

    // log('📡 Setting up real-time subscription for conversation:', conversationId)

    let isSubscribed = false
    const timeoutId = setTimeout(() => {
      if (isSubscribed || realtimeDisabledRef.current) return
      console.warn('⏳ Message subscription timed out, falling back to polling:', conversationId)
      realtimeDisabledRef.current = true
      setRealtimeDisabled(true)
      startPollingMessages(conversationId)
    }, 6000)

    subscriptionTimeoutsRef.current[conversationId] = timeoutId

    const channel = supabase
      .channel(`messages:${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE so we can handle unsent messages
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new

          // Guard against unexpected payloads
          if (!newMessage?.id) {
            console.warn('⚠️ Real-time payload without message id, skipping:', payload)
            return
          }

          // log('📬 Real-time message change:', payload.eventType, newMessage.id)

          // Parse metadata if it's a string (JSONB from database)
          let parsedMetadata = newMessage.metadata
          if (typeof newMessage.metadata === 'string') {
            try {
              parsedMetadata = JSON.parse(newMessage.metadata)
            } catch (e) {
              console.warn('Failed to parse message metadata in real-time:', e)
              parsedMetadata = {}
            }
          }

          if (payload.eventType === 'INSERT') {
            // Fetch sender details for new messages
            let sender = senderProfilesRef.current[newMessage.sender_id]
            if (!sender) {
              const { data: senderData, error: senderError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .eq('id', newMessage.sender_id)
                .single()

              if (senderError) {
                console.error('Error fetching sender:', senderError)
              } else {
                sender = senderData
                if (sender) {
                  senderProfilesRef.current[newMessage.sender_id] = sender
                }
              }
            }

            const messageWithSender = {
              ...newMessage,
              metadata: parsedMetadata || {},
              sender: sender || {
                id: newMessage.sender_id,
                full_name: 'Unknown',
                username: 'unknown',
                avatar_url: null,
              },
            }

            // log('📬 Real-time message with metadata:', {
            //   id: messageWithSender.id,
            //   hasImage: parsedMetadata?.type === 'image',
            //   imageUrl: parsedMetadata?.imageUrl,
            //   imagePath: parsedMetadata?.imagePath,
            // })

            setMessages(prev => {
              const existing = prev[conversationId] || []
              // Avoid duplicates
              if (existing.find(m => m.id === newMessage.id)) {
                log('⚠️ Duplicate message ignored:', newMessage.id)
                return prev
              }
              // log('✅ Adding new message to state:', newMessage.id)
              return {
                ...prev,
                [conversationId]: [...existing, messageWithSender],
              }
            })
          } else if (payload.eventType === 'UPDATE') {
            // Handle updates (e.g., unsent messages)
            setMessages(prev => {
              const existing = prev[conversationId] || []
              if (!existing.length) return prev

              const index = existing.findIndex(m => m.id === newMessage.id)
              if (index === -1) {
                // Message not found in current state
                return prev
              }

              const updatedMessage = {
                ...existing[index],
                ...newMessage,
                metadata: {
                  ...(existing[index].metadata || {}),
                  ...(parsedMetadata || {}),
                },
              }

              const updatedArray = [...existing]
              updatedArray[index] = updatedMessage

              // log('🔄 Updated message in state (e.g., unsent):', newMessage.id)

              return {
                ...prev,
                [conversationId]: updatedArray,
              }
            })
          }
        }
      )
      .subscribe((status, err) => {
        // log('📡 Message subscription status:', status, 'for conversation:', conversationId)
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          if (subscriptionTimeoutsRef.current[conversationId]) {
            clearTimeout(subscriptionTimeoutsRef.current[conversationId])
            delete subscriptionTimeoutsRef.current[conversationId]
          }
          // log('✅ Successfully subscribed to messages for conversation:', conversationId)
        } else if (status === 'CHANNEL_ERROR') {
          if (subscriptionTimeoutsRef.current[conversationId]) {
            clearTimeout(subscriptionTimeoutsRef.current[conversationId])
            delete subscriptionTimeoutsRef.current[conversationId]
          }
          if (!realtimeWarnedRef.current) {
            realtimeWarnedRef.current = true
            console.error('❌ Channel subscription error for conversation:', conversationId)
            if (err) {
              console.error('   Error details:', err)
            }
            log('💡 This may be due to:')
            log('   1. Real-time not enabled for messages table in Supabase')
            log('      → Run database/enable-realtime-messaging.sql in Supabase SQL Editor')
            log('   2. RLS policies blocking subscription')
            log('      → Run database/check-realtime-status.sql to diagnose')
            log('   3. Conversation not fully created yet')
            log('   Messages will still work via polling, but real-time updates may not work')
          }
          realtimeDisabledRef.current = true
          setRealtimeDisabled(true)
          startPollingMessages(conversationId)
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Channel subscription timed out for conversation:', conversationId)
          if (subscriptionTimeoutsRef.current[conversationId]) {
            clearTimeout(subscriptionTimeoutsRef.current[conversationId])
            delete subscriptionTimeoutsRef.current[conversationId]
          }
          realtimeDisabledRef.current = true
          setRealtimeDisabled(true)
          startPollingMessages(conversationId)
        } else if (status === 'CLOSED') {
          // log('🔒 Message subscription closed for conversation:', conversationId)
        }
      })

    subscriptionsRef.current[conversationId] = channel
    // log('📡 Subscribed to messages for conversation:', conversationId)
  }, [startPollingMessages])

  const unsubscribeFromMessages = useCallback((conversationId) => {
    if (!conversationId) return
    if (subscriptionsRef.current[conversationId]) {
      subscriptionsRef.current[conversationId].unsubscribe()
      delete subscriptionsRef.current[conversationId]
    }
    if (subscriptionTimeoutsRef.current[conversationId]) {
      clearTimeout(subscriptionTimeoutsRef.current[conversationId])
      delete subscriptionTimeoutsRef.current[conversationId]
    }
    if (pollingIntervalsRef.current[conversationId]) {
      clearInterval(pollingIntervalsRef.current[conversationId])
      delete pollingIntervalsRef.current[conversationId]
    }
  }, [])

  // ============================================================================
  // TYPING INDICATORS (Broadcast - ephemeral, not stored)
  // ============================================================================

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId) => {
    if (!user?.id || !isValidUUID(conversationId)) return

    const channel = supabase.channel(`typing:${conversationId}`)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user.id,
            timestamp: Date.now(),
          },
        })
      }
    })

    // Unsubscribe after sending
    setTimeout(() => channel.unsubscribe(), 100)
  }, [user?.id])

  // Subscribe to typing indicators for a conversation
  const subscribeToTyping = useCallback((conversationId) => {
    if (!user?.id || !isValidUUID(conversationId)) return

    const channelName = `typing:${conversationId}`

    // Avoid duplicate subscriptions
    if (subscriptionsRef.current[`typing-${conversationId}`]) {
      return
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, timestamp } = payload.payload

        // Don't show own typing
        if (user_id === user.id) return

        // Set typing user
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            [user_id]: timestamp,
          },
        }))

        // Clear after 3 seconds
        const timeoutKey = `${conversationId}-${user_id}`
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey])
        }
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          setTypingUsers(prev => {
            const convTyping = { ...prev[conversationId] }
            delete convTyping[user_id]
            return {
              ...prev,
              [conversationId]: convTyping,
            }
          })
        }, 3000)
      })
      .subscribe()

    subscriptionsRef.current[`typing-${conversationId}`] = channel
    // log('📡 Subscribed to typing for conversation:', conversationId)
  }, [user?.id])

  // Check if someone is typing in a conversation
  const isTyping = useCallback((conversationId) => {
    const convTyping = typingUsers[conversationId] || {}
    return Object.keys(convTyping).length > 0
  }, [typingUsers])

  // Get typing user IDs for a conversation
  const getTypingUsers = useCallback((conversationId) => {
    return Object.keys(typingUsers[conversationId] || {})
  }, [typingUsers])

  // ============================================================================
  // ONLINE STATUS (Presence)
  // ============================================================================

  // Setup presence tracking
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = {}
        Object.keys(state).forEach(key => {
          online[key] = true
        })
        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => ({ ...prev, [key]: true }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() })
        }
      })

    presenceChannelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id])

  // Check if a user is online
  const isUserOnline = useCallback((userId) => {
    return !!onlineUsers[userId]
  }, [onlineUsers])

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  const markAsRead = useCallback(async (conversationId) => {
    if (!user?.id || !isValidUUID(conversationId)) return

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      // Update local unread count
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [user?.id])

  // ============================================================================
  // UNSEND MESSAGE (Instagram-style: delete for everyone)
  // ============================================================================

  const unsendMessage = useCallback(async (messageId) => {
    if (!user?.id || !messageId) {
      throw new Error('User must be authenticated and message ID is required')
    }

    try {
      const unsentAt = new Date().toISOString()

      // Mark the message as unsent instead of deleting it so both users see the change
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: '', // Clear original content
          metadata: {
            unsent: true,
            unsent_by: user.id,
            unsent_at: unsentAt,
          },
        })
        .eq('id', messageId)
        .eq('sender_id', user.id) // Ensure only sender can unsend
        .select('id, conversation_id, sender_id, metadata')
        .single()

      if (error) {
        console.error('Error unsending message:', error)
        throw error
      }

      log('✅ Message marked as unsent:', messageId)

      // Optimistically update local state so the sender sees it immediately
      setMessages(prev => {
        const updated = { ...prev }
        const convId = data.conversation_id
        const convMessages = updated[convId] || []

        updated[convId] = convMessages.map(msg =>
          msg.id === data.id
            ? {
              ...msg,
              content: '',
              metadata: {
                ...(msg.metadata || {}),
                unsent: true,
                unsent_by: user.id,
                unsent_at: unsentAt,
              },
            }
            : msg
        )

        return updated
      })

      // Refresh conversations so last message preview updates
      await loadConversations()

      return true
    } catch (error) {
      console.error('Error unsending message:', error)
      throw error
    }
  }, [user?.id, loadConversations])

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup message subscriptions
      Object.values(subscriptionsRef.current).forEach((sub) => {
        if (sub?.unsubscribe) sub.unsubscribe()
      })

      Object.values(pollingIntervalsRef.current).forEach(clearInterval)

      // Cleanup typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout)

      // Cleanup presence
      if (presenceChannelRef.current?.unsubscribe) {
        presenceChannelRef.current.unsubscribe()
      }
    }
  }, [])

  // Load conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations()
    }
  }, [user?.id, loadConversations])

  const contextValue = useMemo(() => ({
    // State
    conversations,
    messages,
    isLoading,

    // Conversations
    loadConversations,
    getOrCreateConversation,
    createGroupConversation,

    // Messages
    loadMessages,
    sendMessage,
    unsendMessage,
    markAsRead,

    // Real-time
    subscribeToMessages,
    unsubscribeFromMessages,
    subscribeToTyping,
    sendTypingIndicator,

    // Status
    isTyping,
    getTypingUsers,
    isUserOnline,
    realtimeDisabled,
  }), [
    conversations, messages, isLoading,
    loadConversations, getOrCreateConversation, createGroupConversation,
    loadMessages, sendMessage, unsendMessage, markAsRead,
    subscribeToMessages, unsubscribeFromMessages, subscribeToTyping, sendTypingIndicator,
    isTyping, getTypingUsers, isUserOnline, realtimeDisabled
  ])

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  )
}

export const useMessagesContext = () => {
  const context = useContext(MessagesContext)
  if (!context) {
    throw new Error('useMessagesContext must be used within MessagesProvider')
  }
  return context
}
