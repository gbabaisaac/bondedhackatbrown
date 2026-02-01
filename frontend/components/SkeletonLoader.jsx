import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'

/**
 * Animated shimmer effect for skeleton loading
 */
const SkeletonShimmer = ({ style, children }) => {
  const theme = useAppTheme()
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
    shimmer.start()
    return () => shimmer.stop()
  }, [shimmerAnim])

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.colors.backgroundSecondary,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * Profile card skeleton for yearbook grid
 */
export const ProfileCardSkeleton = ({ cardWidth }) => {
  const theme = useAppTheme()
  const styles = createProfileCardStyles(theme, cardWidth)

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        {/* Image placeholder */}
        <SkeletonShimmer style={styles.imagePlaceholder} />
        {/* Info section */}
        <View style={styles.infoSection}>
          {/* Quote placeholder */}
          <SkeletonShimmer style={styles.quoteLine1} />
          <SkeletonShimmer style={styles.quoteLine2} />
          {/* Major badge placeholder */}
          <SkeletonShimmer style={styles.badgePlaceholder} />
        </View>
      </View>
    </View>
  )
}

/**
 * Grid of profile card skeletons for yearbook
 */
export const YearbookSkeleton = ({ numCards = 9, numColumns = 3 }) => {
  const theme = useAppTheme()
  const gap = theme.spacing.sm
  const padding = theme.spacing.sm
  const cardWidth = (wp(100) - (padding * 2) - (gap * (numColumns - 1))) / numColumns

  const rows = []
  for (let i = 0; i < numCards; i += numColumns) {
    const rowCards = []
    for (let j = 0; j < numColumns && i + j < numCards; j++) {
      rowCards.push(
        <ProfileCardSkeleton key={i + j} cardWidth={cardWidth} />
      )
    }
    rows.push(
      <View key={`row-${i}`} style={{ flexDirection: 'row', gap, marginBottom: gap }}>
        {rowCards}
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: padding, paddingTop: hp(24), paddingBottom: hp(10) }}>
      {rows}
    </View>
  )
}

/**
 * Forum post skeleton
 */
export const ForumPostSkeleton = () => {
  const theme = useAppTheme()
  const styles = createForumPostStyles(theme)

  return (
    <View style={styles.postContainer}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <SkeletonShimmer style={styles.avatar} />
        <View style={styles.authorInfo}>
          <SkeletonShimmer style={styles.authorName} />
          <SkeletonShimmer style={styles.timestamp} />
        </View>
      </View>
      {/* Content */}
      <SkeletonShimmer style={styles.contentLine1} />
      <SkeletonShimmer style={styles.contentLine2} />
      <SkeletonShimmer style={styles.contentLine3} />
      {/* Actions row */}
      <View style={styles.actionsRow}>
        <SkeletonShimmer style={styles.actionButton} />
        <SkeletonShimmer style={styles.actionButton} />
        <SkeletonShimmer style={styles.actionButton} />
      </View>
    </View>
  )
}

/**
 * Forum feed skeleton
 */
export const ForumFeedSkeleton = ({ numPosts = 5 }) => {
  const theme = useAppTheme()

  return (
    <View style={{ paddingHorizontal: wp(4), paddingTop: hp(2) }}>
      {Array.from({ length: numPosts }).map((_, i) => (
        <ForumPostSkeleton key={i} />
      ))}
    </View>
  )
}

/**
 * Generic text line skeleton
 */
export const TextSkeleton = ({ width = '100%', height = hp(1.5), style }) => {
  return (
    <SkeletonShimmer
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    />
  )
}

/**
 * Generic circle skeleton (for avatars)
 */
export const CircleSkeleton = ({ size = hp(5), style }) => {
  return (
    <SkeletonShimmer
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  )
}

/**
 * Generic box skeleton
 */
export const BoxSkeleton = ({ width = '100%', height = hp(10), radius = 8, style }) => {
  return (
    <SkeletonShimmer
      style={[
        {
          width,
          height,
          borderRadius: radius,
        },
        style,
      ]}
    />
  )
}

const createProfileCardStyles = (theme, cardWidth) => StyleSheet.create({
  cardWrapper: {
    width: cardWidth,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
  },
  infoSection: {
    padding: theme.spacing.md,
  },
  quoteLine1: {
    height: hp(1.2),
    width: '100%',
    borderRadius: hp(0.6),
    marginBottom: hp(0.5),
  },
  quoteLine2: {
    height: hp(1.2),
    width: '70%',
    borderRadius: hp(0.6),
    marginBottom: hp(1),
  },
  badgePlaceholder: {
    height: hp(2),
    width: '50%',
    borderRadius: theme.radius.sm,
  },
})

const createForumPostStyles = (theme) => StyleSheet.create({
  postContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  avatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    marginRight: wp(3),
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    height: hp(1.6),
    width: '40%',
    borderRadius: hp(0.8),
    marginBottom: hp(0.5),
  },
  timestamp: {
    height: hp(1.2),
    width: '25%',
    borderRadius: hp(0.6),
  },
  contentLine1: {
    height: hp(1.6),
    width: '100%',
    borderRadius: hp(0.8),
    marginBottom: hp(0.8),
  },
  contentLine2: {
    height: hp(1.6),
    width: '90%',
    borderRadius: hp(0.8),
    marginBottom: hp(0.8),
  },
  contentLine3: {
    height: hp(1.6),
    width: '60%',
    borderRadius: hp(0.8),
    marginBottom: hp(2),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: wp(4),
    marginTop: hp(1),
  },
  actionButton: {
    height: hp(3),
    width: hp(7),
    borderRadius: theme.radius.md,
  },
})

export default SkeletonShimmer
