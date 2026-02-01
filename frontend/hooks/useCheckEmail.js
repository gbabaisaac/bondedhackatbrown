import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Hook to check if an email exists in the database
 * Returns whether the user is new or returning
 */
export const useCheckEmail = (email) => {
  return useQuery({
    queryKey: ['checkEmail', email],
    queryFn: async () => {
      if (!email) {
        throw new Error('Email is required')
      }

      try {
        // Check if email exists in profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single()

        if (error) {
          // If error is "not found" (PGRST116), user doesn't exist
          if (error.code === 'PGRST116') {
            return {
              exists: false,
              user: null,
              isNewUser: true,
            }
          }
          // If table doesn't exist yet, treat as new user
          if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            return {
              exists: false,
              user: null,
              isNewUser: true,
            }
          }
          throw error
        }

        // User exists
        return {
          exists: true,
          user: data,
          isNewUser: false,
          isVerified: data.is_verified || false,
          verificationStatus: data.is_verified ? 'verified' : 'unverified',
        }
      } catch (error) {
        console.error('Error checking email:', error)
        throw error
      }
    },
    enabled: !!email && email.length > 0, // Only run if email exists
    retry: 1, // Retry once on failure
  })
}

