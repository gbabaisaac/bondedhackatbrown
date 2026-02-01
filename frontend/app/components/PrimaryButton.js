import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppTheme } from '../theme'

const PrimaryButton = ({ label, onPress, disabled, style, textStyle }) => {
  const theme = useAppTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[disabled && { opacity: 0.6 }, style]}
    >
      <LinearGradient
        colors={[theme.colors.accent, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text
          style={[
            styles.label,
            { color: '#FFFFFF', fontFamily: theme.typography.fontFamily.heading },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
})

export default PrimaryButton

