import React from 'react'
import { View } from 'react-native'
import { useAppTheme } from '../../app/theme'

export default function Card({ variant = 'default', style, children, ...rest }) {
  const theme = useAppTheme()
  const variants = theme.cardVariants || {}
  const base = variants[variant] || variants.default || {}
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  )
}

