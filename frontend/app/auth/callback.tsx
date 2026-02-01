import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const log = (...args: any[]) => {
      if (__DEV__) console.log(...args)
    }
    // Handle deep link URL manually (since detectSessionInUrl: false)
    const handleDeepLink = async (url: string) => {
      log('🔗 Deep link received')
      
      // Parse URL to extract tokens
      const { queryParams } = Linking.parse(url)
      const { access_token, refresh_token } = queryParams as {
        access_token?: string
        refresh_token?: string
      }

      if (access_token && refresh_token) {
        log('🔑 Tokens found in URL, setting session...')
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })

        if (error) {
          console.error('❌ Error setting session:', error)
          return
        }

        log('✅ Session established')
      } else {
        console.warn('⚠️ No tokens found in URL')
      }
    }

    // Check initial URL (if app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url)
      }
    })

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url)
    })

    // Also check existing session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Session Error:', error)
        return
      }
      if (data.session) {
        log('✅ Existing session found')
      } else {
        log('ℹ️ No existing session')
      }
    })

    // Listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log('🔔 Auth Event:', event)
      if (session) {
        log('✅ Session updated')
      }
    })

    return () => {
      subscription.remove()
      authSubscription.unsubscribe()
    }
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#000',
  },
})





