/**
 * Quick test script to verify Supabase connection
 * Run with: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js')

// Get from environment variables (REQUIRED - no fallbacks)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing environment variables!')
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL')
  console.error('   Required: EXPO_PUBLIC_SUPABASE_ANON_KEY')
  console.error('')
  console.error('   Create a .env file in the project root with:')
  console.error('   EXPO_PUBLIC_SUPABASE_URL=your_project_url')
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  process.exit(1)
}

console.log('🔍 Testing Supabase Connection...\n')
console.log('URL:', supabaseUrl)
console.log('Key starts with:', supabaseKey.substring(0, 20) + '...')
console.log('Key format:', supabaseKey.startsWith('eyJ') || supabaseKey.startsWith('sb_publishable_') 
  ? '✅ Valid format' 
  : '⚠️ Unusual format (expected "eyJ..." or "sb_publishable_...")')
console.log('')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('Test 1: Testing basic connection...')
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('   Code:', error.code)
      console.error('   Details:', error.details)
      return
    }
    
    console.log('✅ Basic connection works!\n')
    
    // Test 2: Auth service
    console.log('Test 2: Testing Auth service...')
    const testEmail = `test-${Date.now()}@example.com`
    const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
      email: testEmail,
    })
    
    if (authError) {
      console.error('❌ Auth service error:', authError.message)
      console.error('   Status:', authError.status)
      console.error('   Code:', authError.code)
      console.error('   Details:', authError.details)
      console.error('   Hint:', authError.hint)
      return
    }
    
    console.log('✅ Auth service works! OTP sent to:', testEmail)
    console.log('')
    console.log('🎉 All tests passed! Your Supabase connection is working.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

testConnection()

