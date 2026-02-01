/**
 * React Query hooks for messaging
 * 
 * These hooks provide a React Query interface for the MessagesContext,
 * offering better caching and state management.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isNetworkError } from '../utils/rlsHelpers'

const MESSAGES_PER_PAGE = 50

const isPolicyRecursionError = (error) => {
  return error?.code === '42P17' || error?.message?.includes('infinite recursion')
}

/**
 * Hook to fetch user's conversations
 */
export function useConversations() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // console.log('📬 Fetching conversations for user:', user.id)

      // Fetch conversations where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          last_read_at,
          conversation:conversations (
            id,
            name,
            type,
            created_by,
            created_at,
            updated_at,
            last_message_at,
            org_id,
            class_section_id,
            avatar_url,
            is_system_generated
          )
        `)
        .eq('user_id', user.id)

      if (partError) {
        if (isNetworkError(partError)) {
          console.warn('⚠️ Network error fetching conversations, returning empty array:', partError.message || 'Connection timeout')
          return [] // Return empty array instead of throwing to prevent UI crashes
        }
        if (isPolicyRecursionError(partError)) {
          return []
        }
        console.error('❌ Error fetching conversations:', partError)
        throw partError
      }

      // Get details for each conversation
      const conversationsWithDetails = await Promise.all(
        (participations || []).map(async (item) => {
          const conv = item.conversation
          if (!conv) return null

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Get last reaction in conversation (for preview)
          let lastReaction = null
          try {
            const { data: reaction } = await supabase
              .from('message_reactions')
              .select(`
                id,
                reaction_type,
                created_at,
                user_id,
                user:profiles!message_reactions_user_id_fkey (
                  id,
                  full_name,
                  username
                ),
                message:messages!message_reactions_message_id_fkey (
                  id,
                  conversation_id,
                  sender_id
                )
              `)
              .eq('message.conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            lastReaction = reaction || null
          } catch (err) {
            // Ignore reaction preview failures
          }

          // Get other participants using RPC function (avoids RLS recursion)
          let participants = []
          try {
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('get_conversation_participants', { conv_id: conv.id })

            if (rpcError) {
              console.warn('RPC get_conversation_participants error:', rpcError)
            } else {
              participants = (rpcData || []).map(p => ({
                id: p.user_id,
                full_name: p.full_name,
                username: p.username,
                avatar_url: p.avatar_url,
              }))
            }
          } catch (err) {
            console.warn('Failed to get participants via RPC:', err)
          }

          const lastReadAt = item.last_read_at || '1970-01-01'
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .gt('created_at', lastReadAt)

          const unread_count = unreadCount || 0

          // Find the other participant (exclude current user)
          let other_participant = null
          if (conv.type === 'direct' && participants.length > 0) {
            // Filter out current user first
            const others = participants.filter(p => p.id !== user.id)
            if (others.length > 0) {
              other_participant = others[0]
            } else {
              // Fallback: if somehow only current user is in participants, use first one
              // This shouldn't happen for direct chats but handles edge cases
              console.warn('⚠️ No other participant found for direct chat:', conv.id, 'participants:', participants.map(p => ({ id: p.id, name: p.full_name })))
              other_participant = participants[0]
            }
          }

          // console.log('📬 Conversation:', conv.id, 'type:', conv.type, 'other_participant:', other_participant?.id, other_participant?.full_name)

          const lastMessageAt = lastMsg?.created_at || conv.last_message_at || conv.created_at

          let lastPreviewText = lastMsg?.content || null
          let lastPreviewAt = lastMessageAt
          if (lastMsg?.sender_id === user.id && lastMsg?.content) {
            lastPreviewText = `You: ${lastMsg.content}`
          }
          if (lastReaction?.created_at) {
            const reactionTime = new Date(lastReaction.created_at).getTime()
            const messageTime = lastMessageAt ? new Date(lastMessageAt).getTime() : 0
            const isReactionOnMyMessage = lastReaction.message?.sender_id === user.id
            const isOtherUser = lastReaction.user_id && lastReaction.user_id !== user.id

            if (reactionTime >= messageTime && isReactionOnMyMessage && isOtherUser) {
              const emoji = lastReaction.reaction_type === 'heart' ? '❤️' : '👍'
              lastPreviewText = `reacted to your message ${emoji}`
              lastPreviewAt = lastReaction.created_at
            }
          }

          return {
            ...conv,
            last_message: lastMsg?.content || null,
            last_message_at: lastMessageAt,
            last_message_sender_id: lastMsg?.sender_id || null,
            last_preview_text: lastPreviewText,
            last_preview_at: lastPreviewAt,
            participants,
            other_participant,
            unread_count: unread_count,
            is_muted: false, // Added for future use
          }
        })
      )

      // De-dupe by conversation id (defensive: handle duplicated participant rows)
      const uniqueById = new Map()
      for (const conv of conversationsWithDetails.filter(Boolean)) {
        const existing = uniqueById.get(conv.id)
        if (!existing) {
          uniqueById.set(conv.id, conv)
          continue
        }
        const existingTime = new Date(existing.last_message_at || existing.created_at).getTime()
        const nextTime = new Date(conv.last_message_at || conv.created_at).getTime()
        uniqueById.set(
          conv.id,
          nextTime >= existingTime ? { ...existing, ...conv } : existing
        )
      }

      // De-dupe group/org/class conversations by composite key (prevents duplicate org/group rows)
      const uniqueByGroupKey = new Map()
      for (const conv of uniqueById.values()) {
        if (conv.type === 'direct') {
          uniqueByGroupKey.set(`direct:${conv.id}`, conv)
          continue
        }

        const groupKey = conv.org_id
          ? `${conv.type}:org:${conv.org_id}`
          : conv.class_section_id
            ? `${conv.type}:class:${conv.class_section_id}`
            : conv.name
              ? `${conv.type}:name:${conv.name.toLowerCase()}`
              : `other:${conv.id}`

        const existing = uniqueByGroupKey.get(groupKey)
        if (!existing) {
          uniqueByGroupKey.set(groupKey, conv)
          continue
        }

        const existingTime = new Date(existing.last_message_at || existing.created_at).getTime()
        const nextTime = new Date(conv.last_message_at || conv.created_at).getTime()
        uniqueByGroupKey.set(groupKey, nextTime >= existingTime ? { ...existing, ...conv } : existing)
      }

      // Filter out nulls and conversations that shouldn't be shown
      const sorted = Array.from(uniqueByGroupKey.values())
        .filter(Boolean)
        .filter(conv => {
          // Always show conversations the user created
          if (conv.created_by === user.id) return true
          // Always show group chats (forums/orgs)
          if (conv.type === 'group' || conv.type === 'org') return true
          // For direct chats, only show if there's at least one message or it's new
          return conv.last_message !== null || conv.created_at > new Date(Date.now() - 3600000).toISOString()
        })
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))

      // console.log(`✅ Fetched ${sorted.length} conversations`)
      return sorted
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      // Don't retry on network errors - they'll resolve when connection is restored
      if (isNetworkError(error)) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`conversations-updates-${user.id}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          // Refresh conversation previews + unread counts on new/updated messages
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] })
          queryClient.invalidateQueries({ queryKey: ['notificationCount', user.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id, queryClient])

  return query
}

