import { TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'

const BackButton = ({ onPress, style, visible = true, theme: customTheme }) => {
  // Always call hook (React rules), but ignore if customTheme provided
  const appTheme = useAppTheme()
  const theme = customTheme || appTheme // Use custom theme if provided, otherwise use app theme
  const styles = createStyles(theme)
  const { top } = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current
  
  // Position below notch: safe area top + small offset
  // If top > 8 (has notch), use top + 8, otherwise use 12
  const topPosition = top > 8 ? top + 8 : 12

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [visible, opacity])

  if (!visible && opacity._value === 0) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.backButton,
        { top: topPosition, opacity },
        style
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.buttonTouchable}
      >
        <Ionicons 
          name="chevron-back" 
          size={hp(3)} 
          color={theme.colors.textPrimary} 
        />
      </TouchableOpacity>
    </Animated.View>
  )
}

export default BackButton

const createStyles = (theme) => StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: wp(4),
    width: hp(5.5),
    height: hp(5.5),
    zIndex: 1000, // High z-index to ensure it's always on top
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
})

