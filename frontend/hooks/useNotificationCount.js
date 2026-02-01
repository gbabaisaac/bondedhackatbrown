import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isNetworkError } from '../utils/rlsHelpers'

export function useNotificationCount() {
  const { user } = useAuthStore()
  let warned = false

  return useQuery({
    queryKey: ['notificationCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0

      const [notificationsResult, friendRequestsResult, messageRequestsResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null),
        supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('message_requests')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
      ])

      if (notificationsResult.error) {
        if (isNetworkError(notificationsResult.error)) {
          // Network error - silently return 0, don't log as error
          console.warn('⚠️ Network error fetching notifications, returning 0')
        } else if (
          notificationsResult.error?.code !== 'PGRST205' &&
          notificationsResult.error?.code !== '42P01' &&
          !notificationsResult.error?.message?.includes('does not exist')
        ) {
          console.error('Error fetching notification count:', notificationsResult.error)
        } else if (!warned) {
          warned = true
          console.warn('Notifications table missing or blocked by RLS. Run database/notifications-schema.sql.')
        }
      }

      if (friendRequestsResult.error) {
        if (isNetworkError(friendRequestsResult.error)) {
          console.warn('⚠️ Network error fetching friend requests, returning 0')
        } else {
          console.error('Error fetching friend request count:', friendRequestsResult.error)
        }
      }

      if (messageRequestsResult.error) {
        if (isNetworkError(messageRequestsResult.error)) {
          console.warn('⚠️ Network error fetching message requests, returning 0')
        } else if (
          messageRequestsResult.error?.code !== 'PGRST205' &&
          messageRequestsResult.error?.code !== '42P01' &&
          !messageRequestsResult.error?.message?.includes('does not exist')
        ) {
          console.error('Error fetching message request count:', messageRequestsResult.error)
        } else if (!warned) {
          warned = true
          console.warn('Message requests table missing or blocked by RLS.')
        }
      }

      const notificationCount = notificationsResult.count || 0
      const friendRequestCount = friendRequestsResult.count || 0
      const messageRequestCount = messageRequestsResult.count || 0

      return notificationCount + friendRequestCount + messageRequestCount
    },
    enabled: !!user?.id,
    staleTime: 0, // Always consider stale to allow immediate refetch
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
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
}
