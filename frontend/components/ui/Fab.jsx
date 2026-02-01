import React from 'react'
import { Pressable, View } from 'react-native'
import { useAppTheme } from '../../app/theme'

export default function Fab({ icon, onPress, style }) {
  const theme = useAppTheme()
  const fab = theme.ui?.fab || { size: 56, radius: 28 }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: fab.size,
          height: fab.size,
          borderRadius: fab.radius,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 5,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View pointerEvents="none">{icon}</View>
    </Pressable>
  )
}

