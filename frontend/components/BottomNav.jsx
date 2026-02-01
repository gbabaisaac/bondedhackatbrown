import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native'
import React, { useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import ThemedText from '../app/components/ThemedText'
import { useConversations } from '../hooks/useMessages'
import { useMessageRequests } from '../hooks/useMessageRequests'

const BottomNav = ({ scrollY = null }) => {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const { data: conversations = [] } = useConversations()
  const { data: messageRequests = [] } = useMessageRequests()
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0) + messageRequests.length
  const unreadLabel = totalUnread > 99 ? '99+' : String(totalUnread)
  
  // Animation for hiding/showing nav on scroll
  const navTranslateY = useRef(new Animated.Value(0)).current
  const lastScrollY = useRef(0)
  const isAnimating = useRef(false)
  
  // Handle scroll-based hide/show
  useEffect(() => {
    if (!scrollY) return
    
    const listenerId = scrollY.addListener(({ value }) => {
      const currentScrollY = value
      const scrollDifference = currentScrollY - lastScrollY.current
      
      // Prevent multiple animations from running
      if (isAnimating.current) {
        lastScrollY.current = currentScrollY
        return
      }
      
      // Ignore small scrolls
      if (Math.abs(scrollDifference) < 3) {
        return
      }
      
      // Always show nav when at the top
      if (currentScrollY <= 0) {
        isAnimating.current = true
        Animated.timing(navTranslateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          isAnimating.current = false
        })
        lastScrollY.current = currentScrollY
        return
      }
      
      // Hide nav when scrolling down, show when scrolling up
      isAnimating.current = true
      const toValue = scrollDifference > 0 ? 100 : 0 // Hide by moving down 100px
      
      Animated.timing(navTranslateY, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false
      })
      
      lastScrollY.current = currentScrollY
    })
    
    return () => {
      if (scrollY) {
        scrollY.removeListener(listenerId)
      }
    }
  }, [scrollY])

  const tabs = [
    {
      id: 'yearbook',
      label: 'Yearbook',
      icon: 'book-outline',
      activeIcon: 'book',
      route: '/yearbook',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'chatbubbles-outline',
      activeIcon: 'chatbubbles',
      route: '/messages',
    },
    {
      id: 'events',
      label: 'Events',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      route: '/events',
    },
    {
      id: 'forum',
      label: 'Forum',
      icon: 'chatbox-ellipses-outline',
      activeIcon: 'chatbox-ellipses',
      route: '/forum',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: 'time-outline',
      activeIcon: 'time',
      route: '/calendar',
    },
  ]

  const handleTabPress = (tab) => {
    router.push(tab.route)
  }

  const isActive = (route) => {
    if (route === '/yearbook') {
      return pathname === '/yearbook' || pathname === '/home' || pathname === '/'
    }
    if (route === '/events') {
      return pathname === '/events' || pathname?.startsWith('/events/')
    }
    return pathname === route || pathname?.startsWith(route + '/')
  }

  const styles = createStyles(theme)

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, hp(2)),
          transform: [{ translateY: navTranslateY }],
        },
      ]}
    >
      <View style={styles.navPill}>
        {tabs.map((tab) => {
          const active = isActive(tab.route)
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={active ? tab.activeIcon : tab.icon}
                  size={active ? hp(2.5) : hp(2.2)}
                  color={active ? theme.colors.accent : theme.colors.textSecondary}
                  style={{ strokeWidth: active ? 1.5 : 1 }}
                />
                {tab.id === 'messages' && totalUnread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadLabel}</Text>
                  </View>
                )}
              </View>
              <ThemedText
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </ThemedText>
              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </Animated.View>
  )
}

export default BottomNav

const createStyles = (theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    backgroundColor: 'transparent',
  },
  navPill: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    width: '100%',
    maxWidth: wp(90),
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(1),
    borderRadius: theme.radius.md,
    gap: hp(0.2),
    position: 'relative',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -hp(0.6),
    right: -hp(1),
    minWidth: hp(1.8),
    height: hp(1.8),
    paddingHorizontal: hp(0.4),
    borderRadius: hp(0.9),
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: hp(1.05),
    color: theme.colors.white,
    fontWeight: '700',
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: hp(1.1),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '400',
    marginTop: hp(0.1),
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: theme.colors.accent,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: hp(-0.4),
    width: wp(2.5),
    height: hp(0.3),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
  },
})
