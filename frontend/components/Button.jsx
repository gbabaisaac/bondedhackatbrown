import { Pressable, StyleSheet, Text } from 'react-native'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'

const Button = ({
    buttonStyle,
    textStyle,
    title = '',
    onPress = () => {},
    loading = false,
    hasShadow = true,
    disabled = false,
    theme: customTheme, // Optional theme override (for onboarding) - when provided, completely bypasses app theme
}) => {
  // Always call hook (React rules), but ignore if customTheme provided
  const appTheme = useAppTheme()
  const theme = customTheme || appTheme // Use custom theme if provided, otherwise use app theme

  // Debug: Log when using custom theme (remove after testing)
  if (customTheme && __DEV__) {
    console.log('Button using ONBOARDING_THEME:', {
      backgroundColor: theme.colors.bondedPurple,
      textColor: theme.colors.white
    })
  }

  const styles = createStyles(theme)

  // Handle shadows - use custom theme shadows first, then app theme, then empty
  const shadowStyle = hasShadow ? (theme.shadows?.md || (!customTheme && appTheme?.shadows?.md) || {}) : {}

  // Handle press with disabled check
  const handlePress = () => {
    if (!disabled && !loading) {
      onPress()
    }
  }

  // buttonStyle comes last to ensure it overrides default styles
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.button, shadowStyle, buttonStyle]}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  )
}

export default Button

const createStyles = (theme) => StyleSheet.create({
    button: {
        backgroundColor: theme.colors.bondedPurple,
        paddingVertical: hp(2),
        paddingHorizontal: wp(6),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: theme.colors.white,
        fontSize: hp(2),
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily.heading,
    },
})