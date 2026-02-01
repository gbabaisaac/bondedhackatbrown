import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import { getForumTagColors } from '../../helpers/themeHelpers'

// Helper function to get tag color
const getTagColor = (tag, theme) => {
  return getForumTagColors(tag, theme)
}

export default function PostTags({ tags = [], maxDisplay = 2 }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  
  if (!tags || tags.length === 0) return null

  const displayTags = tags.slice(0, maxDisplay)
  const remainingCount = tags.length - maxDisplay

  return (
    <View style={styles.container}>
      {displayTags.map((tag, index) => {
        const tagColor = getTagColor(tag, theme)
        return (
          <View 
            key={index} 
            style={[
              styles.tag,
              { 
                backgroundColor: tagColor.bg + 'E6', // Softer background (90% opacity)
                borderColor: tagColor.border + '30', // More transparent border
              }
            ]}
          >
            <Text style={[styles.tagText, { color: tagColor.text }]}>
              {tag}
            </Text>
          </View>
        )
      })}
      {remainingCount > 0 && (
        <View style={styles.moreTag}>
          <Text style={styles.moreTagText}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1),
    marginTop: hp(0.3),
  },
  tag: {
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.25),
    borderRadius: theme.radius.pill,
    borderWidth: 0.5,
    opacity: 0.8,
  },
  tagText: {
    fontSize: hp(1.05),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
  },
  moreTag: {
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.25),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.textPrimary + '15',
    borderWidth: 0,
  },
  moreTagText: {
    fontSize: hp(1.05),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    opacity: 0.7,
  },
})