/**
 * Hook to fetch messages for a conversation with pagination
 */
export function useMessages(conversationId) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) return { messages: [], hasMore: false }

      console.log(`📨 Fetching messages for conversation: ${conversationId}, page: ${pageParam}`)

      const startTime = Date.now()

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      })

      const queryPromise = supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          metadata,
          created_at,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1)

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      console.log(`⏱️ Fetch completed in ${Date.now() - startTime}ms. Error: ${error?.message}, Data length: ${data?.length}`)

      if (error) {
        if (isNetworkError(error)) {
          console.warn('⚠️ Network error fetching messages, returning empty:', error.message || 'Connection timeout')
          return { messages: [], hasMore: false } // Return empty instead of throwing
        }
        console.error('❌ Error fetching messages:', error)
        throw error
      }

      // console.log(`✅ Fetched ${data?.length || 0} messages`)

      // Don't reverse - inverted FlatList expects newest first (descending order)
      return {
        messages: data || [],
        hasMore: data?.length === MESSAGES_PER_PAGE,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((total, page) => total + page.messages.length, 0)
    },
    enabled: !!conversationId && !!user?.id,
    staleTime: 0, // Always refetch for real-time feel
    refetchInterval: 5000, // Poll every 5 seconds as fallback
    refetchIntervalInBackground: true, // Continue polling when app is in background
    retry: (failureCount, error) => {
      // Don't retry on network errors - they'll resolve when connection is restored
      if (isNetworkError(error)) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return

    let channel = null

    const setupSubscription = () => {
      // Clean up existing subscription if any
      if (channel) {
        channel.unsubscribe()
        channel = null
      }

      channel = supabase
        .channel(`messages:${conversationId}`, {
          config: {
            broadcast: { self: false },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            // console.log(`📬 Real-time message ${payload.eventType} received via useMessages:`, payload.new?.id || payload.old?.id)

            if (payload.eventType === 'INSERT') {

              // Fetch sender details
              const { data: sender, error: senderError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .eq('id', payload.new.sender_id)
                .single()

              if (senderError) {
                console.error('Error fetching sender in useMessages:', senderError)
              }

              // Parse metadata if it's a string (JSONB from database)
              let parsedMetadata = payload.new.metadata
              if (typeof payload.new.metadata === 'string') {
                try {
                  parsedMetadata = JSON.parse(payload.new.metadata)
                } catch (e) {
                  console.warn('Failed to parse message metadata in useMessages:', e)
                  parsedMetadata = {}
                }
              }

              const newMessage = {
                ...payload.new,
                metadata: parsedMetadata || {},
                sender: sender || {
                  id: payload.new.sender_id,
                  full_name: 'Unknown',
                  username: 'unknown',
                  avatar_url: null,
                },
              }

              // console.log('📬 useMessages: New message with metadata:', {
              //   id: newMessage.id,
              //   hasImage: parsedMetadata?.type === 'image',
              //   imageUrl: parsedMetadata?.imageUrl,
              //   imagePath: parsedMetadata?.imagePath,
              // })

              // Add to cache
              queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) {
                  // console.log('✅ Creating new messages cache')
                  return { pages: [{ messages: [newMessage], hasMore: false }], pageParams: [0] }
                }

                const firstPage = old.pages[0]
                const existingIds = firstPage.messages.map(m => m.id)

                // Avoid duplicates
                if (existingIds.includes(newMessage.id)) {
                  console.log('⚠️ Duplicate message ignored in useMessages:', newMessage.id)
                  return old
                }

                // console.log('✅ Adding message to cache:', newMessage.id)
                // Add new message to BEGINNING of array (newest first for inverted FlatList)
                return {
                  ...old,
                  pages: [
                    {
                      ...firstPage,
                      messages: [newMessage, ...firstPage.messages],
                    },
                    ...old.pages.slice(1),
                  ],
                }
              })

              // Also update conversations list
              queryClient.invalidateQueries({ queryKey: ['conversations'] })
            } else if (payload.eventType === 'UPDATE') {
              // Update existing message in cache
              queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) return old

                return {
                  ...old,
                  pages: old.pages.map(page => ({
                    ...page,
                    messages: page.messages.map(msg =>
                      msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                    ),
                  })),
                }
              })
            } else if (payload.eventType === 'DELETE') {
              // Remove message from cache
              queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) return old

                return {
                  ...old,
                  pages: old.pages.map(page => ({
                    ...page,
                    messages: page.messages.filter(msg => msg.id !== payload.old.id),
                  })),
                }
              })
            }
          }
        )
        .subscribe((status, err) => {
          // console.log('📡 useMessages subscription status:', status, 'for conversation:', conversationId)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime messages for:', conversationId)
          } else if (status === 'CLOSED') {
            // console.log('🔒 useMessages subscription closed for:', conversationId)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error in useMessages for:', conversationId, 'Error:', err)
            // Realtime may not be available, but polling will continue as fallback
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ Channel subscription timed out in useMessages for:', conversationId)
          }
        })
    }

    setupSubscription()

    return () => {
      // console.log('🧹 Unsubscribing from messages channel:', conversationId)
      if (channel) {
        channel.unsubscribe()
        channel = null
      }
    }
  }, [conversationId]) // Removed queryClient from dependencies to prevent re-subscriptions

  return query
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, content, metadata = null }) => {
      if (!user?.id) throw new Error('User must be authenticated')
      if (!conversationId) throw new Error('Conversation ID is required')
      // Allow empty content for rich message types
      if (!content?.trim()) throw new Error('Message content is required')

      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      }

      // Add metadata if provided (for shared posts, images, etc.)
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
          metadata,
          created_at,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      // console.log('✅ Message sent:', data.id)
      return data
    },
    onSuccess: (data, variables) => {
      const { conversationId } = variables

      // Manually update the messages cache to confirm the message immediately
      // This prevents the "lag" waiting for the real-time subscription event
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) {
          // If no cache exists, create one with the new message
          return { pages: [{ messages: [data], hasMore: false }], pageParams: [0] }
        }

        // Prepend to the first page (newest messages at beginning for inverted FlatList)
        const newPages = old.pages.map((page, index) => {
          if (index === 0) {
            // Check if already exists to avoid duplicate from race condition
            if (page.messages.some(m => m.id === data.id)) return page

            return {
              ...page,
              messages: [data, ...page.messages]
            }
          }
          return page
        })

        return {
          ...old,
          pages: newPages
        }
      })

      // Invalidate conversations to update last message preview in list
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Hook to unsend (delete for everyone) a message
 */
