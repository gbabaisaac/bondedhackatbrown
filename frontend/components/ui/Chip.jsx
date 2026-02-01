import React from 'react'
import { Pressable, Text as RNText } from 'react-native'
import { useAppTheme } from '../../app/theme'

export default function Chip({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
}) {
  const theme = useAppTheme()
  const chip = theme.ui?.chip || { height: 34, paddingHorizontal: 12, radius: 999, textSize: 13 }
  const bg = selected ? theme.colors.backgroundSecondary : 'rgba(255,255,255,0.08)'
  const border = selected ? theme.colors.accent : 'rgba(255,255,255,0.15)'
  const color = selected ? theme.colors.accent : theme.colors.textPrimary

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: chip.height,
          paddingHorizontal: chip.paddingHorizontal,
          borderRadius: chip.radius,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <RNText
        style={[
          {
            fontSize: chip.textSize,
            color,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {label}
      </RNText>
    </Pressable>
  )
}

