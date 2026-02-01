import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { hp, wp } from '../helpers/common'

const SectionHeader = ({ title, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

export default SectionHeader

const styles = StyleSheet.create({
  container: {
    marginTop: hp(2),
    marginBottom: hp(1),
    paddingHorizontal: wp(4),
  },
  title: {
    fontSize: hp(1.5),
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

