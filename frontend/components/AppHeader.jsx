import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import ThemedText from '../app/components/ThemedText'

const AppHeader = ({
  title,
  rightAction,
  rightActionLabel,
  showBack = true,
  onBack,
  backgroundColor,
}) => {
  const router = useRouter()
  const theme = useAppTheme()
  const bgColor = backgroundColor || theme.colors.background

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (router.canGoBack()) {
      router.back()
    }
  }

  const styles = createStyles(theme)

  return (
    <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: theme.colors.border }]}>
      {showBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={hp(2.2)} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      )}
      
      {!showBack && <View style={styles.backButton} />}
      
      {title && (
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
      )}
      
      {rightAction ? (
        <TouchableOpacity
          style={styles.rightAction}
          onPress={rightAction}
          activeOpacity={0.6}
        >
          {rightActionLabel && (
            <ThemedText style={styles.rightActionText}>{rightActionLabel}</ThemedText>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.rightAction} />
      )}
    </View>
  )
}

export default AppHeader

const createStyles = (theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    height: hp(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  title: {
    fontSize: hp(2.4),
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rightAction: {
    minWidth: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  rightActionText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.accent,
  },
})

