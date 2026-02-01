import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useNotifications() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          actor_id,
          type,
          entity_type,
          entity_id,
          data,
          created_at,
          read_at,
          actor:profiles!notifications_actor_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        if (
          error?.code === 'PGRST205' ||
          error?.code === '42P01' ||
          error?.message?.includes('does not exist')
        ) {
          return []
        }
        throw error
      }
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 15000,
  })
}
