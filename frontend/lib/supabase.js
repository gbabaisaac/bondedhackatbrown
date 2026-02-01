import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Get from environment variables or use fallback
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validate that we have the required values
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file or app.config.js')
}

// Platform-aware storage adapter
// expo-secure-store only works on native platforms (iOS/Android)
// On web, use localStorage instead
const storage = Platform.OS === 'web'
  ? {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(window.localStorage.getItem(key))
        }
        return Promise.resolve(null)
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value)
        }
        return Promise.resolve()
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key)
        }
        return Promise.resolve()
      },
    }
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      removeItem: SecureStore.deleteItemAsync,
    }

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable URL detection on web for OAuth callbacks
    storage,
  },
})