import React from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'

const AppCard = ({ children, style, radius = 'lg', padding = true }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const radiusValue = radius === 'lg' ? hp(1.8) : hp(1.2)

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: radiusValue,
          padding: padding ? wp(4) : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export default AppCard

const createStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
})

