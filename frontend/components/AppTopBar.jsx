import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import ThemedText from '../app/components/ThemedText'
import { useNotificationCount } from '../hooks/useNotificationCount'

const AppTopBar = ({
  schoolName = 'Your University',
  onPressProfile,
  onPressSchool,
  onPressNotifications,
  showChevron = false,
  showBackButton = null, // null = auto-detect, true/false = override
}) => {
  const router = useRouter()
  const theme = useAppTheme()
  const { data: notificationCount = 0 } = useNotificationCount()
  
  // Auto-detect if we can go back, unless explicitly set
  const canGoBack = showBackButton !== null 
    ? showBackButton 
    : router.canGoBack()
  
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    }
  }

  const styles = createStyles(theme)
  const displayCount = notificationCount > 99 ? '99+' : `${notificationCount}`

  return (
    <View style={styles.topBar}>
      {/* Left: Back Button or Profile Button */}
      {canGoBack ? (
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.6}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={hp(2.4)}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.6}
          onPress={onPressProfile}
        >
          <Ionicons
            name="person-circle-outline"
            size={hp(2.8)}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      )}

      {/* Center: Bonded Logo */}
      <View style={styles.centerSection}>
        <View style={styles.bondedLogoContainer}>
          <Image
            source={require('../assets/images/transparent-bonded.png')}
            style={styles.bondedLogo}
            resizeMode="contain"
          />
          <ThemedText style={styles.bondedText}>Bonded</ThemedText>
        </View>
        {onPressSchool && showChevron && (
          <TouchableOpacity
            onPress={onPressSchool}
            style={styles.chevronButton}
            activeOpacity={0.6}
          >
            <Ionicons
              name="chevron-down"
              size={hp(1.5)}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Right: Notifications */}
      <View style={styles.iconButton}>
        {onPressNotifications && (
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.6}
            onPress={onPressNotifications}
          >
            <Ionicons
              name="notifications-outline"
              size={hp(2.4)}
              color={theme.colors.textPrimary}
            />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{displayCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default AppTopBar

const createStyles = (theme) => StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.background,
    height: hp(5.5),
  },
  iconButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  schoolName: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bondedLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  bondedLogo: {
    height: hp(2.5),
    width: hp(2.5),
  },
  bondedText: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chevronButton: {
    marginLeft: wp(1.5),
    padding: hp(0.2),
  },
  notificationDot: {
    position: 'absolute',
    top: hp(0.5),
    right: wp(0.8),
    width: hp(0.6),
    height: hp(0.6),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  notificationButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: hp(0.3),
    right: wp(0.6),
    minWidth: hp(1.8),
    height: hp(1.8),
    borderRadius: hp(0.9),
    paddingHorizontal: wp(0.6),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  notificationBadgeText: {
    fontSize: hp(1.1),
    color: theme.colors.white,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.body,
    includeFontPadding: false,
  },
})