export function useUnsendMessage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, conversationId }) => {
      if (!user?.id) throw new Error('User must be authenticated')
      if (!messageId) throw new Error('Message ID is required')

      const unsentAt = new Date().toISOString()
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: '',
          metadata: {
            unsent: true,
            unsent_by: user.id,
            unsent_at: unsentAt,
          },
        })
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .select('id, conversation_id, sender_id, content, metadata, created_at')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      const { conversationId } = variables
      const convId = conversationId || data?.conversation_id

      if (convId) {
        queryClient.setQueryData(['messages', convId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(msg =>
                msg.id === data.id
                  ? { ...msg, content: '', metadata: data.metadata || { unsent: true } }
                  : msg
              ),
            })),
          }
        })
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Hook to create or get a direct conversation
 */
export function useCreateConversation() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ otherUserId, groupName, participantIds }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      // If it's a direct conversation
      if (otherUserId && !participantIds) {
        try {
          // Check for existing conversation
          const { data: existing, error: existingError } = await supabase
            .rpc('find_direct_conversation', {
              user1: user.id,
              user2: otherUserId,
            })

          if (existingError) {
            if (isPolicyRecursionError(existingError)) {
              return `local-conv-${user.id}-${otherUserId}`
            }
            throw existingError
          }

          if (existing) {
            // console.log('📬 Found existing conversation:', existing)
            return existing
          }
        } catch (error) {
          if (isPolicyRecursionError(error)) {
            return `local-conv-${user.id}-${otherUserId}`
          }
          throw error
        }

        // Create new direct conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'direct',
            created_by: user.id,
          })
          .select()
          .single()

        if (convError) {
          if (isPolicyRecursionError(convError)) {
            return `local-conv-${user.id}-${otherUserId}`
          }
          throw convError
        }

        // Add participants
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, user_id: user.id },
            { conversation_id: newConv.id, user_id: otherUserId },
          ])

        if (partError) {
          if (isPolicyRecursionError(partError)) {
            return `local-conv-${user.id}-${otherUserId}`
          }
          throw partError
        }

        // console.log('✅ Created direct conversation:', newConv.id)
        return newConv.id
      }

      // If it's a group conversation
      if (participantIds?.length) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'group',
            name: groupName || 'Group Chat',
            created_by: user.id,
          })
          .select()
          .single()

        if (convError) {
          if (isPolicyRecursionError(convError)) {
            return `local-group-${user.id}-${Date.now()}`
          }
          throw convError
        }

        // Add all participants
        const allParticipants = [...new Set([user.id, ...participantIds])]
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(
            allParticipants.map(userId => ({
              conversation_id: newConv.id,
              user_id: userId,
            }))
          )

        if (partError) {
          if (isPolicyRecursionError(partError)) {
            return `local-group-${user.id}-${Date.now()}`
          }
          throw partError
        }

        // console.log('✅ Created group conversation:', newConv.id)
        return newConv.id
      }

      throw new Error('Must provide otherUserId or participantIds')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Hook to mark conversation as read
 */
export function useMarkAsRead() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId) => {
      if (!user?.id || !conversationId) return

      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch conversations immediately to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.refetchQueries({ queryKey: ['conversations'] })
      // Also invalidate notification count in case it includes message notifications
      queryClient.invalidateQueries({ queryKey: ['notificationCount', user?.id] })
    },
  })
}
