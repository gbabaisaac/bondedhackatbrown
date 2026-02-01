import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Helper to clear persisted auth data
const clearAuthStorage = async () => {
  try {
    await AsyncStorage.removeItem('auth-storage')
  } catch (error) {
    console.warn('Error clearing auth storage:', error)
  }
}

// Initial state - all auth-related data starts empty/null
const initialState = {
  // User data
  user: null,                    // User object from Supabase (or null if not logged in)
  session: null,                 // Supabase session object
  
  // Auth status
  isAuthenticated: false,        // Boolean: true if user is logged in
  
  // Email & verification
  email: '',                     // Current email being used
  isNewUser: null,               // Boolean: true = new signup, false = returning, null = unknown
  verificationStatus: null,       // 'verified' | 'unverified' | 'expired' | null
  
  // Campus info (for future use)
  campusId: null,                // Which campus the user belongs to
  campusDomain: null,            // Campus domain extracted from email
}

// Step 4: Create actions that update state using set()
export const useAuthStore = create(
  persist(
    (set) => ({
      // Spread initial state
      ...initialState,

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setEmail: (email) => set({ email }),

      setIsNewUser: (isNewUser) => set({ isNewUser }),

      setVerificationStatus: (verificationStatus) => set({ verificationStatus }),

      setSession: (session) => set({ session }),

      setCampusInfo: (campusId, campusDomain) => set({ campusId, campusDomain }),

      // Logout: Reset everything to initial state and clear persisted storage
      logout: async () => {
        set(initialState)
        // Also explicitly clear AsyncStorage to ensure no stale data
        await clearAuthStorage()
      },
    }),
    {
      // Step 6: Persistence middleware
      name: 'auth-storage', // Unique name for AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential auth data (not temporary flow state)
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        email: state.email,
        verificationStatus: state.verificationStatus,
        campusId: state.campusId,
        campusDomain: state.campusDomain,
      }),
    }
  )
)
