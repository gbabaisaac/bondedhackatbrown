import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useMessageRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['messageRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('message_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!message_requests_sender_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 15000,
  })
}

export function useMessageRequestStatus(otherUserId) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['messageRequestStatus', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return { status: 'none' }

      const { data, error } = await supabase
        .from('message_requests')
        .select('id, sender_id, receiver_id, status')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .eq('status', 'pending')
        .maybeSingle()

      if (error) throw error

      if (!data) return { status: 'none' }
      if (data.sender_id === user.id) return { status: 'sent', requestId: data.id }
      return { status: 'received', requestId: data.id }
    },
    enabled: !!user?.id && !!otherUserId,
    staleTime: 10 * 1000,
  })
}

export function useSendMessageRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ receiverId }) => {
      if (!user?.id) throw new Error('Must be logged in')
      if (!receiverId) throw new Error('Receiver is required')

      const { data, error } = await supabase
        .from('message_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
        })
        .select('id')
        .maybeSingle()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Message request already sent')
        }
        throw error
      }

      return data || { id: 'created', success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRequestStatus'] })
      queryClient.invalidateQueries({ queryKey: ['messageRequests'] })
    },
  })
}

export function useAcceptMessageRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, senderId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      // Find or create conversation
      const { data: existing, error: existingError } = await supabase
        .rpc('find_direct_conversation', { user1: user.id, user2: senderId })

      if (existingError) throw existingError

      let conversationId = existing
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'direct',
            created_by: user.id,
          })
          .select()
          .single()

        if (convError) throw convError

        conversationId = newConv.id

        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: senderId },
          ])

        if (partError) throw partError
      }

      const { error: updateError } = await supabase
        .from('message_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('receiver_id', user.id)

      if (updateError) throw updateError

      return conversationId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRequests'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useDeclineMessageRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('message_requests')
        .delete()
        .eq('id', requestId)
        .eq('receiver_id', user.id)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRequests'] })
    },
  })
}
