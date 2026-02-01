import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useAppTheme } from '../theme'

const ThemedView = ({ children, style, variant = 'background', ...rest }) => {
  const theme = useAppTheme()
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'surface':
        return theme.colors.surface
      case 'card':
        return theme.colors.card
      case 'backgroundSecondary':
        return theme.colors.backgroundSecondary
      case 'backgroundTertiary':
        return theme.colors.backgroundTertiary
      case 'background':
      default:
        return theme.colors.background
    }
  }

  return (
    <View style={[styles.base, { backgroundColor: getBackgroundColor() }, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
})

export default ThemedView

