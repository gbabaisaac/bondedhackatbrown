import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 

// Only create client if credentials are available
let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
  }
} else {
  if (typeof window === 'undefined') {
    // Only log in server-side (build time)
    console.warn('Supabase credentials not found. Waitlist will use local storage fallback.')
  }
}

export { supabase }







