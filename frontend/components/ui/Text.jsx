import React from 'react'
import { Text as RNText } from 'react-native'
import { useAppTheme } from '../../app/theme'

const variantMap = (theme) => ({
  heading: theme.ui?.text?.heading,
  title: theme.ui?.text?.title,
  body: theme.ui?.text?.body,
  meta: theme.ui?.text?.meta,
})

export default function Text({ variant = 'body', style, children, ...rest }) {
  const theme = useAppTheme()
  const variants = variantMap(theme)
  const variantStyle = variants[variant] || variants.body
  return (
    <RNText
      style={[
        { fontFamily: theme.typography.fontFamily.body },
        variantStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  )
}

