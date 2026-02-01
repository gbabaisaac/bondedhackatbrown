import React from 'react'
import { View, Pressable, Text as RNText } from 'react-native'
import { useAppTheme } from '../../app/theme'

export default function SegmentedControl({ options = [], value, onChange, style }) {
  const theme = useAppTheme()
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.radius.lg,
          padding: 4,
          gap: 4,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange?.(opt.value)}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 10,
                borderRadius: theme.radius.md,
                backgroundColor: selected
                  ? theme.colors.accent
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <RNText
              style={{
                color: selected ? theme.colors.white : theme.colors.textSecondary,
                fontSize: theme.typography.sizes.sm,
                fontWeight: '600',
              }}
            >
              {opt.label}
            </RNText>
          </Pressable>
        )
      })}
    </View>
  )
}

