import { TextInput, View, Text, StyleSheet, Platform } from 'react-native'
import React, { useState } from 'react'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'

const Input = ({
  value,
  onChangeText,
  placeholder = '',
  label,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  containerStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        !editable && styles.inputContainerDisabled,
      ]}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary + '80'} // 50% opacity
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {rightIcon && (
          <View style={styles.rightIconContainer}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  )
}

export default Input

const createStyles = (theme) => StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: hp(2),
  },
  label: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
    fontFamily: theme.typography.fontFamily.heading,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingHorizontal: wp(5),
    paddingVertical: Platform.OS === 'ios' ? hp(1.8) : hp(1.5),
    minHeight: hp(6),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: theme.colors.bondedPurple,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.bondedPurple,
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    padding: 0, // Remove default padding
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
      android: {
        paddingVertical: 0,
        textAlignVertical: 'center',
      },
    }),
  },
  inputWithLeftIcon: {
    marginLeft: wp(2),
  },
  inputWithRightIcon: {
    marginRight: wp(2),
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: hp(12),
    paddingTop: hp(1),
  },
  leftIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2),
  },
  errorText: {
    fontSize: hp(1.6),
    color: theme.colors.error,
    marginTop: hp(0.5),
    fontFamily: theme.typography.fontFamily.body,
  },
})

