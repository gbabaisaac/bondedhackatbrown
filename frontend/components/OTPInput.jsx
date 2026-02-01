import React, { useRef, useState } from 'react'
import { Platform, StyleSheet, TextInput, View } from 'react-native'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'

const OTPInput = ({ length = 6, onComplete, value, onChangeText }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const inputRefs = useRef([])
  const [codes, setCodes] = useState(Array(length).fill(''))

  // Sync with parent value prop
  React.useEffect(() => {
    if (value !== undefined) {
      const valueArray = value.split('').slice(0, length)
      const paddedArray = [...valueArray, ...Array(length - valueArray.length).fill('')]
      setCodes(paddedArray)
    }
  }, [value, length])

  const handleChange = (text, index) => {
    // Only allow single digit
    if (text.length > 1) return

    const newCodes = [...codes]
    newCodes[index] = text
    setCodes(newCodes)

    // Update parent if onChangeText provided
    if (onChangeText) {
      onChangeText(newCodes.join(''))
    }

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if all filled
    if (newCodes.every(code => code !== '') && onComplete) {
      onComplete(newCodes.join(''))
    }
  }

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <View style={styles.container}>
      {codes.map((code, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.input,
            code && styles.inputFilled,
          ]}
          value={code}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          textAlign="center"
        />
      ))}
    </View>
  )
}

export default OTPInput

const createStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(3),
    marginVertical: hp(3),
  },
  input: {
    width: wp(15),
    height: wp(15),
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    fontSize: hp(3),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputFilled: {
    borderColor: theme.colors.bondedPurple,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.bondedPurple,
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
})

