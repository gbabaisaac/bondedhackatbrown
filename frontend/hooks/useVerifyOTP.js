import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to verify 6-digit email OTP
 * Minimal: verify code, set session in store
 */
export const useVerifyOTP = () => {
  const { setUser, setSession, setEmail } = useAuthStore()

  return useMutation({
    mutationFn: async ({ email, token }) => {
      if (!email || !token) {
        throw new Error('Email and token are required')
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: 'email',
      })

      if (error) {
        console.error('❌ Error verifying OTP:', error)
        throw error
      }

      return {
        user: data.user,
        session: data.session,
      }
    },
    onSuccess: (data) => {
      if (data.user && data.session) {
        setUser(data.user)
        setSession(data.session)
        setEmail(data.user.email)
      }
    },
    retry: 1,
  })
}
