import { Ionicons } from '@expo/vector-icons'
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../app/theme'
import { useUnifiedForum } from '../contexts/UnifiedForumContext'
import { hp, wp } from '../helpers/common'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'

const ForumSwitcher = ({ currentForum, onPress, unreadCount = 0 }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const { forums } = useUnifiedForum()
  const { data: currentUserProfile } = useCurrentUserProfile()

  // Use currentForum from props or fallback to unified context
  const forum = currentForum || forums[0]
  const universityName = currentUserProfile?.university?.name || currentUserProfile?.university || 'University'
  const isCampusForum = forum?.type === 'main' || forum?.type === 'campus'
  const forumDisplayName = isCampusForum
    ? `${universityName} Forum`
    : (forum?.name || 'Forum')
  const getForumIcon = (type) => {
    switch (type) {
      case 'main':
      case 'campus':
        return 'globe-outline' // Changed to globe/earth as requested
      case 'class':
        return 'school-outline'
      case 'org':
        return 'people-outline'
      case 'private':
        return 'lock-closed-outline'
      default:
        return 'chatbubbles-outline'
    }
  }

  const getForumColor = (type) => {
    switch (type) {
      case 'main':
      case 'campus':
        return theme.colors.bondedPurple
      case 'class':
        return '#4ECDC4'
      case 'org':
        return '#FF6B6B'
      case 'private':
        return '#95E1D3'
      default:
        return theme.colors.bondedPurple
    }
  }
  const hasMemberCount = forum?.memberCount !== undefined && forum?.memberCount !== null

  return (
    <TouchableOpacity
      style={styles.switcher}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: forum?.image ? 'transparent' : getForumColor(forum?.type || 'main') + '15' }]}>
        {forum?.image ? (
          <Image
            source={{ uri: forum.image }}
            style={styles.forumIconImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={getForumIcon(forum?.type || 'main')}
            size={hp(1.8)}
            color={getForumColor(forum?.type || 'main')}
          />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.forumName} numberOfLines={1}>
          {forumDisplayName}
        </Text>
        {hasMemberCount ? (
          <Text style={styles.memberCount}>
            {forum.memberCount} members
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-down"
        size={hp(1.6)}
        color={theme.colors.textSecondary}
        style={styles.chevron}
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default ForumSwitcher

const createStyles = (theme) => StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: wp(40),
    maxWidth: wp(75),
    flexShrink: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconContainer: {
    width: hp(3.5),
    height: hp(3.5),
    borderRadius: hp(1.75),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
    overflow: 'hidden', // Added for image
  },
  forumIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: hp(1.75),
  },
  textContainer: {
    flex: 1,
    marginRight: wp(1),
    minWidth: 0, // Allow text to shrink below content size
  },
  forumName: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  memberCount: {
    fontSize: hp(1.1),
    color: theme.colors.textSecondary,
    marginTop: hp(0.1),
  },
  chevron: {
    marginLeft: wp(1),
  },
  badge: {
    position: 'absolute',
    top: -hp(0.5),
    right: -hp(0.5),
    backgroundColor: theme.colors.error,
    borderRadius: hp(1),
    minWidth: hp(1.8),
    height: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  badgeText: {
    fontSize: hp(1),
    fontWeight: '700',
    color: theme.colors.white,
  },
})
