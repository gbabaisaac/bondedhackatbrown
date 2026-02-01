import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export function useEventLikes(eventIds = []) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['eventLikes', user?.id, eventIds?.length],
    queryFn: async () => {
      if (!user?.id || !eventIds || eventIds.length === 0) return []

      const { data, error } = await supabase
        .from('event_likes')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds)

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id && eventIds?.length > 0,
    staleTime: 30 * 1000,
  })
}

export function useToggleEventLike() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, isLiked }) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (!eventId) throw new Error('Event ID is required')

      if (isLiked) {
        const { error } = await supabase
          .from('event_likes')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_likes')
          .insert({ event_id: eventId, user_id: user.id })
        if (error) throw error
      }

      return { eventId, isLiked: !isLiked }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventLikes', user?.id] })
    },
  })
}
