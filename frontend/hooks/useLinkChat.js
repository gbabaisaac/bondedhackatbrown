/**
 * Hooks for Link AI chat functionality
 * Uses separate link_conversations and link_messages tables
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to subscribe to realtime Link messages updates
 * Invalidates queries when new messages arrive
 */
export function useLinkMessagesRealtime(conversationId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`link-messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'link_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        // Any message in this conversation should trigger an update
        if (payload.new?.conversation_id === conversationId) {
          queryClient.invalidateQueries({ queryKey: ['linkMessages', conversationId] })
          queryClient.invalidateQueries({ queryKey: ['linkConversationPreview'] })
          queryClient.invalidateQueries({ queryKey: ['linkConversation'] })
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to Link messages realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])
}

/**
 * Hook to get Link's system profile for the current university
 */
export function useLinkSystemProfile() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['linkSystemProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Get user's university first
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (!profile?.university_id) return null

      // Get Link's system profile for this university
      const { data: linkProfile, error } = await supabase
        .from('link_system_profile')
        .select('*')
        .eq('university_id', profile.university_id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching Link profile:', error)
        return null
      }

      return linkProfile
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to get or create Link conversation for current user
 */
export function useLinkConversation() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['linkConversation', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Use RPC to get or create conversation
      const { data, error } = await supabase
        .rpc('get_or_create_link_conversation', { p_user_id: user.id })

      if (error) {
        console.error('Error getting Link conversation:', error)
        throw error
      }

      // Get conversation details
      const { data: conversation } = await supabase
        .from('link_conversations')
        .select('*')
        .eq('id', data)
        .single()

      return conversation
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch Link messages with pagination
 */
export function useLinkMessages(conversationId, sessionId) {
  const { user } = useAuthStore()

  return useInfiniteQuery({
    queryKey: ['linkMessages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId || !user?.id) {
        return { messages: [], nextPage: null }
      }

      const limit = 50
      const offset = pageParam * limit

      const { data, error } = await supabase
        .from('link_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching Link messages:', error)
        throw error
      }

      // Return newest first for inverted list support
      const messages = data || []

      return {
        messages,
        nextPage: data?.length === limit ? pageParam + 1 : null,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!conversationId && !!user?.id,
  })
}

/**
 * Hook to send a message to Link
 */
export function useSendLinkMessage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, content }) => {
      if (!user?.id) throw new Error('User must be authenticated')
      if (!conversationId) throw new Error('Conversation ID is required')
      if (!content?.trim()) throw new Error('Message content is required')

      // Insert user message
      const { data, error } = await supabase
        .from('link_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('link_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.trim().substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ queryKey: ['linkMessages', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['linkConversation'] })
    },
  })
}

/**
 * Hook to get Link conversation preview for messages list
 * Returns a conversation-like object for the messages list
 */
export function useLinkConversationPreview() {
  const { user } = useAuthStore()
  const { data: linkProfile } = useLinkSystemProfile()

  return useQuery({
    queryKey: ['linkConversationPreview', user?.id],
    queryFn: async () => {
      if (!user?.id || !linkProfile) return null

      // Check if user has a Link conversation
      const { data: conversation } = await supabase
        .from('link_conversations')
        .select('id, last_message_at, last_message_preview')
        .eq('user_id', user.id)
        .maybeSingle()

      // Return Link preview (even if no conversation exists yet)
      return {
        id: 'link',
        type: 'link',
        isLink: true,
        name: linkProfile.display_name || 'Link',
        image_url: linkProfile.avatar_url,
        last_message: conversation?.last_message_preview || linkProfile.bio || 'Your campus buddy! Ask me anything.',
        last_message_at: conversation?.last_message_at,
        sortTime: conversation?.last_message_at
          ? new Date(conversation.last_message_at).getTime()
          : Number.MAX_SAFE_INTEGER, // Keep at top if no messages
        unread_count: 0, // TODO: Track unread Link messages
        participants: [{
          id: 'link',
          full_name: linkProfile.display_name || 'Link',
          avatar_url: linkProfile.avatar_url,
        }],
      }
    },
    enabled: !!user?.id && !!linkProfile,
    staleTime: 1000 * 60, // 1 minute
  })
}
