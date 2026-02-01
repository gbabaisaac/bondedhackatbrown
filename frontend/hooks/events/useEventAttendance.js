import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Hook to get user's attendance status for an event
 */
export function useEventAttendance(eventId, userId) {
  return useQuery({
    queryKey: ['eventAttendance', eventId, userId],
    queryFn: async () => {
      if (!eventId || !userId) return null

      const { data, error } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        throw error
      }

      return data || null
    },
    enabled: !!eventId && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get derived attendance state for UI
 */
export function useEventAttendanceState(event, userId) {
  const { data: attendance } = useEventAttendance(event?.id, userId)

  const status = attendance?.status || null
  const isGoing = status === 'going' || status === 'approved'
  const isRequested = status === 'requested'
  const isWaitlisted = status === 'waitlisted'
  const hasTicket = !!attendance?.ticket_id

  // Determine what actions user can take
  const canToggleGoing = !event?.requires_approval && !event?.is_paid
  const canRequest = event?.requires_approval && !isRequested && !isGoing
  const ticketOwned = hasTicket

  return {
    status,
    isGoing,
    isRequested,
    isWaitlisted,
    hasTicket,
    ticketOwned,
    canToggleGoing,
    canRequest,
  }
}

