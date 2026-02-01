import React from 'react'
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import StoryCircle from './StoryCircle'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import { useStoriesContext } from '../../contexts/StoriesContext'

export default function Stories({
  forumId,
  onCreateStory,
  onViewStory,
  showCreateButton = true,
  currentUserId,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const { getForumStories, hasViewedStory } = useStoriesContext()

  // Group stories by user
  const rawStories = getForumStories(forumId)
  const groupedStories = {}
  rawStories.forEach((story) => {
    if (!groupedStories[story.userId]) {
      groupedStories[story.userId] = {
        id: story.userId,
        userId: story.userId,
        name: story.userName,
        thumbnail: story.userAvatar,
        segments: [],
        hasUnviewed: false,
      }
    }
    groupedStories[story.userId].segments.push(story)
    if (!hasViewedStory(story.id)) {
      groupedStories[story.userId].hasUnviewed = true
    }
  })

  const stories = Object.values(groupedStories)

  // Sort: User's own stories first, then unviewed, then viewed
  const sortedStories = stories.sort((a, b) => {
    if (a.userId === currentUserId) return -1
    if (b.userId === currentUserId) return 1
    if (a.hasUnviewed && !b.hasUnviewed) return -1
    if (!a.hasUnviewed && b.hasUnviewed) return 1
    return 0
  })

  // Always show if there's a create button, even if no stories
  if (sortedStories.length === 0 && !showCreateButton) {
    return null
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scrollView}
      >
        {showCreateButton && (
          <TouchableOpacity
            style={styles.createStoryItem}
            activeOpacity={0.8}
            onPress={onCreateStory}
          >
            <View style={styles.createStoryCircle}>
              <View style={styles.createStoryInner}>
                <Ionicons name="add" size={hp(3.5)} color={theme.colors.bondedPurple} />
              </View>
            </View>
            <Text style={styles.createStoryLabel} numberOfLines={1}>
              Your Story
            </Text>
          </TouchableOpacity>
        )}

        {sortedStories.length > 0 &&
          sortedStories.map((story) => (
            <StoryCircle
              key={story.id}
              story={story}
              onPress={() => onViewStory(story)}
              isOwn={story.userId === currentUserId}
            />
          ))}
      </ScrollView>
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    width: '100%',
    paddingVertical: hp(1),
  },
  scrollView: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  createStoryItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
  createStoryCircle: {
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.background,
    borderWidth: 3,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.7),
  },
  createStoryInner: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createStoryLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    maxWidth: wp(18),
    textAlign: 'center',
  },
})
