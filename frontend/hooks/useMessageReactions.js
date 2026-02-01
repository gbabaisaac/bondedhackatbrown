import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Fetch reactions for a specific message
 */
export function useMessageReactions(messageId) {
  return useQuery({
    queryKey: ['messageReactions', messageId],
    queryFn: async () => {
      if (!messageId) return []

      const { data, error } = await supabase
        .from('message_reactions')
        .select('id, user_id, reaction_type, created_at')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching message reactions:', error)
        throw error
      }

      return data || []
    },
    enabled: !!messageId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch reactions for multiple messages (for a conversation)
 */
export function useConversationReactions(conversationId, messageIds) {
  return useQuery({
    queryKey: ['conversationReactions', conversationId, messageIds?.length],
    queryFn: async () => {
      if (!messageIds || messageIds.length === 0) return {}

      const { data, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, reaction_type, created_at')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching conversation reactions:', error)
        throw error
      }

      // Group by message_id
      const grouped = {}
      data?.forEach(reaction => {
        if (!grouped[reaction.message_id]) {
          grouped[reaction.message_id] = []
        }
        grouped[reaction.message_id].push(reaction)
      })

      return grouped
    },
    enabled: !!conversationId && !!messageIds && messageIds.length > 0,
    staleTime: 30 * 1000,
  })
}

/**
 * Add a reaction to a message
 */
export function useAddReaction() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, reactionType = 'heart' }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding reaction:', error)
        throw error
      }

      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch reactions
      queryClient.invalidateQueries({ queryKey: ['messageReactions', variables.messageId] })
      queryClient.invalidateQueries({ queryKey: ['conversationReactions'] })
    },
  })
}

/**
 * Remove a reaction from a message
 */
export function useRemoveReaction() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, reactionType = 'heart' }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)

      if (error) {
        console.error('Error removing reaction:', error)
        throw error
      }

      return { messageId, reactionType }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch reactions
      queryClient.invalidateQueries({ queryKey: ['messageReactions', variables.messageId] })
      queryClient.invalidateQueries({ queryKey: ['conversationReactions'] })
    },
  })
}

/**
 * Toggle a reaction (add if doesn't exist, remove if exists)
 */
export function useToggleReaction() {
  const { user } = useAuthStore()
  const addReaction = useAddReaction()
  const removeReaction = useRemoveReaction()

  return useMutation({
    mutationFn: async ({ messageId, reactionType = 'heart', existingReactions = [] }) => {
      const userReaction = existingReactions.find(
        r => r.user_id === user?.id && r.reaction_type === reactionType
      )

      if (userReaction) {
        // Remove existing reaction
        return await removeReaction.mutateAsync({ messageId, reactionType })
      } else {
        // Add new reaction
        return await addReaction.mutateAsync({ messageId, reactionType })
      }
    },
  })
}
