import React from 'react'
import { Text } from 'react-native'
import { useAppTheme } from '../theme'

const ThemedText = ({ children, style, variant = 'primary', ...rest }) => {
  const theme = useAppTheme()
  
  const getColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.textSecondary
      case 'tertiary':
        return theme.colors.textTertiary
      case 'accent':
        return theme.colors.accent
      case 'error':
        return theme.colors.error
      case 'success':
        return theme.colors.success
      case 'warning':
        return theme.colors.warning
      case 'info':
        return theme.colors.info
      case 'primary':
      default:
        return theme.colors.textPrimary
    }
  }

  return (
    <Text style={[{ color: getColor(), fontFamily: theme.typography.fontFamily.body }, style]} {...rest}>
      {children}
    </Text>
  )
}

export default ThemedText

