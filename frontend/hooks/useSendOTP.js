import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Hook to send 6-digit email OTP
 * For testing in Expo Go (magic links don't work in Expo Go)
 */
export const useSendOTP = () => {
  return useMutation({
    mutationFn: async (email) => {
      if (!email) {
        throw new Error('Email is required')
      }

      const cleanEmail = email.toLowerCase().trim()

      console.log('📧 Sending OTP to:', cleanEmail)

      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        console.error('❌ Error sending OTP:', error)
        throw error
      }

      console.log('✅ OTP sent successfully to:', cleanEmail)
      return data
    },
    retry: 1,
  })
}
