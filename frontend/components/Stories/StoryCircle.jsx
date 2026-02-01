import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet, Image, Platform, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

export default function StoryCircle({ story, onPress, isOwn = false }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const hasUnviewed = story.hasUnviewed

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.75} onPress={onPress}>
      {hasUnviewed ? (
        // Gradient border for unviewed stories - neutral gradient
        <LinearGradient
          colors={theme.mode === 'dark' 
            ? ['#4A5568', '#2D3748', '#1A202C']
            : ['#CBD5E0', '#A0AEC0', '#718096']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.innerCircle}>
            {story.thumbnail ? (
              <Image source={{ uri: story.thumbnail }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  {story.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      ) : (
        // Gray border for viewed stories
        <View style={[styles.gradientBorder, styles.viewedBorder]}>
          <View style={styles.innerCircle}>
            {story.thumbnail ? (
              <Image source={{ uri: story.thumbnail }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  {story.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {isOwn && (
        <View style={styles.ownBadge}>
          <Ionicons name="person" size={hp(1.2)} color={theme.colors.white} />
        </View>
      )}

      <Text numberOfLines={1} style={styles.label}>
        {isOwn ? 'Your Story' : story.name || 'User'}
      </Text>
    </TouchableOpacity>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: theme.spacing.xs,
  },
  gradientBorder: {
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    padding: 3,
    marginBottom: hp(0.6),
    ...Platform.select({
      ios: {
        shadowColor: theme.mode === 'dark' ? '#000' : '#718096',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewedBorder: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: hp(2.8),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  ownBadge: {
    position: 'absolute',
    top: hp(5.2),
    right: wp(-1),
    width: hp(2.2),
    height: hp(2.2),
    borderRadius: hp(1.1),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  label: {
    fontSize: hp(1.4),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: wp(18),
  },
})
