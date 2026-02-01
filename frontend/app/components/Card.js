import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useAppTheme } from '../theme'

const Card = ({ children, style, ...rest }) => {
  const theme = useAppTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.textPrimary,
        },
        theme.shadows.sm,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
})

export default Card

