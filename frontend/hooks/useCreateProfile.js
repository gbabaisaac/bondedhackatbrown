import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Hook to create/update user profile after successful login
 * Called after magic link authentication succeeds
 * NO triggers - this is app-level only
 */
export const useCreateProfile = () => {
  return useMutation({
    mutationFn: async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Create or update profile (upsert)
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
        }, {
          onConflict: 'id',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        throw error
      }

      return data
    },
    retry: 1,
  })
}






