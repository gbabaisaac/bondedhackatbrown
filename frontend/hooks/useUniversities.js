import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isSuperAdminEmail } from '../utils/admin'

export function useUniversities() {
  const { user } = useAuthStore()
  const isSuperAdmin = isSuperAdminEmail(user?.email)

  return useQuery({
    queryKey: ['universities', isSuperAdmin, user?.id],
    queryFn: async () => {
      if (!isSuperAdmin) return []

      const { data, error } = await supabase
        .from('universities')
        .select('id, name, domain')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching universities:', error)
        throw error
      }

      return data || []
    },
    enabled: !!user && isSuperAdmin,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
