import React from 'react'
import { Pressable, Text as RNText, ActivityIndicator } from 'react-native'
import { useAppTheme } from '../../app/theme'

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...rest
}) {
  const theme = useAppTheme()
  const variants = theme.buttonVariants || {}
  const base = variants[variant] || variants.primary || {}
  const disabledStyle = disabled ? { opacity: 0.5 } : {}
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        base,
        disabledStyle,
        pressed && { opacity: 0.9 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : (
        <RNText
          style={[
            {
              color: variant === 'secondary' ? theme.colors.textPrimary : theme.colors.white,
              fontWeight: '600',
              textAlign: 'center',
            },
            textStyle,
          ]}
        >
          {title}
        </RNText>
      )}
    </Pressable>
  )
}

