import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useEventAttendanceState } from './useEventAttendance'

/**
 * Hook for event actions (RSVP, request, buy ticket)
 * Handles all user interactions with events
 */
export function useEventActions(event, currentUserId) {
  const queryClient = useQueryClient()
  const attendanceState = useEventAttendanceState(event, currentUserId)

  // Toggle going status
  const toggleGoingMutation = useMutation({
    mutationFn: async ({ eventId, userId, isGoing }) => {
      if (isGoing) {
        // Remove attendance
        const { error } = await supabase
          .from('event_attendance')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Add attendance
        const { error } = await supabase.from('event_attendance').upsert({
          event_id: eventId,
          user_id: userId,
          status: 'going',
        })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['eventsForUser', currentUserId])
      queryClient.invalidateQueries(['event', event?.id])
      queryClient.invalidateQueries(['eventAttendance', event?.id, currentUserId])
    },
  })

  // Request to join (for approval-required events)
  const requestJoinMutation = useMutation({
    mutationFn: async ({ eventId, userId }) => {
      const { error } = await supabase.from('event_attendance').upsert({
        event_id: eventId,
        user_id: userId,
        status: 'requested',
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['eventsForUser', currentUserId])
      queryClient.invalidateQueries(['event', event?.id])
      queryClient.invalidateQueries(['eventAttendance', event?.id, currentUserId])
    },
  })

  const toggleGoing = () => {
    if (!event?.id || !currentUserId) return

    const isCurrentlyGoing = attendanceState?.status === 'going'
    toggleGoingMutation.mutate({
      eventId: event.id,
      userId: currentUserId,
      isGoing: isCurrentlyGoing,
    })
  }

  const requestJoin = () => {
    if (!event?.id || !currentUserId) return
    requestJoinMutation.mutate({
      eventId: event.id,
      userId: currentUserId,
    })
  }

  // Determine what actions are available
  const canToggleGoing =
    !event?.requires_approval && !event?.is_paid && attendanceState?.canToggleGoing
  const canRequest = event?.requires_approval && attendanceState?.canRequest
  const isPaid = event?.is_paid
  const ticketOwned = attendanceState?.ticketOwned

  return {
    attendanceState: {
      ...attendanceState,
      canToggleGoing,
      canRequest,
      isPaid,
      ticketOwned,
    },
    toggleGoing,
    requestJoin,
    isLoading: toggleGoingMutation.isPending || requestJoinMutation.isPending,
  }
}

