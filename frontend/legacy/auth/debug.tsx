import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getFriendlyErrorMessage } from '../../utils/userFacingErrors'

/**
 * Debug screen to test magic link callback on emulator
 * 
 * Usage:
 * 1. Send magic link to your email
 * 2. Open email on your computer/phone
 * 3. Copy the FULL URL from the email link
 * 4. Paste it here and click "Process Link"
 */
export default function AuthDebug() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const log = (...args) => {
    if (__DEV__) console.log(...args)
  }

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/')
    }
  }, [router])

  if (!__DEV__) return null

  const handleProcessLink = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please paste the magic link URL')
      return
    }

    setIsProcessing(true)

    try {
      // Extract token from the URL
      // The URL format is: https://project.supabase.co/auth/v1/verify?token=...&type=email&redirect_to=bonded://auth/callback
      
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('token_hash')
      const type = urlObj.searchParams.get('type') || 'email'

      if (!token) {
        Alert.alert('Error', 'No token found in URL. Make sure you copied the full link from the email.')
        setIsProcessing(false)
        return
      }

      log('🔗 Processing magic link URL...')
      log('Type:', type)

      // Verify the OTP token with Supabase
      // This will exchange the token for a session
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'email' | 'magiclink',
      })

      if (error) {
        console.error('❌ Error verifying token:', error)
        Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to verify token'))
        setIsProcessing(false)
        return
      }

      if (data.session) {
        log('✅ Session established')
        Alert.alert(
          'Success!',
          `Logged in as ${data.session.user.email}\n\nCheck console for session details.`,
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Warning', 'Token verified but no session created')
      }
    } catch (error: any) {
      console.error('❌ Error processing link:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to process link'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Magic Link Debug</Text>
      <Text style={styles.instructions}>
        1. Send magic link to your email{'\n'}
        2. Open email on your computer/phone{'\n'}
        3. Right-click the link and "Copy Link Address"{'\n'}
        4. Paste the full URL below{'\n'}
        5. Click "Process Link"
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Paste magic link URL here..."
        value={url}
        onChangeText={setUrl}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, isProcessing && styles.buttonDisabled]}
        onPress={handleProcessLink}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : 'Process Link'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        This will verify the token and create a session, just like clicking the link would.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
})
