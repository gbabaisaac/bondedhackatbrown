import { supabase } from './supabase'

/**
 * Send magic link to user's email
 * Minimal implementation - no OTP UI, no verification call
 */
export async function sendMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'bonded://auth/callback',
    },
  })
}






