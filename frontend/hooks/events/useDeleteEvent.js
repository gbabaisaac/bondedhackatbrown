import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteEvent } from '../../api/events/deleteEvent'
import { useAuthStore } from '../../stores/authStore'

/**
 * Hook to delete an event
 * Handles event deletion with confirmation and cache invalidation
 */
export function useDeleteEvent() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId) => {
      if (!user) {
        throw new Error('User must be authenticated to delete events')
      }

      console.log('Deleting event:', eventId)
      const result = await deleteEvent(eventId)
      console.log('Event deleted successfully:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('✅ Event deleted, invalidating queries:', {
        eventId: data?.id,
        title: data?.title,
      })

      // Invalidate events queries to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['eventsForUser'] })
      queryClient.invalidateQueries({ queryKey: ['calendarData'] })

      console.log('🔄 Queries invalidated - events should refetch')
    },
    onError: (error) => {
      console.error('❌ Event deletion failed:', error)
    },
    retry: 1,
  })
}
