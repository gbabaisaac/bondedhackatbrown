import React from 'react'
import { Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'

const PrimaryButton = ({
  label,
  onPress,
  icon,
  iconPosition = 'left',
  disabled = false,
  style,
  textStyle,
}) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.button, style, disabled && styles.buttonDisabled]}
    >
      <LinearGradient
        colors={[theme.colors.bondedPurple, '#8B0000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={hp(2)}
            color={theme.colors.white}
            style={{ marginRight: wp(2) }}
          />
        )}
        <Text style={[styles.label, textStyle]}>{label}</Text>
        {icon && iconPosition === 'right' && (
          <Ionicons
            name={icon}
            size={hp(2)}
            color={theme.colors.white}
            style={{ marginLeft: wp(2) }}
          />
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default PrimaryButton

const createStyles = (theme) => StyleSheet.create({
  button: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradient: {
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.white,
  },
})

