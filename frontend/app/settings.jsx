import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, ActionSheetIOS, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { hp, wp } from '../helpers/common'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import AppHeader from '../components/AppHeader'
import AppCard from '../components/AppCard'
import SectionHeader from '../components/SectionHeader'
import { useAppTheme, useThemeMode } from './theme'
import ThemedView from './components/ThemedView'
import ThemedText from './components/ThemedText'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'

export default function Settings() {
  const router = useRouter()
  const theme = useAppTheme()
  const { mode, setMode } = useThemeMode()
  const { logout } = useAuthStore()
  const { data: currentUserProfile } = useCurrentUserProfile()
  const queryClient = useQueryClient()
  const isDarkMode = mode === 'dark'
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [friendsVisibility, setFriendsVisibility] = useState('school')
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [healthResults, setHealthResults] = useState([])
  const [healthLastRun, setHealthLastRun] = useState(null)
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const styles = createStyles(theme)

  useEffect(() => {
    if (currentUserProfile?.friends_visibility) {
      setFriendsVisibility(currentUserProfile.friends_visibility)
    }
  }, [currentUserProfile?.friends_visibility])

  const visibilityOptions = [
    { label: 'Only me', value: 'private' },
    { label: 'My school', value: 'school' },
    { label: 'Everyone', value: 'public' },
  ]

  const getVisibilityLabel = (value) => {
    return visibilityOptions.find(option => option.value === value)?.label || 'My school'
  }

  const updateFriendsVisibility = async (nextValue) => {
    if (!currentUserProfile?.id || nextValue === friendsVisibility) return
    try {
      setIsUpdatingVisibility(true)
      const { error } = await supabase
        .from('profiles')
        .update({ friends_visibility: nextValue })
        .eq('id', currentUserProfile.id)
      if (error) {
        throw error
      }
      setFriendsVisibility(nextValue)
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', currentUserProfile.id] })
    } catch (error) {
      console.error('❌ Failed to update friends visibility:', error)
      Alert.alert('Error', 'Unable to update friends visibility right now.')
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const handleFriendsVisibilityPress = () => {
    const options = visibilityOptions.map(option => option.label)
    const cancelButtonIndex = options.length
    const actionSheetOptions = [...options, 'Cancel']

    const onSelect = (buttonIndex) => {
      if (buttonIndex === cancelButtonIndex) return
      const selected = visibilityOptions[buttonIndex]
      if (selected) updateFriendsVisibility(selected.value)
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: actionSheetOptions,
          cancelButtonIndex,
        },
        onSelect
      )
      return
    }

    Alert.alert(
      'Friends Visibility',
      undefined,
      [
        ...visibilityOptions.map(option => ({
          text: option.label,
          onPress: () => updateFriendsVisibility(option.value),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    )
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true)
              console.log('🚪 Signing out...')
              
              // Step 1: Sign out from Supabase (clears JWT from SecureStore)
              // This removes the access_token and refresh_token from secure storage
              const { error: signOutError } = await supabase.auth.signOut()
              
              if (signOutError) {
                console.error('❌ Error signing out from Supabase:', signOutError)
                Alert.alert('Error', 'Failed to sign out. Please try again.')
                setIsSigningOut(false)
                return
              }
              
              console.log('✅ Supabase session cleared (JWT removed from SecureStore)')
              
              // Step 2: Clear auth store (clears Zustand state and AsyncStorage)
              // logout() now clears both Zustand state and AsyncStorage
              await logout()
              
              console.log('✅ Signed out successfully - all tokens and auth data cleared')
              console.log('   ✓ JWT cleared from SecureStore (via supabase.auth.signOut)')
              console.log('   ✓ Auth state cleared from Zustand')
              console.log('   ✓ AsyncStorage cleared')
              
              // Step 4: Navigate to login screen
              router.replace('/login')
            } catch (error) {
              console.error('❌ Error during sign out:', error)
              Alert.alert('Error', 'An error occurred while signing out. Please try again.')
              setIsSigningOut(false)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  const isTableMissingError = (error) => {
    return error?.code === 'PGRST205' ||
      error?.code === '42P01' ||
      error?.message?.includes('Could not find the table') ||
      (error?.message?.includes('relation') && error?.message?.includes('does not exist'))
  }

  const isRlsBlockedError = (error) => {
    return error?.code === '42501' ||
      error?.message?.toLowerCase?.().includes('permission denied') ||
      error?.message?.toLowerCase?.().includes('row-level security')
  }

  const runHealthChecks = async () => {
    if (isRunningHealthCheck) return
    setIsRunningHealthCheck(true)

    const results = []

    const checkTableRead = async (table) => {
      const { error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })

      if (error) {
        if (isTableMissingError(error)) {
          return { status: 'fail', detail: 'Missing table' }
        }
        if (isRlsBlockedError(error)) {
          return { status: 'warn', detail: 'RLS denied for current role' }
        }
        return { status: 'warn', detail: error.message || 'Read error' }
      }
      return { status: 'pass', detail: 'OK' }
    }

    const checkRpc = async (name, args) => {
      const { error } = await supabase.rpc(name, args)
      if (error) {
        if (error?.code === '42883' || error?.message?.includes('function')) {
          return { status: 'fail', detail: 'RPC missing' }
        }
        if (isRlsBlockedError(error)) {
          return { status: 'warn', detail: 'RLS denied for current role' }
        }
        return { status: 'warn', detail: error.message || 'RPC error' }
      }
      return { status: 'pass', detail: 'OK' }
    }

    const checkStorage = async () => {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) {
        return { status: 'warn', detail: 'Storage list blocked' }
      }
      const hasBucket = (data || []).some((bucket) => bucket?.name === 'bonded-media')
      return hasBucket
        ? { status: 'pass', detail: 'bonded-media bucket found' }
        : { status: 'fail', detail: 'bonded-media bucket missing' }
    }

    const tableChecks = [
      { key: 'notifications', title: 'notifications table' },
      { key: 'message_requests', title: 'message_requests table' },
      { key: 'org_members', title: 'org_members table' },
      { key: 'forums', title: 'forums table' },
      { key: 'friend_requests', title: 'friend_requests table' },
      { key: 'messages', title: 'messages table' },
    ]

    for (const table of tableChecks) {
      const result = await checkTableRead(table.key)
      results.push({ id: `table:${table.key}`, title: table.title, ...result })
    }

    if (currentUserProfile?.id) {
      const friendsRpc = await checkRpc('get_profile_friends', {
        p_profile_id: currentUserProfile.id,
        p_limit: 1,
        p_offset: 0,
      })
      results.push({ id: 'rpc:get_profile_friends', title: 'get_profile_friends RPC', ...friendsRpc })

      const friendCountRpc = await checkRpc('get_profile_friend_count', {
        p_profile_id: currentUserProfile.id,
      })
      results.push({ id: 'rpc:get_profile_friend_count', title: 'get_profile_friend_count RPC', ...friendCountRpc })
    } else {
      results.push({
        id: 'rpc:profile_missing',
        title: 'profile-dependent RPCs',
        status: 'warn',
        detail: 'Current profile not loaded',
      })
    }

    const storageCheck = await checkStorage()
    results.push({ id: 'storage:bonded-media', title: 'bonded-media storage', ...storageCheck })

    setHealthResults(results)
    setHealthLastRun(new Date().toLocaleString())
    setIsRunningHealthCheck(false)
  }

  const healthSummary = useMemo(() => {
    if (!healthResults.length) return null
    const counts = healthResults.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
    return counts
  }, [healthResults])

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, showArrow = true, titleStyle }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon} size={hp(2.2)} color={theme.colors.accent} />
        </View>
        <View style={styles.settingTextContainer}>
          <ThemedText style={[styles.settingTitle, titleStyle]}>{title}</ThemedText>
          {subtitle && <ThemedText variant="secondary" style={styles.settingSubtitle}>{subtitle}</ThemedText>}
        </View>
      </View>
      {rightComponent || (showArrow && (
        <Ionicons
          name="chevron-forward"
          size={hp(2)}
          color={theme.colors.textSecondary}
          style={{ opacity: 0.5 }}
        />
      ))}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <AppHeader title="Settings" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Appearance */}
          <SectionHeader title="Appearance" />
          <AppCard style={styles.sectionCard}>
              <SettingItem
                icon="moon-outline"
                title="Dark Mode"
                subtitle="Switch to dark theme"
                rightComponent={
                  <Switch
                    value={isDarkMode}
                    onValueChange={(value) => setMode(value ? 'dark' : 'light')}
                    trackColor={{ false: theme.colors.surface, true: theme.colors.accent }}
                    thumbColor={theme.colors.white}
                    ios_backgroundColor={theme.colors.surface}
                  />
                }
                showArrow={false}
              />
          </AppCard>

          {/* Notifications */}
          <SectionHeader title="Notifications" />
          <AppCard style={styles.sectionCard}>
              <SettingItem
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Receive notifications on your device"
                rightComponent={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: theme.colors.surface, true: theme.colors.accent }}
                    thumbColor={theme.colors.white}
                    ios_backgroundColor={theme.colors.surface}
                  />
                }
                showArrow={false}
              />
              <SettingItem
                icon="mail-outline"
                title="Email Notifications"
                subtitle="Get notified via email"
                rightComponent={
                  <Switch
                    value={emailNotifications}
                    onValueChange={setEmailNotifications}
                    trackColor={{ false: theme.colors.surface, true: theme.colors.accent }}
                    thumbColor={theme.colors.white}
                    ios_backgroundColor={theme.colors.surface}
                  />
                }
                showArrow={false}
              />
          </AppCard>

          {/* Preferences */}
          <SectionHeader title="Preferences" />
          <AppCard style={styles.sectionCard}>
              <SettingItem
                icon="person-outline"
                title="Edit Profile"
                onPress={() => router.push('/profile')}
              />
              <SettingItem
                icon="people-outline"
                title="Friends Visibility"
                subtitle={getVisibilityLabel(friendsVisibility)}
                onPress={handleFriendsVisibilityPress}
                rightComponent={
                  isUpdatingVisibility ? (
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  ) : null
                }
                showArrow={!isUpdatingVisibility}
              />
              <SettingItem
                icon="lock-closed-outline"
                title="Privacy & Security"
                onPress={() => {}}
              />
              <SettingItem
                icon="language-outline"
                title="Language"
                subtitle="English"
                onPress={() => {}}
              />
          </AppCard>

          {/* About */}
          <SectionHeader title="About" />
          <AppCard style={styles.sectionCard}>
              <SettingItem
                icon="help-circle-outline"
                title="Help & Support"
                onPress={() => {}}
              />
              <SettingItem
                icon="document-text-outline"
                title="Terms of Service"
                onPress={() => {}}
              />
              <SettingItem
                icon="shield-checkmark-outline"
                title="Privacy Policy"
                onPress={() => {}}
              />
              <SettingItem
                icon="information-circle-outline"
                title="App Version"
                subtitle="1.0.0"
                showArrow={false}
              />
          </AppCard>

          {currentUserProfile?.is_super_admin && (
            <>
              <SectionHeader title="Admin Tools" />
              <AppCard style={styles.sectionCard}>
                <SettingItem
                  icon="pulse-outline"
                  title="System Health Check"
                  subtitle={healthLastRun ? `Last run: ${healthLastRun}` : 'Validate tables, RLS, storage, RPCs'}
                  onPress={runHealthChecks}
                  rightComponent={
                    isRunningHealthCheck ? (
                      <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    ) : null
                  }
                  showArrow={!isRunningHealthCheck}
                />
                {healthSummary && (
                  <View style={styles.healthSummaryRow}>
                    <ThemedText variant="secondary" style={styles.healthSummaryText}>
                      {`${healthSummary.pass || 0} passed • ${healthSummary.warn || 0} warnings • ${healthSummary.fail || 0} failures`}
                    </ThemedText>
                  </View>
                )}
                {healthResults.length > 0 && (
                  <View style={styles.healthResults}>
                    {healthResults.map((item) => (
                      <View key={item.id} style={styles.healthRow}>
                        <View
                          style={[
                            styles.healthStatusDot,
                            item.status === 'pass' && styles.healthPass,
                            item.status === 'warn' && styles.healthWarn,
                            item.status === 'fail' && styles.healthFail,
                          ]}
                        />
                        <View style={styles.healthTextWrap}>
                          <ThemedText style={styles.healthTitle}>{item.title}</ThemedText>
                          <ThemedText variant="secondary" style={styles.healthDetail}>
                            {item.detail}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </AppCard>
            </>
          )}

          {/* Account */}
          <SectionHeader title="Account" />
          <AppCard style={styles.sectionCard}>
              <SettingItem
                icon="log-out-outline"
                title={isSigningOut ? 'Signing Out...' : 'Sign Out'}
                titleStyle={{ color: '#ED4956' }}
                onPress={handleSignOut}
                showArrow={!isSigningOut}
              />
          </AppCard>
        </ScrollView>

        <BottomNav />
      </ThemedView>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: hp(10),
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: theme.spacing.xs,
  },
  settingSubtitle: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    opacity: theme.ui.metaOpacity,
  },
  healthSummaryRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  healthSummaryText: {
    fontSize: theme.typography.sizes.sm,
  },
  healthResults: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  healthStatusDot: {
    width: hp(1),
    height: hp(1),
    borderRadius: hp(0.5),
    marginTop: hp(0.4),
    backgroundColor: theme.colors.textSecondary,
  },
  healthPass: {
    backgroundColor: theme.colors.success || '#2ecc71',
  },
  healthWarn: {
    backgroundColor: theme.colors.warning || '#f1c40f',
  },
  healthFail: {
    backgroundColor: theme.colors.error || '#e74c3c',
  },
  healthTextWrap: {
    flex: 1,
  },
  healthTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
  },
  healthDetail: {
    fontSize: theme.typography.sizes.sm,
  },
})
