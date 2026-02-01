import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { Stack, usePathname, useRouter } from 'expo-router'
import Constants from 'expo-constants'
import React, { useEffect, useRef, useState } from 'react'
import { Dimensions, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { DrawerLayout, GestureHandlerRootView } from 'react-native-gesture-handler'
import Loading from '../components/Loading'
import { OnboardingNudge } from '../components/OnboardingNudge'
import OrgModal from '../components/Orgs/OrgModal'
import ProfileModal from '../components/Profile/ProfileModal'
import { ClubsProvider, useClubsContext } from '../contexts/ClubsContext'
import { EventsProvider } from '../contexts/EventsContext'
import { MessagesProvider } from '../contexts/MessagesContext'
import { OrgModalProvider, useOrgModal } from '../contexts/OrgModalContext'
import { ProfileModalProvider } from '../contexts/ProfileModalContext'
import { StoriesProvider } from '../contexts/StoriesContext'
import { UnifiedForumProvider, useUnifiedForum } from '../contexts/UnifiedForumContext'
import { hp, wp } from '../helpers/common'
import { useEventsForUser } from '../hooks/events/useEventsForUser'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useProfileViewersCount } from '../hooks/useProfileViews'
import { supabase } from '../lib/supabase'
import QueryProvider from '../providers/QueryProvider'
import { useAuthStore } from '../stores/authStore'
import { useOnboardingStore } from '../stores/onboardingStore'
import { isFeatureEnabled } from '../utils/featureGates'
import { ThemeProvider, useAppTheme } from './theme'

// Only initialize Sentry on native platforms (iOS/Android)
// Web SSR doesn't have access to browser APIs during server-side rendering
if (Platform.OS !== 'web') {
  const sentryDsn = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = process.env.EXPO_PUBLIC_APP_ENV
    || process.env.APP_ENV
    || process.env.EAS_BUILD_PROFILE
    || (__DEV__ ? 'development' : 'production')
  const release = Constants.expoConfig?.version
  if (sentryDsn && sentryDsn !== 'your_sentry_dsn_here') {
    Sentry.init({
      dsn: sentryDsn,
      debug: __DEV__,
      environment,
      release,
    });
  }
}


const { width: SCREEN_WIDTH } = Dimensions.get('window')

const DrawerItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => {
  const theme = useAppTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.5),
        marginBottom: hp(0.5),
      }}
    >
      <Ionicons
        name={icon as any}
        size={hp(2.2)}
        color={theme.colors.textPrimary}
        style={{ opacity: 0.95, marginRight: wp(3) }}
      />
      <Text
        style={{
          fontSize: hp(1.8),
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.fontFamily.body,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

import { useCalendarData } from '../hooks/useCalendarData'

const EventsPrefetcher = () => {
  const { user } = useAuthStore()
  useEventsForUser(user?.id)
  useCalendarData(user?.id)
  return null
}

const DrawerContent = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const theme = useAppTheme()
  const { user, isAuthenticated } = useAuthStore()
  const { forums, currentForum, switchToForum } = useUnifiedForum()
  const { openOrg } = useOrgModal()

  // Early return if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  // Get user clubs and admin clubs
  const clubsContext = useClubsContext()
  const userClubs = clubsContext.getUserClubs()
  const adminClubs = clubsContext.getAdminClubs()
  const ensureClubForum = clubsContext.ensureClubForum

  // Organize forums by type
  const orgForums = forums.filter(f => f.type === 'org') // Use org forums from unified context
  const classForums = forums.filter(f => f.type === 'class')
  // Public forums: exclude campus/main (shown at top) and org forums (handled separately)
  const publicForums = [
    ...forums.filter(f => 
      f.type === 'public' && 
      f.type !== 'campus' && 
      f.type !== 'main' && 
      f.name?.toLowerCase() !== 'main'
    ),
    ...orgForums.filter(f => f.is_public)
  ]
  const privateForums = [...forums.filter(f => f.type === 'private'), ...orgForums.filter(f => !f.is_public)]

  // console.log('DrawerContent - User clubs:', userClubs.length, userClubs.map(c => ({ id: c.id, name: c.name })))
  // console.log('DrawerContent - Admin clubs:', adminClubs.length, adminClubs.map(c => ({ id: c.id, name: c.name })))
  // console.log('DrawerContent - Forums from unified context:', forums.length, forums.map(f => ({ id: f.id, name: f.name, type: f.type, is_public: f.is_public, avatar: f.avatar })))
  // console.log('DrawerContent - Org forums:', orgForums.length, orgForums.map(f => ({ id: f.id, name: f.name, type: f.type, is_public: f.is_public, avatar: f.avatar })))
  // console.log('DrawerContent - Public forums:', publicForums.length, publicForums.map(f => ({ id: f.id, name: f.name, type: f.type, is_public: f.is_public, avatar: f.avatar })))
  // console.log('DrawerContent - Private forums:', privateForums.length, privateForums.map(f => ({ id: f.id, name: f.name, type: f.type, is_public: f.is_public, avatar: f.avatar })))

  const [classesExpanded, setClassesExpanded] = React.useState(true)
  const [publicExpanded, setPublicExpanded] = React.useState(true)
  const [privateExpanded, setPrivateExpanded] = React.useState(true)

  // Helper to get specialized icons for classes based on major/prefix
  const getModuleIcon = (forum: { code?: string; name?: string }) => {
    const code = (forum.code || forum.name || '').toUpperCase()

    // Group 1: Technology & Computer Science
    if (code.startsWith('CSC') || code.startsWith('CIS') || code.startsWith('IST') || code.startsWith('SWE') || code.startsWith('ITE') || code.includes('COMP')) {
      return { name: 'code-slash-outline', color: '#0EA5E9', label: 'TECH' }
    }

    // Group 2: Science, Math & Engineering
    if (code.startsWith('MAT') || code.startsWith('MTH') || code.startsWith('PHY') || code.startsWith('CHM') || code.startsWith('STA') || code.startsWith('ENGR') || code.startsWith('EGR')) {
      return { name: 'flask-outline', color: '#10B981', label: 'STEM' }
    }

    // Group 3: Business, Economics & Finance
    if (code.startsWith('ACC') || code.startsWith('ECN') || code.startsWith('BUS') || code.startsWith('MKT') || code.startsWith('FIN') || code.startsWith('MBA')) {
      return { name: 'stats-chart-outline', color: '#F59E0B', label: 'BIZ' }
    }

    // Group 4: Humanities, Arts & Languages
    if (code.startsWith('ART') || code.startsWith('MUS') || code.startsWith('HIS') || code.startsWith('PHL') || code.startsWith('LAN') || code.startsWith('ENG') || code.startsWith('SPA') || code.startsWith('FRE')) {
      return { name: 'color-palette-outline', color: '#EC4899', label: 'ARTS' }
    }

    // Group 5: Biological & Health Sciences
    if (code.startsWith('BIO') || code.startsWith('NUR') || code.startsWith('KIN') || code.startsWith('HSC') || code.startsWith('MED') || code.startsWith('PHM')) {
      return { name: 'medical-outline', color: '#EF4444', label: 'BIO' }
    }

    // Group 6: Social Sciences & Communication
    if (code.startsWith('PSY') || code.startsWith('SOC') || code.startsWith('POL') || code.startsWith('COM') || code.startsWith('LAW') || code.startsWith('EDU')) {
      return { name: 'people-outline', color: '#8B5CF6', label: 'SOC' }
    }

    // Default: General School
    return { name: 'school-outline', color: theme.colors.textSecondary, label: 'CLASS' }
  }

  // Get user profile data with actual avatar
  const { data: userProfileData } = useCurrentUserProfile()
  const { data: profileViewersCount = 0 } = useProfileViewersCount(user?.id)
  const userProfile = {
    name: userProfileData?.full_name || userProfileData?.name || user?.email?.split('@')[0] || 'User',
    headline: userProfileData?.email || user?.email || '',
    location: userProfileData?.university?.name || userProfileData?.university || 'University of Rhode Island',
    avatar: userProfileData?.avatarUrl || null,
    profileViewers: profileViewersCount,
    socialLinks: null,
  }
  const campusForumLabel = `${userProfileData?.university?.name || userProfileData?.university || 'University'} Forum`

  return (
    <Pressable
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          },
          android: {
            elevation: 8,
          },
        }),
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: hp(4) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section - LinkedIn Style */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate('/profile')}
          style={{
            paddingTop: hp(6),
            paddingHorizontal: wp(4),
            paddingBottom: hp(3),
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ position: 'relative', alignItems: 'center', marginBottom: hp(2) }}>
            {/* Profile Picture */}
            <View style={{ position: 'relative' }}>
              {userProfile.avatar ? (
                <Image
                  source={{ uri: userProfile.avatar }}
                  style={{
                    width: hp(10),
                    height: hp(10),
                    borderRadius: hp(5),
                    borderWidth: 3,
                    borderColor: theme.colors.white,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: hp(10),
                    height: hp(10),
                    borderRadius: hp(5),
                    backgroundColor: theme.colors.bondedPurple,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: theme.colors.white,
                  }}
                >
                  <Text
                    style={{
                      fontSize: hp(4),
                      fontWeight: '800',
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.fontFamily.heading,
                    }}
                  >
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: hp(0.5) }}>
            <Text
              style={{
                fontSize: hp(2.2),
                fontWeight: '700',
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.heading,
                marginRight: wp(1),
              }}
            >
              {userProfile.name}
            </Text>
            <View
              style={{
                width: hp(1.8),
                height: hp(1.8),
                borderRadius: hp(0.9),
                backgroundColor: '#0A66C2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={hp(1)} color={theme.colors.white} />
            </View>
          </View>

          {/* Headline */}
          <Text
            style={{
              fontSize: hp(1.5),
              color: theme.colors.textSecondary,
              opacity: 0.9,
              fontFamily: theme.typography.fontFamily.body,
              textAlign: 'center',
              marginBottom: hp(0.5),
              paddingHorizontal: wp(2),
            }}
            numberOfLines={2}
          >
            {userProfile.headline}
          </Text>

          {/* Location */}
          <Text
            style={{
              fontSize: hp(1.3),
              color: theme.colors.textSecondary,
              opacity: 0.7,
              fontFamily: theme.typography.fontFamily.body,
              textAlign: 'center',
              marginBottom: hp(2),
            }}
          >
            {userProfile.location}
          </Text>

        </TouchableOpacity>

        {/* Statistics Section */}
        <View
          style={{
            paddingVertical: hp(2),
            paddingHorizontal: wp(4),
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={{ fontSize: hp(1.4), color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.body }}>
              <Text style={{ color: '#70B5F9', fontWeight: '600' }}>{userProfile.profileViewers}</Text> profile viewers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Links Section */}
        {userProfile.socialLinks && (
          <View
            style={{
              paddingVertical: hp(2),
              paddingHorizontal: wp(4),
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                fontSize: hp(1.6),
                fontWeight: '600',
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.body,
                marginBottom: hp(1.5),
              }}
            >
              Connect
            </Text>
            <View style={{ gap: hp(1) }}>
              {userProfile.socialLinks?.instagram && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: hp(1),
                    paddingHorizontal: wp(3),
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <Ionicons name="logo-instagram" size={hp(2.2)} color="#E4405F" style={{ marginRight: wp(2) }} />
                  <Text
                    style={{
                      fontSize: hp(1.6),
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.fontFamily.body,
                    }}
                  >
                    {userProfile.socialLinks.instagram}
                  </Text>
                </TouchableOpacity>
              )}
              {userProfile.socialLinks?.spotify && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: hp(1),
                    paddingHorizontal: wp(3),
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <Ionicons name="musical-notes" size={hp(2.2)} color="#1DB954" style={{ marginRight: wp(2) }} />
                  <Text
                    style={{
                      fontSize: hp(1.6),
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.fontFamily.body,
                    }}
                  >
                    {userProfile.socialLinks.spotify}
                  </Text>
                </TouchableOpacity>
              )}
              {userProfile.socialLinks?.appleMusic && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: hp(1),
                    paddingHorizontal: wp(3),
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <Ionicons name="musical-note" size={hp(2.2)} color="#FA243C" style={{ marginRight: wp(2) }} />
                  <Text
                    style={{
                      fontSize: hp(1.6),
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.fontFamily.body,
                    }}
                  >
                    {userProfile.socialLinks.appleMusic}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Forums Section */}
        <View
          style={{
            paddingVertical: hp(2),
            paddingHorizontal: wp(4),
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              fontSize: hp(1.6),
              fontWeight: '600',
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontFamily.body,
              marginBottom: hp(1.5),
            }}
          >
            Forums
          </Text>

          {/* Main Forum */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: hp(1.2),
              paddingHorizontal: wp(3),
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.backgroundSecondary,
              marginBottom: hp(0.5),
            }}
            activeOpacity={0.7}
            onPress={() => {
              const mainForum = forums.find(f => f.type === 'main') || forums.find(f => f.type === 'campus')
              if (mainForum) {
                switchToForum(mainForum.id)
              }
              onNavigate('/forum')
            }}
          >
            <View
              style={{
                width: hp(3.5),
                height: hp(3.5),
                borderRadius: hp(1),
                backgroundColor: theme.colors.bondedPurple,
                marginRight: wp(3),
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(107, 70, 193, 0.4)', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="planet" size={hp(2.2)} color="#FFF" />
              </View>
            </View>
            <Text
              style={{
                fontSize: hp(1.8),
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.body,
                fontWeight: '600',
              }}
            >
              {campusForumLabel}
            </Text>
          </TouchableOpacity>

          {/* Your classes (expandable) */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: hp(1.2),
              paddingHorizontal: wp(3),
              borderRadius: theme.radius.lg,
              marginBottom: hp(0.5),
            }}
            activeOpacity={0.7}
            onPress={() => setClassesExpanded((prev) => !prev)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: hp(2.8),
                  height: hp(2.8),
                  borderRadius: hp(1.4),
                  backgroundColor: theme.colors.backgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: wp(3),
                }}
              >
                <Ionicons
                  name="school-outline"
                  size={hp(2)}
                  color={theme.colors.textSecondary}
                />
              </View>
              <Text
                style={{
                  fontSize: hp(1.8),
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.body,
                  fontWeight: '500',
                }}
              >
                Your classes
              </Text>
            </View>
            <Ionicons
              name={classesExpanded ? 'chevron-up' : 'chevron-down'}
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.7 }}
            />
          </TouchableOpacity>
          {classesExpanded &&
            classForums.map((forum) => (
              <View
                key={forum.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: wp(10),
                  paddingVertical: hp(0.8),
                  paddingRight: wp(3),
                  marginLeft: wp(3),
                  marginBottom: hp(0.3),
                }}
              >
                {/* Dynamic Class Icon based on Department */}
                <View
                  style={{
                    width: hp(3.4),
                    height: hp(3.4),
                    borderRadius: hp(1.7),
                    backgroundColor: getModuleIcon(forum).color + '15', // Subtle tinted background
                    marginRight: wp(2),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={getModuleIcon(forum).name as any}
                    size={hp(1.8)}
                    color={getModuleIcon(forum).color}
                  />
                </View>

                {/* Class Name - Navigate to Forum */}
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.7}
                  onPress={() => {
                    switchToForum(forum.id)
                    onNavigate('/forum')
                  }}
                >
                  <Text
                    style={{
                      fontSize: hp(1.5),
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.fontFamily.body,
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {forum.code || forum.name}
                  </Text>
                </TouchableOpacity>

                {/* Forum Button */}
                <TouchableOpacity
                  style={{
                    paddingHorizontal: wp(2),
                    paddingVertical: hp(0.5),
                    marginLeft: wp(1),
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    switchToForum(forum.id)
                    onNavigate('/forum')
                  }}
                >
                  <Ionicons name="chatbubbles-outline" size={hp(1.8)} color={theme.colors.bondedPurple} />
                </TouchableOpacity>

                {/* Group Chat Button */}
                <TouchableOpacity
                  style={{
                    paddingHorizontal: wp(2),
                    paddingVertical: hp(0.5),
                  }}
                  activeOpacity={0.7}
                  onPress={() => onNavigate(`/chat?forumId=${forum.id}&forumName=${encodeURIComponent(forum.code || forum.name)}&isGroupChat=true`)}
                >
                  <Ionicons name="people-outline" size={hp(1.8)} color={theme.colors.accent} />
                </TouchableOpacity>
              </View>
            ))}

          {/* Public forums (expandable) */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: hp(1.2),
              paddingHorizontal: wp(3),
              borderRadius: theme.radius.lg,
              marginBottom: hp(0.5),
            }}
            activeOpacity={0.7}
            onPress={() => setPublicExpanded((prev) => !prev)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: hp(2.8),
                  height: hp(2.8),
                  borderRadius: hp(1.4),
                  backgroundColor: theme.colors.backgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: wp(3),
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={hp(2)}
                  color={theme.colors.textSecondary}
                />
              </View>
              <Text
                style={{
                  fontSize: hp(1.8),
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.body,
                  fontWeight: '500',
                }}
              >
                Public forums
              </Text>
            </View>
            <Ionicons
              name={publicExpanded ? 'chevron-up' : 'chevron-down'}
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.7 }}
            />
          </TouchableOpacity>
          {publicExpanded &&
            publicForums.map((forum) => (
              <TouchableOpacity
                key={forum.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: wp(12),
                  paddingVertical: hp(1),
                  paddingRight: wp(3),
                  borderRadius: theme.radius.md,
                  marginLeft: wp(3),
                  marginBottom: hp(0.3),
                }}
                activeOpacity={0.7}
                onPress={() => {
                  if (forum.type === 'org') {
                    switchToForum(forum.id)
                    onNavigate('/forum')
                  } else {
                    onNavigate('/forum')
                  }
                }}
              >
                {/* Show organization logo, forum image, or generated initial */}
                {forum.image || forum.logo_url || forum.avatar || forum.avatar_url ? (
                  <View
                    style={{
                      width: hp(3.2),
                      height: hp(3.2),
                      borderRadius: hp(1),
                      marginRight: wp(2),
                      overflow: 'hidden',
                      backgroundColor: theme.colors.backgroundSecondary
                    }}
                  >
                    <Image
                      source={{ uri: forum.image || forum.logo_url || forum.avatar || forum.avatar_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      width: hp(3.2),
                      height: hp(3.2),
                      borderRadius: hp(1),
                      backgroundColor: theme.colors.backgroundSecondary,
                      marginRight: wp(2),
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  >
                    <Text
                      style={{
                        fontSize: hp(1.6),
                        color: theme.colors.bondedPurple,
                        fontFamily: theme.typography.fontFamily.heading,
                        fontWeight: '700',
                      }}
                    >
                      {forum.name?.charAt(0).toUpperCase() || 'F'}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: hp(1.6),
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.fontFamily.body,
                    fontWeight: '500',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {forum.name}
                </Text>
              </TouchableOpacity>
            ))}


          {/* Private forums (expandable) */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: hp(1.2),
              paddingHorizontal: wp(3),
              borderRadius: theme.radius.lg,
              marginBottom: hp(0.5),
            }}
            activeOpacity={0.7}
            onPress={() => setPrivateExpanded((prev) => !prev)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: hp(2.8),
                  height: hp(2.8),
                  borderRadius: hp(1.4),
                  backgroundColor: theme.colors.backgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: wp(3),
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={hp(2)}
                  color={theme.colors.textSecondary}
                />
              </View>
              <Text
                style={{
                  fontSize: hp(1.8),
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.body,
                  fontWeight: '500',
                }}
              >
                Private forums
              </Text>
            </View>
            <Ionicons
              name={privateExpanded ? 'chevron-up' : 'chevron-down'}
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.7 }}
            />
          </TouchableOpacity>
          {privateExpanded && (
            <>
              {/* Regular private forums */}
              {privateForums.map((forum) => (
                <TouchableOpacity
                  key={forum.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingLeft: wp(12),
                    paddingVertical: hp(1),
                    paddingRight: wp(3),
                    borderRadius: theme.radius.md,
                    marginLeft: wp(3),
                    marginBottom: hp(0.3),
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    switchToForum(forum.id)
                    onNavigate('/forum')
                  }}
                >
                  {/* Show organization logo for org forums, lock icon for others */}
                  {/* Forum Image with Fallback */}
                  {forum.image || forum.logo_url || forum.avatar || forum.avatar_url ? (
                    <View
                      style={{
                        width: hp(3.2),
                        height: hp(3.2),
                        borderRadius: hp(1),
                        marginRight: wp(2),
                        overflow: 'hidden',
                        backgroundColor: theme.colors.backgroundSecondary
                      }}
                    >
                      <Image
                        source={{ uri: forum.image || forum.logo_url || forum.avatar || forum.avatar_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: hp(3.2),
                        height: hp(3.2),
                        borderRadius: hp(1),
                        backgroundColor: theme.colors.backgroundSecondary,
                        marginRight: wp(2),
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.border
                      }}
                    >
                      <Text
                        style={{
                          fontSize: hp(1.6),
                          color: theme.colors.bondedPurple,
                          fontFamily: theme.typography.fontFamily.heading,
                          fontWeight: '700',
                        }}
                      >
                        {forum.name?.charAt(0).toUpperCase() || 'P'}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: hp(1.6),
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.fontFamily.body,
                      opacity: 0.85,
                      flex: 1,
                    }}
                  >
                    {forum.name}
                  </Text>
                  {/* Action buttons for organization forums */}
                  {forum.type === 'org' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Organization page button */}
                      <TouchableOpacity
                        style={{
                          padding: wp(2),
                          borderRadius: theme.radius.sm,
                          marginRight: wp(1),
                          minWidth: hp(4),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          openOrg(forum.org_id)
                        }}
                      >
                        <Ionicons name="information-circle-outline" size={hp(2)} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      {/* Message button */}
                      <TouchableOpacity
                        style={{
                          padding: wp(2),
                          borderRadius: theme.radius.sm,
                          minWidth: hp(4),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          switchToForum(forum.id)
                          onNavigate('/forum')
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={hp(2)} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Message button for non-org forums */}
                  {forum.type !== 'org' && (
                    <TouchableOpacity
                      style={{
                        padding: wp(2),
                        borderRadius: theme.radius.sm,
                        minWidth: hp(4),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        switchToForum(forum.id)
                        onNavigate('/forum')
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={hp(2)} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}

            </>
          )}
        </View>

        {/* Admin organizations + create organization */}
        <View
          style={{
            paddingVertical: hp(2),
            paddingHorizontal: wp(4),
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {/* Admin clubs list */}
          {(adminClubs && adminClubs.length > 0) && (
            <>
              <Text
                style={{
                  fontSize: hp(1.4),
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamily.body,
                  fontWeight: '600',
                  marginBottom: hp(1),
                  letterSpacing: 0.3,
                }}
              >
                Your organizations
              </Text>
              {adminClubs.map((club) => {
                if (!club || !club.id) return null
                return (
                  <TouchableOpacity
                    key={club.id}
                    activeOpacity={0.7}
                    onPress={() => openOrg(club.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: hp(1.2),
                      paddingHorizontal: wp(2),
                      borderRadius: theme.radius.md,
                      marginBottom: hp(0.5),
                      marginTop: hp(0.5),
                    }}
                  >
                    {club.avatar ? (
                      <Image
                        source={{ uri: club.avatar }}
                        style={{
                          width: hp(3.5),
                          height: hp(3.5),
                          borderRadius: hp(0.5),
                          marginRight: wp(2),
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: hp(3.5),
                          height: hp(3.5),
                          borderRadius: hp(0.5),
                          backgroundColor: theme.colors.backgroundSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: wp(2),
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: hp(1.8),
                            color: theme.colors.accent,
                            fontFamily: theme.typography.fontFamily.heading,
                            fontWeight: '700',
                          }}
                        >
                          {club.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: hp(1.6),
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.fontFamily.body,
                        fontWeight: '500',
                        flex: 1,
                      }}
                    >
                      {club.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={hp(2)}
                      color={theme.colors.textSecondary}
                      style={{ opacity: 0.5 }}
                    />
                  </TouchableOpacity>
                )
              })}
            </>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onNavigate('/clubs/create')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: hp(1.5),
              marginTop: adminClubs.length > 0 ? hp(1) : 0,
            }}
          >
            <View
              style={{
                width: hp(3.5),
                height: hp(3.5),
                borderRadius: hp(0.5),
                backgroundColor: theme.colors.backgroundSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: wp(2),
                borderWidth: 1,
                borderColor: theme.colors.bondedPurple,
              }}
            >
              <Ionicons
                name="add"
                size={hp(2)}
                color={theme.colors.bondedPurple}
              />
            </View>
            <Text
              style={{
                fontSize: hp(1.6),
                color: theme.colors.bondedPurple,
                fontFamily: theme.typography.fontFamily.body,
                fontWeight: '600',
              }}
            >
              Create organization
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Items */}
        <View
          style={{
            paddingVertical: hp(2),
            paddingHorizontal: wp(4),
          }}
        >
          <DrawerItem
            icon="home-outline"
            label="Home"
            onPress={() => onNavigate('/forum')}
          />
          {/* My Network disabled in V1 (friends-only yearbook in V2). */}
          <DrawerItem
            icon="chatbubbles-outline"
            label="Messaging"
            onPress={() => onNavigate('/messages')}
          />
          <DrawerItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => onNavigate('/notifications')}
          />
          <DrawerItem
            icon="calendar-outline"
            label="Calendar"
            onPress={() => onNavigate('/calendar')}
          />
          {isFeatureEnabled('RATE_MY_PROFESSOR') && (
            <DrawerItem
              icon="school-outline"
              label="Rate My Professor"
              onPress={() => onNavigate('/rate-professor')}
            />
          )}
          <DrawerItem
            icon="people-circle-outline"
            label="Clubs & Organizations"
            onPress={() => onNavigate('/clubs')}
          />

          {isFeatureEnabled('LINK_AI') && (
            <DrawerItem
              icon="sparkles"
              label="Link AI"
              onPress={() => onNavigate('/link-ai')}
            />
          )}
        </View>

        {/* Settings */}
        <View
          style={{
            paddingTop: hp(2),
            paddingHorizontal: wp(4),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onNavigate('/settings')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: hp(1.5),
            }}
          >
            <Ionicons
              name="settings-outline"
              size={hp(2.2)}
              color={theme.colors.textSecondary}
              style={{ marginRight: wp(3) }}
            />
            <Text
              style={{
                fontSize: hp(1.8),
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.body,
                fontWeight: '500',
              }}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView >
    </Pressable >
  )
}

const RootLayout = () => {
  const router = useRouter()
  const pathname = usePathname() // Get current route
  const drawerRef = useRef<DrawerLayout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const { user, isAuthenticated, setUser, setSession, logout } = useAuthStore()
  const { setUserId: setOnboardingUserId, clearUserId: clearOnboardingUserId } = useOnboardingStore()
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const initialCheckCompleteRef = useRef(false)

  // Routes where drawer should be DISABLED (auth, onboarding, welcome)
  const drawerDisabledRoutes = [
    '/',
    '/index',
    '/welcome',
    '/login',
    '/otp',
    '/onboarding',
    '/auth/callback',
  ]

  // Check if current route should have drawer disabled
  const isDrawerDisabledRoute = drawerDisabledRoutes.some(route => pathname === route || pathname?.startsWith('/auth'))

  // Check Supabase session on app startup and sync with authStore
  // This ensures we don't use stale persisted auth state
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if a valid session exists FIRST before any auth changes
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Error checking session:', error)
          // Clear auth state if there's an error
          await logout()
          await supabase.auth.signOut()
          setIsCheckingSession(false)
          initialCheckCompleteRef.current = true
          return
        }

        if (session?.user) {
          // Valid session exists - sync with authStore
          console.log('✅ Valid session found, syncing auth state')
          setUser(session.user)
          setSession(session)
          // Sync onboarding store with user ID
          setOnboardingUserId(session.user.id)
        } else {
          // No valid session - clear auth state IMMEDIATELY
          console.log('ℹ️ No valid session found, clearing auth state')
          await logout()
          clearOnboardingUserId()
          // Avoid signOut when there's no active session to prevent extra auth churn
        }
      } catch (error) {
        console.error('❌ Error in checkSession:', error)
        await logout()
        // Avoid signOut here; we already cleared local auth state
      } finally {
        setIsCheckingSession(false)
        // Mark initial check as complete IMMEDIATELY (no delay)
        // This prevents race condition where listener fires before flag is set
        initialCheckCompleteRef.current = true
      }
    }

    checkSession()

    // Listen for auth state changes from Supabase
    // IMPORTANT: Only update auth state if we've completed the initial session check
    // This prevents race conditions where the listener fires before we've cleared stale state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email, 'initialCheckComplete:', initialCheckCompleteRef.current)

      // Don't process auth changes until initial check is complete
      if (!initialCheckCompleteRef.current) {
        console.log('⏳ Skipping auth state change - initial check not complete')
        return
      }

      if (session?.user) {
        setUser(session.user)
        setSession(session)
        // Sync onboarding store with user ID
        setOnboardingUserId(session.user.id)
      } else {
        // User signed out or session expired
        // Note: logout() is async but we can't await in this callback
        // The async operation will complete in the background
        logout().catch(err => console.error('Error in logout:', err))
        clearOnboardingUserId()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setSession, logout, setOnboardingUserId, clearOnboardingUserId])

  useEffect(() => {
    const preloadResources = async () => {
      try {
        // Preload all background images used across the app
        const backgroundImages = [
          require('../assets/images/bonded-gradient.jpg'),
          require('../assets/images/bonded-gradient2.jpg'),
        ]

        // Preload all background images in parallel
        const preloadPromises = backgroundImages.map(async (image) => {
          try {
            const imageUri = Image.resolveAssetSource(image).uri
            await Image.prefetch(imageUri)
            console.log('✅ Preloaded background image:', imageUri)
            return true
          } catch (error) {
            console.warn('⚠️ Failed to preload image:', error)
            return false
          }
        })

        // Wait for all images to preload
        await Promise.all(preloadPromises)

        // Also preload the logo used in loading animation
        const logoImage = require('../assets/images/transparent-bonded.png')
        const logoUri = Image.resolveAssetSource(logoImage).uri
        await Image.prefetch(logoUri)

        // Give time for other resources to load
        await new Promise((resolve) => setTimeout(resolve, 500)) // Minimum loading time
      } catch (error) {
        console.log('Error preloading resources:', error)
        // Continue even if preload fails
      } finally {
        // Start fade out animation, then hide after fade completes
        setTimeout(() => {
          // Trigger fade out
          setIsLoading(false)
        }, 1500) // Start fade after 1.5 seconds
      }
    }

    preloadResources()
  }, [])

  const navigateAndClose = (path: string) => {
    router.push(path as never)
    // Only close drawer if authenticated and drawer exists
    if (isAuthenticated && user && drawerRef.current) {
      drawerRef.current.closeDrawer()
    }
  }

  // Show loading screen while resources load OR while checking session
  if (!showContent || isCheckingSession) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <Loading
            size={80}
            duration={1200}
            style={{ flex: 1 }}
            fadeOut={!isLoading && !isCheckingSession}
            onFadeComplete={() => {
              if (!isCheckingSession) {
                setShowContent(true)
              }
            }}
          />
        </ThemeProvider>
      </GestureHandlerRootView>
    )
  }

  // If user is NOT authenticated, render only the Stack (no providers, no drawer)
  // This prevents all data fetching hooks from running on login/welcome screens
  // IMPORTANT: No DrawerLayout at all when not authenticated - like LinkedIn/Instagram
  // The drawer should be completely inaccessible (no swipe, no gestures, no component)

  // CRITICAL: Check BOTH authStore state AND ensure session check is complete
  // Also verify user object actually exists (not just truthy check)
  // AND check if current route allows drawer
  const hasValidUser = user && user.id && user.email
  const shouldShowDrawer = isAuthenticated && hasValidUser && !isCheckingSession && !isDrawerDisabledRoute

  // CRITICAL: Never render DrawerLayout when not authenticated
  // This prevents any drawer gestures from working
  if (!shouldShowDrawer) {
    // Ensure drawer ref is null when not authenticated
    drawerRef.current = null

    // Debug logging
    if (__DEV__) {
      console.log('🚫 Drawer disabled - isAuthenticated:', isAuthenticated, 'hasValidUser:', hasValidUser, 'isCheckingSession:', isCheckingSession, 'isDrawerDisabledRoute:', isDrawerDisabledRoute, 'pathname:', pathname, 'user:', user)
    }

    // NO DrawerLayout rendered - drawer is completely inaccessible
    // Using a plain View wrapper instead of GestureHandlerRootView to prevent any gesture handling
    return (
      <View style={{ flex: 1 }}>
        <ThemeProvider>
          <QueryProvider>
            <ProfileModalProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: false,
                  animation: 'none',
                }}
              />
              <ProfileModal />
            </ProfileModalProvider>
          </QueryProvider>
        </ThemeProvider>
      </View>
    )
  }

  // Debug logging when drawer should be shown
  if (__DEV__) {
    console.log('✅ Drawer enabled - isAuthenticated:', isAuthenticated, 'hasValidUser:', hasValidUser, 'isCheckingSession:', isCheckingSession, 'isDrawerDisabledRoute:', isDrawerDisabledRoute, 'pathname:', pathname)
  }

  // User is authenticated - render full app with providers and drawer
  // DrawerLayout is ONLY rendered when authenticated AND session check is complete
  // Double-check authentication before rendering drawer
  if (!isAuthenticated || !user) {
    // Fallback safety check - should never reach here, but just in case
    return (
      <View style={{ flex: 1 }}>
        <ThemeProvider>
          <QueryProvider>
            <ProfileModalProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: false,
                  animation: 'none',
                }}
              />
              <ProfileModal />
            </ProfileModalProvider>
          </QueryProvider>
        </ThemeProvider>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryProvider>
          <EventsPrefetcher />
          <StoriesProvider>
            <EventsProvider>
              <ClubsProvider>
                <UnifiedForumProvider>
                  <MessagesProvider>
                    <OrgModalProvider>
                      <ProfileModalProvider>
                        <DrawerLayout
                        ref={drawerRef}
                        drawerWidth={SCREEN_WIDTH * 0.75}
                        drawerPosition="left"
                        drawerType="front"
                        edgeWidth={SCREEN_WIDTH * 0.4}
                        drawerLockMode="unlocked"
                        renderNavigationView={() => <DrawerContent onNavigate={navigateAndClose} />}
                      >
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            gestureEnabled: false,
                            animation: 'none',
                          }}
                        />
                      </DrawerLayout>
                        {/* Global components */}
                        <OnboardingNudge />
                        <OrgModal />
                        <ProfileModal />
                      </ProfileModalProvider>
                    </OrgModalProvider>
                  </MessagesProvider>
                </UnifiedForumProvider>
              </ClubsProvider>
            </EventsProvider>
          </StoriesProvider>
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

export default RootLayout
